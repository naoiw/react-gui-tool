# 02_recharts – 波形グラフ表示と WaveformChart

このドキュメントでは、Recharts を用いた **4ch 波形表示** の実装と、  
`WaveformChart` コンポーネントの内部構造について説明します。

---

## 1. WaveformChart の責務

実装ファイル: `src/components/WaveformChart.tsx`

WaveformChart は次の責務を持ちます。

- Recharts を使って **ch0〜ch3 の 4 つの独立した波形グラフ** を縦に並べて表示する
- 各チャンネルについて **最新 20 点分のバッファ** を保持し、右スクロールするように表示する
- **縦軸オートスケール**の ON/OFF をチェックボックスで切り替える
- `CHANNEL_CONFIG`（`src/lib/config/channelConfig.ts`）からラベル・線色を取得して適用する
- `channelVisible` の値に応じて、各 ch グラフの表示/非表示を切り替える

プロパティ定義は以下の通りです。

```ts
export interface WaveformChartProps {
  /** 直近受信パケット（null の場合は更新しない） */
  packet: PacketData | null;
  /** ch0～ch3 の表示 ON/OFF（未指定時は全て表示） */
  channelVisible?: boolean[];
}
```

`App` からは `packet={lastPacket}` として渡され、`packet` が更新されるたびにバッファが更新されます。

---

## 2. バッファ管理とデータ構造

### 2.1 定数と基本構造

```ts
/** 横軸の点数 */
const POINTS = 20;
/** 縦軸最大（32bit unsigned） */
const Y_MAX = 2 ** 32;
```

- 横軸は常に `POINTS = 20` 点分を表示します。
- 縦軸の最大値は 32bit unsigned の最大値として `2 ** 32` を上限にしています。

チャートごとのデータバッファは次のように保持されます。

```ts
const buffersRef = useRef<number[][]>([
  [],
  [],
  [],
  [],
]);
```

- `buffersRef` … 各チャンネルの最新データ列（最大 20 点）を保持する ref。パケット受信時に `push` / `shift` で更新し、再描画用に `setDataVersion` で再レンダーをトリガーする。

### 2.2 描画用データの生成

```ts
interface ChartDatum {
  point: number;
  value: number | null;
}

function buildChartData(buffer: number[]): ChartDatum[] {
  const data: ChartDatum[] = [];
  for (let i = 0; i < POINTS; i++) {
    data.push({
      point: i,
      value: i < buffer.length ? buffer[i]! : null,
    });
  }
  return data;
}
```

- 内部データの x 値（`point`）は `0..19`（昇順）を使用します。
- 実際の表示ラベルでは「20〜1」に変換され、右から左に流れるような見た目になります（XAxis の `tickFormatter` で指定）。

### 2.3 パケット受信時のバッファ更新

`packet` が変化したときの `useEffect` でバッファ更新と再描画トリガーを行っています。

```ts
useEffect(() => {
  if (packet == null) return;
  const buffers = buffersRef.current;
  buffers[0]!.push(packet.ch0);
  buffers[1]!.push(packet.ch1);
  buffers[2]!.push(packet.ch2);
  buffers[3]!.push(packet.ch3);
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const b = buffers[ch]!;
    if (b.length > POINTS) b.shift();
  }
  setDataVersion((v) => v + 1);
}, [packet]);
```

- 新しいパケットごとに各チャンネルの数値を対応する配列に `push` します。
- `POINTS` を超えた場合は `shift()` で先頭を削除し、常に最新 20 点分だけ保持します。
- `setDataVersion` によりコンポーネントが再レンダーし、`buildChartData(buffersRef.current[ch])` で Recharts に渡すデータが更新されます。バッファ長が 20 未満の場合は足りない分を `null` にし、`Line` の `connectNulls` で線を継続表示します。

---

## 3. Recharts の構成と軸設定

各チャンネルは 1 つの `LineChart` で描画します。

- **LineChart** … `data={chartData}`（`buildChartData(buffer)` の戻り値）
- **XAxis** … `dataKey="point"`, `type="number"`, `domain={[0, POINTS - 1]}`, `tickFormatter={(v) => String(POINTS - Math.round(Number(v)))}` で「20～1」表示
- **YAxis** … `domain={[yMin, yMax]}`。`yMin` / `yMax` は `computeYDomain(buffer, autoScale)` で算出（後述）
- **Line** … `dataKey="value"`, `stroke={CHANNEL_CONFIG[ch].color}`, `dot={false}`, `connectNulls`, `isAnimationActive={false}`

`CHANNEL_CONFIG` の詳細は `05_config_and_styles.md` を参照してください。

### 3.1 オートスケールの仕組み

縦軸の domain は `computeYDomain(buffer, autoScale)` で計算します。

```ts
function computeYDomain(buffer: number[], autoScale: boolean): [number, number] {
  if (!autoScale || buffer.length === 0) return [0, Y_MAX];
  let min = buffer[0]!;
  let max = buffer[0]!;
  for (let i = 1; i < buffer.length; i++) {
    const v = buffer[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const pad = (max - min) * 0.05 || 1;
  return [
    Math.max(0, min - pad),
    Math.min(Y_MAX, max + pad),
  ];
}
```

- バッファ内データの最小値・最大値を走査で求め、5% のマージン（`pad`）を上下に追加します。
- レンジは `0〜Y_MAX` にクリップします。
- オートスケール OFF またはバッファが空の場合は `[0, Y_MAX]` を返します。

Recharts は宣言的なため、`autoScale` や `buffer` が変わると再レンダー時に `domain` が更新され、そのまま反映されます。

---

## 4. チャンネル表示 ON/OFF

`WaveformChart` の表示制御は `channelVisible` プロパティ（`boolean[]`）により行われます。  
デフォルトでは `DEFAULT_CHANNEL_VISIBLE = [true, true, true, true]` です。

- `channelVisible[ch]` が `false` の場合、その ch のブロック（チャートを含む `div`）を `display: 'none'` にします。
- `SerialControl` 側の ch トグルボタンと連携することで、「特定の ch だけ表示/非表示」を簡単に切り替えられます。

---

## 5. 関連ドキュメント

- Web Serial API と受信処理の詳細: `01_web_serial_api.md`
- パケットフォーマットと `PacketData`: `03_packet.md`
- チャンネル設定と色・ラベル: `05_config_and_styles.md`
- コンポーネント全体の責務: `04_components.md`
