# 05_config_and_styles – チャンネル設定とスタイル

このドキュメントでは、波形表示に関する **チャンネル設定** と、  
シリアル通信 UI まわりで使用している **CSS クラス** について説明します。

---

## 1. チャンネル設定 – channelConfig.ts

実装ファイル: `src/lib/config/channelConfig.ts`

```ts
/**
 * 波形グラフ用チャンネル設定（系統名・線色）。
 * ビルド時に取り込み、WaveformChart で使用する。
 */

export interface ChannelConfig {
  /** 系統名（凡例・タイトル表示用） */
  label: string;
  /** 線の色（CSS 色指定、例: "#1f77b4"） */
  color: string;
}

/** ch0～ch3 のデフォルト設定。コンフィグで上書き可能。 */
export const CHANNEL_CONFIG: ChannelConfig[] = [
  { label: 'ch0', color: '#1f77b4' },
  { label: 'ch1', color: '#ff7f0e' },
  { label: 'ch2', color: '#2ca02c' },
  { label: 'ch3', color: '#d62728' },
];
```

### 1.1 用途

- `WaveformChart` でチャンネルごとの **タイトル** と **線色** を決定するために使用されます。
- 該当コード（`WaveformChart.tsx`）:

```ts
const cfg = CHANNEL_CONFIG[channelIndex] ?? { label: `ch${channelIndex}`, color: '#888' };
```

- `CHANNEL_CONFIG` に設定が存在しないチャンネルについては、フォールバックとして `"ch{index}"` / `#888` が使われます。

### 1.2 設定の変更方法

- 系統名を変更したい場合: `label` を任意の文字列に変更する
  - 例: `{ label: 'AIN0', color: '#1f77b4' }`
- 線色を変更したい場合: `color` を任意の CSS カラー文字列に変更する
  - 例: `{ label: 'ch0', color: 'rgb(255, 0, 0)' }`

**ビルド時に TypeScript から直接 import されるため、JSON ではなく TypeScript ファイルとして定義されています。**

---

## 2. 共通スタイル – index.css

実装ファイル: `src/index.css`

トップレベルでは、以下のようにフォントや背景色などのベーススタイルを定義しています。

```css
:root {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  color: #213547;
  background-color: #fff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
```

これにより、特別なリセット CSS を導入せずとも、最低限の見た目とレイアウトが整うようになっています。

---

## 3. シリアル通信 UI のスタイル

`SerialControl` コンポーネントでは、以下のクラス名を利用してレイアウトや見た目を整えています。

### 3.1 行レイアウト – .serial-control__row

```css
.serial-control__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.serial-control__row + .serial-control__row {
  margin-top: 0.5rem;
}
```

- ボタンやセレクトボックスを **1 行に並べつつ、折り返し** にも対応するためのレイアウトです。
- 1 行目と 2 行目の間には少しマージンが付きます。

### 3.2 ボタンのスタイル

```css
.serial-control .serial-control__row button {
  min-height: 42px;
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
}

.serial-control .serial-control__row button:disabled {
  cursor: not-allowed;
}
```

- クリック領域を広めに取り、マウス操作しやすくしています。
- disabled 状態では `not-allowed` カーソルを表示し、操作できないことを視覚的に示します。

### 3.3 チャンネルトグル – .channel-toggle--on / .serial-control__channel-toggles

```css
.serial-control .serial-control__row button.channel-toggle--on {
  background-color: #e0e8f0;
  border: 1px solid #6b8cae;
}

.serial-control__channel-toggles {
  margin-left: auto;
  padding-left: 1.5rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
```

- `channel-toggle--on` は、選択中の ch ボタンに付与され、「ON になっているチャンネル」を視覚的に強調します。
- `.serial-control__channel-toggles` は、2 行目右端に ch0〜ch3 ボタンを寄せるためのラッパーです。

### 3.4 ラベルとセレクトボックス

```css
.serial-control__label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1rem;
}

.serial-control .serial-control__row select {
  min-height: 42px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.serial-control__port-select {
  min-width: 12rem;
}
```

- ラベルとセレクトボックスを横並びにしつつ、一定の余白を設けて読みやすくしています。
- COM ポート一覧は `min-width: 12rem` を指定し、ラベルが長くなってもレイアウトが崩れにくいようにしています。

### 3.5 ポート・Baudrate グループ

```css
.serial-control__port-group {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}
```

- COM ポートと Baudrate のセレクトを右寄せでまとめるためのラッパーです。
- 画面幅が狭い場合は折り返しつつ、要素間の余白を維持します。

---

## 4. 拡張のヒント

- チャンネル数を増やしたい場合は、まず `CHANNEL_COUNT` や `CHANNEL_CONFIG` を拡張し、  
  それに合わせて `WaveformChart` のループと `SerialControl` のトグルボタン数を増やすのが基本的な流れです。
- テーマカラーやダークモード対応を行う場合は、`:root` のカラートークン（`color`, `background-color`）や  
  `.serial-control` 周りのボーダー色等を CSS 変数経由で制御すると保守しやすくなります。

---

## 5. 関連ドキュメント

- グラフ描画の詳細: `02_uplot.md`
- コンポーネント構造: `04_components.md`

