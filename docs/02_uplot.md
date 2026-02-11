# 02_uplot – 波形グラフ表示と WaveformChart

このドキュメントでは、uPlot を用いた **4ch 波形表示** の実装と、  
`WaveformChart` コンポーネントの内部構造について説明します。

---

## 1. WaveformChart の責務

実装ファイル: `src/components/WaveformChart.tsx`

WaveformChart は次の責務を持ちます。

- uPlot を使って **ch0〜ch3 の 4 つの独立した波形グラフ** を縦に並べて表示する
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
const plotRefs = useRef<(uPlot | null)[]>([null, null, null, null]);
const buffersRef = useRef<number[][]>([
  [],
  [],
  [],
  [],
]);
```

- `plotRefs` … 各チャンネルに対応する uPlot インスタンスへの参照
- `buffersRef` … 各チャンネルの最新データ列（最大 20 点）を保持する配列

### 2.2 横軸データの生成

```ts
function buildX(): number[] {
  const x: number[] = [];
  for (let i = 0; i < POINTS; i++) x.push(i);
  return x;
}
```

- 内部データの x 値は `0..19`（昇順）を使用します。
- 実際の表示ラベルでは「20〜1」に変換され、右から左に流れるような見た目になります（後述）。

### 2.3 パケット受信時のバッファ更新

`packet` が変化したときの `useEffect` でバッファ更新と uPlot への反映を行っています。

```ts
useEffect(() => {
  if (packet == null) return;
  const buffers = buffersRef.current;
  const b0 = buffers[0]!;
  const b1 = buffers[1]!;
  const b2 = buffers[2]!;
  const b3 = buffers[3]!;
  b0.push(packet.ch0);
  b1.push(packet.ch1);
  b2.push(packet.ch2);
  b3.push(packet.ch3);
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const b = buffers[ch]!;
    if (b.length > POINTS) b.shift();
  }

  const x = buildX();
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const u = plotRefs.current[ch];
    if (!u) continue;
    const b = buffers[ch]!;
    const y: (number | null)[] = [];
    for (let i = 0; i < POINTS; i++) {
      y.push(i < b.length ? b[i]! : null);
    }
    u.setData([x, y], false);
    /* autoScale 時の縦軸更新は後述 */
  }
}, [packet, autoScale]);
```

- 新しいパケットごとに各チャンネルの数値を対応する配列に `push` します。
- `POINTS` を超えた場合は `shift()` で先頭を削除し、常に最新 20 点分だけ保持します。
- uPlot には `[x, y]` を渡していますが、バッファ長が 20 未満の場合は足りない分を `null` で埋めて「未定義データ」として扱います。

---

## 3. uPlot オプションとスケール設定

uPlot のオプションは `makeChartOptions` で構築されます。

```ts
function makeChartOptions(
  channelIndex: number,
  autoScale: boolean,
  width: number,
  height: number
): uPlot.Options {
  const cfg = CHANNEL_CONFIG[channelIndex] ?? { label: `ch${channelIndex}`, color: '#888' };
  return {
    width,
    height,
    title: cfg.label,
    series: [
      { label: 'point' },
      {
        label: cfg.label,
        stroke: cfg.color,
        scale: 'y',
      },
    ],
    scales: {
      x: {
        range: [0, POINTS - 1],
        min: 0,
        max: POINTS - 1,
      },
      y: {
        min: 0,
        max: Y_MAX,
        ...(autoScale ? { auto: true } : { range: [0, Y_MAX] }),
      },
    },
    axes: [
      {
        scale: 'x',
        label: 'point',
        side: 2,
        size: 55,
        labelSize: 20,
        labelGap: -20,
        values: (_, splits) => splits.map((v) => String(POINTS - Math.round(v))),
      },
      {
        scale: 'y',
        label: 'count',
        side: 3,
        size: 100,
        gap: 8,
        labelSize: 20,
        labelGap: 0,
      },
    ],
    legend: { show: false },
  };
}
```

### 3.1 シリーズとチャンネル設定

- `series[0]` … x 軸（ラベル `"point"`）
- `series[1]` … y 軸データ
  - `label` と `stroke` は `CHANNEL_CONFIG[channelIndex]` から取得
  - `scale: 'y'` で縦軸にバインド

`CHANNEL_CONFIG` の詳細は `05_config_and_styles.md` を参照してください。

### 3.2 軸とラベル

- x 軸
  - `range: [0, POINTS - 1]` / `min` / `max` で固定範囲
  - `label: 'point'`
  - `values` 関数で `POINTS - v` を返し、「右から左へ流れている」ような値表示にしています。
- y 軸
  - `label: 'count'`
  - `min: 0`（0 未満にはならない）
  - `max` は **固定** または **オートスケール**のどちらか

### 3.3 オートスケールの仕組み

`autoScale` ステートが `true` のとき、次の 2 つのタイミングで縦軸を更新します。

1. `autoScale` が ON/OFF されたとき
2. 新しいパケットを受信したとき

```ts
useEffect(() => {
  const buffers = buffersRef.current;
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const u = plotRefs.current[ch];
    if (!u) continue;
    const arr = buffers[ch];
    if (!arr) continue;
    if (autoScale && arr.length > 0) {
      let min = arr[0]!;
      let max = arr[0]!;
      for (let i = 1; i < arr.length; i++) {
        const v = arr[i]!;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const pad = (max - min) * 0.05 || 1;
      u.setScale('y', { min: Math.max(0, min - pad), max: Math.min(Y_MAX, max + pad) });
    } else {
      u.setScale('y', { min: 0, max: Y_MAX });
    }
  }
}, [autoScale]);
```

- バッファ内データの最小値 `min` と最大値 `max` を走査で求めます。
- 全体レンジに対して 5% のマージン（`pad`）を上下に追加し、グラフが上下にピッタリ張り付かないようにしています。
- レンジは `0〜Y_MAX` の範囲にクリップしています。
- オートスケール OFF の場合は `min: 0, max: Y_MAX` の固定レンジに戻します。

---

## 4. uPlot インスタンスのライフサイクル

uPlot のインスタンス生成と破棄は `useEffect` で行われます。

```ts
useEffect(() => {
  const containers = containerRefs.current;
  const plots: uPlot[] = [];
  for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
    const el = containers[ch];
    if (!el) continue;
    const opts = makeChartOptions(ch, autoScale, width, chartHeight);
    const x = buildX();
    const y = new Array<number | null>(POINTS).fill(null);
    const u = new uPlot(opts, [x, y], el);
    plotRefs.current[ch] = u;
    plots.push(u);
  }
  return () => {
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      plotRefs.current[ch]?.destroy();
      plotRefs.current[ch] = null;
    }
  };
}, []);
```

- マウント時に各 ch 用の `div` コンテナ（`containerRefs`）を走査し、存在するものに対して uPlot インスタンスを作成します。
- 初期データは `[x: 0..19, y: すべて null]` で、まだデータが無い状態を表現します。
- アンマウント時には `destroy()` を呼んでクリーンアップします。

`useEffect` の依存配列は空 `[]` のため、初回マウント時の一度だけ実行されます。  
オートスケール ON/OFF に応じた縦軸変更は `setScale` で行い、オプションの再生成は不要です。

---

## 5. チャンネル表示 ON/OFF

`WaveformChart` の表示制御は `channelVisible` プロパティ（`boolean[]`）により行われます。  
デフォルトでは `DEFAULT_CHANNEL_VISIBLE = [true, true, true, true]` です。

```ts
{[0, 1, 2, 3].map((ch) => (
  <div
    key={ch}
    ref={(el) => {
      if (containerRefs.current) containerRefs.current[ch] = el;
    }}
    data-channel={ch}
    style={{
      display: channelVisible[ch] !== false ? undefined : 'none',
      width,
      height: chartHeight + 8,
      border: '1px solid #999',
      boxSizing: 'border-box',
      overflow: 'visible',
    }}
  />
))}
```

- `channelVisible[ch]` が `false` の場合、その ch の `div` 自体を `display: 'none'` にします。
- `SerialControl` 側の ch トグルボタンと連携することで、「特定の ch だけ表示/非表示」を簡単に切り替えられます。

---

## 6. 関連ドキュメント

- Web Serial API と受信処理の詳細: `01_web_serial_api.md`
- パケットフォーマットと `PacketData`: `03_packet.md`
- チャンネル設定と色・ラベル: `05_config_and_styles.md`
- コンポーネント全体の責務: `04_components.md`

