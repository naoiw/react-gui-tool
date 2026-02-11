# 03_packet – パケットフォーマットとパーサー

このドキュメントでは、シリアル通信でやり取りする **パケットフォーマット** と、  
それを解釈するパーサー（`parsePacket`）の仕様を説明します。

---

## 1. パケットフォーマットの概要

実装されているフォーマットは、`docs/architecture.md` の設計に対応しています。

- 1 パケットのサイズ: **16 byte**
- チャンネル数: **4 ch（ch0〜ch3）**
- 各チャンネル: **32bit unsigned**（4 byte）、**リトルエンディアン**

バイト配置は以下の通りです。

| オフセット | サイズ | 内容 |
|-----------|--------|------|
| 0         | 4      | ch0  |
| 4         | 4      | ch1  |
| 8         | 4      | ch2  |
| 12        | 4      | ch3  |

---

## 2. 定数と型定義 – types.ts

実装ファイル: `src/lib/packet/types.ts`

```ts
/** 1 パケットのバイト数 */
export const PACKET_SIZE = 16;

/** チャンネル数（ch0〜ch3） */
export const CHANNEL_COUNT = 4;

/** 1 チャンネルあたりのバイト数（32bit = 4byte） */
export const BYTES_PER_CHANNEL = 4;

/** パース済みパケットデータ（各チャンネルは 32bit unsigned、リトルエンディアン） */
export interface PacketData {
  ch0: number;
  ch1: number;
  ch2: number;
  ch3: number;
}
```

これらの定数を利用することで、フォーマット変更時（チャンネル数増加や型変更）の影響範囲を局所化しています。

### 2.1 PacketData の意味

- `ch0`〜`ch3` はいずれも 0〜2^32 の範囲の値を取り得る `number` 型です。
- JavaScript の `number` は 53bit 精度の倍精度浮動小数点数のため、32bit unsigned を安全に表現できます。
- グラフ描画（`WaveformChart`）では縦軸 `"count"` としてこの値をそのまま使用しています。

---

## 3. パーサー – parsePacket

実装ファイル: `src/lib/packet/parser.ts`

```ts
/**
 * 16byte バイト列を ch0〜ch3（各 32bit unsigned、リトルエンディアン）にパースする。
 */
import { PACKET_SIZE, BYTES_PER_CHANNEL, type PacketData } from './types';

/**
 * ArrayBuffer の指定オフセットから 16byte をパースして PacketData を返す。
 * @param buffer - 元の ArrayBuffer
 * @param offset - 読み取り開始オフセット（省略時は 0）
 * @returns パース結果。buffer が 16byte に満たない場合は throw
 */
export function parsePacket(buffer: ArrayBuffer, offset = 0): PacketData {
  if (buffer.byteLength < offset + PACKET_SIZE) {
    throw new RangeError(
      `parsePacket: buffer が ${PACKET_SIZE} byte に満ちません（offset=${offset}, length=${buffer.byteLength}）`
    );
  }
  const view = new DataView(buffer, offset, PACKET_SIZE);
  return {
    ch0: view.getUint32(0, true),
    ch1: view.getUint32(BYTES_PER_CHANNEL, true),
    ch2: view.getUint32(BYTES_PER_CHANNEL * 2, true),
    ch3: view.getUint32(BYTES_PER_CHANNEL * 3, true),
  };
}
```

### 3.1 バリデーション

```ts
if (buffer.byteLength < offset + PACKET_SIZE) {
  throw new RangeError(
    `parsePacket: buffer が ${PACKET_SIZE} byte に満ちません（offset=${offset}, length=${buffer.byteLength}）`
  );
}
```

- 読み取り開始オフセットから 16byte 分確保できない場合は `RangeError` を投げます。
- 読み取り処理は `serialService.startReadLoop` 側で「16byte 揃ったときだけ `parsePacket` を呼ぶ」ようにしているため、通常はここには到達しません（防御的コード）。

### 3.2 DataView による読み取り

```ts
const view = new DataView(buffer, offset, PACKET_SIZE);
return {
  ch0: view.getUint32(0, true),
  ch1: view.getUint32(BYTES_PER_CHANNEL, true),
  ch2: view.getUint32(BYTES_PER_CHANNEL * 2, true),
  ch3: view.getUint32(BYTES_PER_CHANNEL * 3, true),
};
```

- `DataView` を使うことで、エンディアンを指定して任意オフセットから整数を読み取ることができます。
- 第 2 引数の `true` は「リトルエンディアン」を意味し、設計ドキュメントの仕様と一致しています。

---

## 4. シリアル読み取りループとの連携

`serialService.startReadLoop` は、読み取りストリームから届くバイト列を内部バッファに蓄積し、  
`PACKET_SIZE` 分たまるたびに `parsePacket` を呼び出します。

```ts
const buffer: number[] = [];

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  if (value) {
    buffer.push(...value);
    while (buffer.length >= PACKET_SIZE) {
      const slice = buffer.splice(0, PACKET_SIZE);
      const ab = new ArrayBuffer(PACKET_SIZE);
      new Uint8Array(ab).set(slice);
      try {
        const data = parsePacket(ab);
        onPacket(data);
      } catch (e) {
        onError?.(e);
      }
    }
  }
}
```

ポイント:

- 受信バイト列は `number[]` のバッファ `buffer` に連結していきます。
- `buffer.length >= PACKET_SIZE` のあいだは、常に **先頭 16byte を 1 パケットとして処理** します。
- `parsePacket` でパースし、`onPacket` コールバック経由で UI（`App` → `WaveformChart`）へ渡します。
- `parsePacket` が例外を投げた場合は `onError` コールバックが呼ばれます。

---

## 5. 拡張の考え方

将来、パケットフォーマットを拡張・変更したい場合は、以下の方針で変更することを想定しています。

1. `CHANNEL_COUNT` や `BYTES_PER_CHANNEL` の値を変更する
2. 必要であれば `PacketData` インターフェースを拡張する（例: `ch4`, `flags`, `timestamp` など）
3. `parsePacket` の `getUint32` 呼び出し位置やメソッド（`getUint16`, `getInt32` 等）を変更する
4. `WaveformChart` 側の `CHANNEL_COUNT` 依存ループを新しいチャンネル数に対応させる

このように、**フォーマットの中身は `packet/` 配下に閉じ込める**ように設計されているため、  
グラフ表示やシリアル I/O のコードへの影響を最小限にできます。

---

## 6. 関連ドキュメント

- Web Serial API と読み取りループ: `01_web_serial_api.md`
- uPlot と波形表示: `02_uplot.md`
- コンポーネント全体の構造: `04_components.md`

