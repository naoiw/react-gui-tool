# 04_components – コンポーネント構成と責務

このドキュメントでは、主要な React コンポーネントの **責務とデータの受け渡し** を整理します。

- `App`
- `SerialControl`
- `WaveformChart`

それぞれがどの役割を担当し、どの props / state を扱うかを確認することで、拡張時の方針決定を容易にします。

---

## 1. App – アプリ全体のコンテナ

実装ファイル: `src/App.tsx`

```ts
export default function App() {
  const [connected, setConnected] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [lastPacket, setLastPacket] = useState<PacketData | null>(null);
  const [channelVisible, setChannelVisible] = useState<boolean[]>([true, true, true, true]);

  const handleChannelVisibleChange = (index: number, visible: boolean) => {
    setChannelVisible((prev) => {
      const next = [...prev];
      next[index] = visible;
      return next;
    });
  };

  return (
    <main>
      {/* 状態表示と子コンポーネント */}
    </main>
  );
}
```

### 1.1 状態管理

- `connected: boolean`  
  - シリアルポートが接続中かどうか
  - `SerialControl` からの `onConnect` / `onDisconnect` で更新

- `serialError: string | null`  
  - シリアル関連のエラーメッセージ
  - `SerialControl` からの `onError` で更新し、画面上部で表示

- `lastPacket: PacketData | null`  
  - 直近に受信したパケット
  - `SerialControl` からの `onPacket` で更新し、`WaveformChart` に渡す

- `channelVisible: boolean[]`  
  - ch0〜ch3 の各グラフを表示するかどうか
  - `SerialControl` でトグルボタンを操作することで更新される

### 1.2 子コンポーネントへの props 受け渡し

```tsx
<SerialControl
  onConnect={() => setConnected(true)}
  onDisconnect={() => setConnected(false)}
  onPacket={setLastPacket}
  onError={setSerialError}
  channelVisible={channelVisible}
  onChannelVisibleChange={handleChannelVisibleChange}
/>
{serialError != null && (
  <p role="alert">{serialError}</p>
)}
<p>接続状態: {connected ? '接続中' : '未接続'}</p>
{lastPacket != null && (
  <p>最終受信値: ch0={lastPacket.ch0} ...</p>
)}

<WaveformChart packet={lastPacket} channelVisible={channelVisible} />
```

- `SerialControl`  
  - シリアル接続の UI とロジックを担当
  - 受信した `PacketData` を `onPacket` 経由で `App` に伝える
  - エラーや ch 表示トグルの状態を `App` に反映し、アプリ全体で共有

- `WaveformChart`  
  - `packet={lastPacket}` と `channelVisible` を元にグラフを描画
  - シリアルの接続状態やエラーには依存せず、「表示専用」の役割

---

## 2. SerialControl – シリアル通信 UI と制御

実装ファイル: `src/components/SerialControl.tsx`

```ts
export interface SerialControlProps {
  onConnect: () => void;
  onDisconnect: () => void;
  onPacket: (data: PacketData) => void;
  onError: (message: string | null) => void;
  /** ch0～ch3 の波形表示 ON/OFF（渡すと 3 行目にトグルを表示） */
  channelVisible?: boolean[];
  onChannelVisibleChange?: (index: number, visible: boolean) => void;
}
```

### 2.1 主な責務

- Web Serial API の有無チェック（`isSerialSupported`）
- ポート一覧の取得（`getPorts`）と「ポートを追加」（`requestPort`）
- 選択したポートとボーレートでの接続/切断（`open` / `close`）
- 受信データ読み取りループ（`startReadLoop`）の開始と停止
- シリアル関連エラーの表示、および `onError` 経由での親への通知
- ch0〜ch3 の波形表示 ON/OFF トグル UI

### 2.2 UI の構成

シリアルエリアは 2 行のレイアウトになっています。

1 行目:

- `Refresh` ボタン
- `Add port` ボタン
- `COMポート一覧` セレクトボックス
- `Baudrate` セレクトボックス

2 行目:

- `Connect` / `Disconnect` ボタン（状態に応じてトグル）
- `Start` / `Stop` ボタン（現時点では未実装で disabled）
- ch0〜ch3 のトグルボタン群（`channelVisible` が渡されている場合のみ表示）

エラーや「接続中」テキストは、このセクション内にインライン表示されます。

### 2.3 読み取りループと状態フラグ

- `currentPortRef` … 現在接続中の `SerialPort`
- `abortControllerRef` … 読み取りループ停止用
- `readLoopPromiseRef` … 読み取りループ完了待ち Promise
- `isDisconnectingRef` … ユーザーが「Disconnect」操作中かどうかを示すフラグ

これらのフラグにより、

- 「自然切断（ケーブル抜けなど）」と「ユーザー操作による切断」を区別
- `AbortError` を適切に握りつぶし、不要なエラーメッセージを避ける

などの制御を行っています。詳しいフローは `01_web_serial_api.md` を参照してください。

---

## 3. WaveformChart – グラフ描画コンポーネント

実装ファイル: `src/components/WaveformChart.tsx`

```ts
export interface WaveformChartProps {
  /** 直近受信パケット（null の場合は更新しない） */
  packet: PacketData | null;
  /** ch0～ch3 の表示 ON/OFF（未指定時は全て表示） */
  channelVisible?: boolean[];
}
```

### 3.1 主な責務

- ch0〜ch3 各 1 本の Recharts LineChart を縦に並べて表示する
- 各 ch について最新 20 点分のデータバッファを管理する
- 縦軸オートスケールの ON/OFF を UI で切り替え、Recharts の YAxis `domain` で反映する
- `CHANNEL_CONFIG` からラベルと線色を取得し、プロットに適用する
- `channelVisible` に応じて各 ch の `div` を非表示にする

### 3.2 App との関係

- `App` からは受信済みの `lastPacket` がそのまま `packet` として渡される
- `App` 側ではパケットの配列や履歴を持たず、**バッファ管理は WaveformChart 内部に閉じ込める**設計
- これにより、シリアル通信のロジックとグラフ描画のロジックが分離されます

Recharts の詳細やバッファ管理の実装は `02_recharts.md` を参照してください。

---

## 4. エントリポイント – main.tsx

実装ファイル: `src/main.tsx`

```ts
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- `BrowserRouter` をラップしていますが、現状ルーティングは使用しておらず、「将来的な画面追加に備えた構成」となっています。
- アプリケーションのロジックや状態はすべて `App` 以下に集約されています。

---

## 5. まとめ

- `App` は **状態のハブ** として動作し、シリアル接続状態・エラー・最新パケット・チャンネル表示状態を一元管理します。
- `SerialControl` は **シリアル通信 UI と制御** を担当し、`serialService` と協調して Web Serial API を扱います。
- `WaveformChart` は **表示専用コンポーネント** として、受信データの可視化に特化しています。

この分離により、

- シリアル通信部分の拡張（コマンド送信、Start/Stop の実装など）
- グラフ表示の拡張（チャンネル追加、統計情報表示など）

を比較的独立に進めることができる構造になっています。

