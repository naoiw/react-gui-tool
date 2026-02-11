# 01_web_serial_api – シリアル通信と Web Serial ラッパー

このドキュメントでは、Web Serial API を用いた **シリアル通信の実装** と、  
`SerialControl` コンポーネントから利用される `serialService` の役割を説明します。

---

## 1. Web Serial API の前提

実装ではブラウザ組み込みの Web Serial API（`navigator.serial`）を直接使用しています。

- 実装ファイル: `src/lib/serial/serialService.ts`
- 型定義: `@types/w3c-web-serial`
- 対応ブラウザ: **Chrome / Edge**（HTTPS または localhost）

`serialService.ts` では、`navigator.serial` への直接アクセスを隠蔽するために、まず次のヘルパー関数を定義しています。

```ts
function getSerial(): Serial | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & { serial?: Serial };
  return nav.serial;
}
```

これにより、SSR やテスト環境など `navigator` が存在しないケースも安全に扱うことができます。

---

## 2. serialService の API 一覧

`serialService.ts` が外部へ公開している主な関数は次のとおりです。

```ts
// Web Serial API が利用可能か
export function isSerialSupported(): boolean;

// 既に許可されたポート一覧を取得
export async function getPorts(): Promise<SerialPort[]>;

// ユーザーにポートを選択させる（許可されたポートを 1 つ返す）
export async function requestPort(): Promise<SerialPort>;

// ポートを指定ボーレートで開く
export async function open(port: SerialPort, baudRate: number): Promise<void>;

// ポートを閉じる
export async function close(port: SerialPort): Promise<void>;

// 読み取りループを開始し、PacketData 単位でコールバック
export async function startReadLoop(
  port: SerialPort,
  onPacket: (data: PacketData) => void,
  onError?: (err: unknown) => void,
  signal?: AbortSignal
): Promise<void>;
```

### 2.1 isSerialSupported

```ts
export function isSerialSupported(): boolean {
  return getSerial() !== undefined;
}
```

- `navigator.serial` が存在するかどうかをチェックし、対応ブラウザかどうかを判定します。
- UI（`SerialControl`）側では、この結果が `false` の場合に「Chrome または Edge で開いてください」というメッセージを表示します。

### 2.2 getPorts / requestPort

```ts
export async function getPorts(): Promise<SerialPort[]> {
  const serial = getSerial();
  if (!serial) {
    throw new Error('Web Serial API が利用できません。Chrome または Edge で開いてください。');
  }
  return serial.getPorts();
}

export async function requestPort(): Promise<SerialPort> {
  const serial = getSerial();
  if (!serial) {
    throw new Error('Web Serial API が利用できません。Chrome または Edge で開いてください。');
  }
  return serial.requestPort();
}
```

- `getPorts()`  
  - 既にユーザーが許可したポート一覧を取得します。
  - ポートの永続化はせず、ブラウザが覚えている許可済みポートのみを対象とします。

- `requestPort()`  
  - モーダルダイアログを表示してユーザーにポートを選択させ、新たに許可されたポートを返します。
  - ユーザーがキャンセルした場合は `NotFoundError` が発生し、UI 側で握りつぶしています。

### 2.3 open / close

```ts
export async function open(port: SerialPort, baudRate: number): Promise<void> {
  await port.open({ baudRate });
}

export async function close(port: SerialPort): Promise<void> {
  await port.close();
}
```

- 指定された `SerialPort` を所定のボーレートで開閉します。
- 低レベルなオプション（パリティ、ストップビットなど）は必要になった時点で拡張可能です。

### 2.4 startReadLoop – 読み取りループ

```ts
export async function startReadLoop(
  port: SerialPort,
  onPacket: (data: PacketData) => void,
  onError?: (err: unknown) => void,
  signal?: AbortSignal
): Promise<void> { /* ... */ }
```

主な動作は次の通りです。

1. `port.readable.getReader()` で `ReadableStreamDefaultReader<Uint8Array>` を取得
2. 読み取り用の内部バッファ `number[]` を用意
3. `while` ループで `reader.read()` し続ける
4. 受信した `Uint8Array` を内部バッファに push
5. バッファ長が `PACKET_SIZE`（=16byte）以上になるたびに先頭から 16byte を切り出し、`parsePacket` に渡す
6. パース結果（`PacketData`）を `onPacket` コールバックで UI 側に通知
7. `AbortSignal` が abort された場合は `reader.cancel()` してループを終了

内部で、パケットサイズやパース処理は `src/lib/packet/` の定義を利用しています（詳細は `03_packet.md` を参照）。

---

## 3. SerialControl から見た Web Serial 利用フロー

`SerialControl` コンポーネント（`src/components/SerialControl.tsx`）は、`serialService` を利用して UI を構成しています。

主な状態とハンドラは以下の通りです。

- 状態
  - `ports: SerialPort[]` … ポート一覧
  - `selectedIndex: number` … 選択中ポートのインデックス
  - `baudRate: number` … 選択中ボーレート
  - `connected: boolean` … 接続状態
  - `error: string | null` … シリアル関連のエラーメッセージ
  - `currentPortRef: Ref<SerialPort | null>` … 現在接続中のポート
  - `abortControllerRef: Ref<AbortController | null>` … 読み取りループ停止用
  - `readLoopPromiseRef: Ref<Promise<void> | null>` … 読み取りループの完了待ち

### 3.1 Refresh ボタン – ポート一覧の再取得

```ts
const handleRefresh = useCallback(async () => {
  clearError();
  if (!isSerialSupported()) {
    const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
    setError(msg);
    onError(msg);
    return;
  }
  try {
    const list = await getPorts();
    setPorts(list);
    if (selectedIndex >= list.length) {
      setSelectedIndex(list.length > 0 ? 0 : -1);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    onError(msg);
  }
}, [clearError, selectedIndex]);
```

- Web Serial 非対応時は明示的にエラーメッセージを出して処理を中断します。
- 正常時は `getPorts()` で取得したポート配列を `ports` に保存し、選択インデックスを自動調整します。

### 3.2 Add port ボタン – 新しいポートの追加

```ts
const handleAddPort = useCallback(async () => {
  clearError();
  if (!isSerialSupported()) {
    const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
    setError(msg);
    onError(msg);
    return;
  }
  try {
    const port = await requestPort();
    setPorts((prev) => [...prev, port]);
    setSelectedIndex((prev) => (prev < 0 ? 0 : prev + 1));
  } catch (e) {
    if ((e as Error).name === 'NotFoundError') return; // ユーザーがキャンセル
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    onError(msg);
  }
}, [clearError, onError]);
```

- `requestPort()` によりシステムダイアログを開き、許可されたポートを `ports` 配列に追加します。
- キャンセル時は `NotFoundError` を無視して UI エラーにしないようにしています。

### 3.3 Connect – 接続と読み取りループ開始

```ts
const handleConnect = useCallback(async () => {
  clearError();
  if (selectedIndex < 0 || selectedIndex >= ports.length) {
    const msg = 'ポートを選択してください。';
    setError(msg);
    onError(msg);
    return;
  }
  const port = ports[selectedIndex];
  if (!port) {
    return;
  }
  try {
    await open(port, baudRate);
    currentPortRef.current = port;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setConnected(true);
    onConnect();

    const readLoopPromise = startReadLoop(
      port,
      onPacket,
      (err) => {
        if (isDisconnectingRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError(msg);
      },
      controller.signal
    );
    readLoopPromiseRef.current = readLoopPromise;
    readLoopPromise.catch((err) => {
      if (isDisconnectingRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      onError(msg);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    onError(msg);
  }
}, [clearError, selectedIndex, ports, baudRate, onConnect, onPacket, onError]);
```

ポイント:

- ポート未選択時は早期にエラー表示して接続を行いません。
- 接続成功後に `AbortController` を生成し、その `signal` を `startReadLoop` に渡します。
- 読み取りループ中のエラーは `isDisconnectingRef.current` を見て「ユーザー発の切断かどうか」を判定し、自動切断エラーのみ UI に表示します。

### 3.4 Disconnect – 切断と読み取りループ終了

```ts
const handleDisconnect = useCallback(async () => {
  const port = currentPortRef.current;
  if (!port) return;
  isDisconnectingRef.current = true;
  const controller = abortControllerRef.current;
  const readLoopPromise = readLoopPromiseRef.current;
  try {
    if (controller) {
      controller.abort();
      abortControllerRef.current = null;
    }
    if (readLoopPromise) {
      await readLoopPromise;
      readLoopPromiseRef.current = null;
    }
    await close(port);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    onError(msg);
  } finally {
    currentPortRef.current = null;
    isDisconnectingRef.current = false;
    setConnected(false);
    onDisconnect();
  }
}, [onDisconnect, onError]);
```

- `AbortController.abort()` により `startReadLoop` 側の `reader.read()` を中断します。
- その後、読み取りループの Promise が解決するまで `await` し、最後に `close(port)` でポートを閉じます。
- 切断処理中に起きたエラーも UI 上に表示されますが、`isDisconnectingRef` により「切断操作に伴うエラー」としてハンドリングされます。

---

## 4. エラー表示と状態管理

`SerialControl` では内部エラー状態 `error` を持ちつつ、親コンポーネント（`App`）にも `onError` コールバックで同じメッセージを通知しています。

- 内部ではシリアルエリア直下にインライン表示
- 親側では `serialError` ステートとして保持し、`App` 全体の UI の一部として表示

状態の流れについては `00_overview.md` および `04_components.md` を参照してください。  
パケットフォーマットと `PacketData` の詳細は `03_packet.md` を確認してください。

