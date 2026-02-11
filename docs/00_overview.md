# 00_overview – 全体概要

このドキュメントは、React 製シリアル波形表示ツールの **全体像** をまとめたものです。  
詳細な仕組みは、トピック別ドキュメント（01〜05）を参照してください。

- Web Serial API で **COM ポート**と通信し、受信したデータをパースして **4ch の波形**として表示します。
- 1 ページの **SPA**（Single Page Application）であり、状態管理は React の `useState` ベースのシンプルな構成です。

---

## 1. 技術スタックと構成

- **フレームワーク**: React + TypeScript + Vite
- **グラフ描画**: [uPlot](https://github.com/leeoniya/uPlot)
- **シリアル通信**: Web Serial API（対応ブラウザ: **Chrome / Edge**）
- **ルーティング**: React Router（現状はシングルページで利用は最小限）

主要なソースコードは以下のファイルに分かれています。

- `src/main.tsx` … React アプリのエントリポイント（`BrowserRouter` + `App` のマウント）
- `src/App.tsx` … アプリ全体の状態（接続・エラー・最後に受信したパケット・チャンネル表示 ON/OFF）を保持し、UI を構成
- `src/components/SerialControl.tsx` … シリアル通信 UI と Web Serial API 呼び出し
- `src/components/WaveformChart.tsx` … uPlot を使った 4ch 波形表示
- `src/lib/serial/serialService.ts` … Web Serial API のラッパー（ポート取得・接続・読み取りループ）
- `src/lib/packet/types.ts` / `parser.ts` … パケットの型定義と 16byte → 4ch へのパーサー
- `src/lib/config/channelConfig.ts` … チャンネルごとのラベル・線色設定
- `src/index.css` … シリアル UI まわりのスタイル

---

## 2. アプリ全体のデータフロー

受信データが画面に表示されるまでの大まかな流れは次の通りです。

```mermaid
flowchart LR
  subgraph ui [UI]
    SerialControl[SerialControl]
    WaveformChart[WaveformChart]
  end
  subgraph serial [Serial]
    WebSerial[WebSerialAPI]
  end
  subgraph data [Data]
    Parser[PacketParser]
    Buffer[20points x 4ch]
  end

  SerialControl -->|onPacket| App[App lastPacket]
  WebSerial -->|bytes| Parser
  Parser -->|ch0-ch3| App
  App -->|lastPacket| WaveformChart
  WaveformChart -->|append & shift| Buffer
  Buffer -->|x:0..19,y:ch0[]| uPlot0[uPlot ch0]
  Buffer -->|x:0..19,y:ch1[]| uPlot1[uPlot ch1]
  Buffer -->|x:0..19,y:ch2[]| uPlot2[uPlot ch2]
  Buffer -->|x:0..19,y:ch3[]| uPlot3[uPlot ch3]
```

### 各レイヤの役割

- **SerialControl**  
  - ユーザー操作（Refresh / Add port / ポート選択 / Baudrate 選択 / Connect / Disconnect）を受け付ける
  - `serialService` を呼び出し、ポートの取得・接続・切断・読み取り開始を行う
  - 受信したパケットは `onPacket(PacketData)` 経由で `App` に渡す

- **serialService**（`src/lib/serial/serialService.ts`）  
  - Web Serial API (`navigator.serial`) の薄いラッパー
  - `startReadLoop` で読み取りループを走らせ、16byte ごとに `parsePacket` を呼び出す

- **PacketParser**（`src/lib/packet/parser.ts`）  
  - 16byte の `ArrayBuffer` を 4ch（`ch0`〜`ch3`）の `PacketData` に変換する

- **App**（`src/App.tsx`）  
  - `connected`, `serialError`, `lastPacket`, `channelVisible` を保持
  - `SerialControl` からのコールバックを受け取り、状態を更新する
  - `WaveformChart` に `packet={lastPacket}` と `channelVisible` を渡す

- **WaveformChart + uPlot**  
  - 4ch それぞれに 1 つずつ uPlot インスタンスを持つ
  - 各 ch ごとに最新 20 点分のバッファを保持し、`packet` 受信時に FIFO（先入れ先出し）で更新

詳細な挙動は下記のドキュメントを参照してください。

- Web Serial 周り: `01_web_serial_api.md`
- グラフ表示・uPlot: `02_uplot.md`
- パケットフォーマット: `03_packet.md`

---

## 3. 画面・UI 構成の概要

### 3.1 シリアル通信エリア

`SerialControl` コンポーネントが担当し、`src/components/SerialControl.tsx` に実装されています。

- 左から順に  
  **Refresh** / **Add port** / **COMポート一覧** / **Baudrate** / **Connect / Disconnect** / **Start / Stop** / **ch0〜ch3 トグル**
- **Refresh** … 既に許可されたポート一覧を `getPorts()` で再取得
- **Add port** … `requestPort()` でポート選択ダイアログを表示し、許可されたポートを一覧に追加
- **COMポート一覧** … `SerialPort` の配列から選択（`getInfo()` により USB ベンダー/プロダクト ID をラベルに利用）
- **Baudrate** … 9600〜115200 の候補から選択
- **Connect / Disconnect** … 指定ポート・ボーレートで `open()` / `close()` を呼び出し、読み取りループを開始・終了
- **Start / Stop** … 拡張用ボタン（現時点では UI のみ）
- **エラー・状態表示** … エラーや「接続中」はシリアルエリア内にインラインで表示

より詳細な説明は `01_web_serial_api.md` を参照してください。

### 3.2 グラフエリア

`WaveformChart` コンポーネントが担当し、`src/components/WaveformChart.tsx` に実装されています。

- ch0〜ch3 用に **4 つの独立したグラフ** を縦に並べて表示
- 横軸: `"point"`（0〜19 の 20 点）、新しい点が入るたびに右側に追加し、古い点を削除
- 縦軸: `"count"`（0〜2^32）、オートスケールの ON/OFF が可能
- 各 ch のラベル・線色は `CHANNEL_CONFIG`（`src/lib/config/channelConfig.ts`）で定義
- ch ごとの表示 ON/OFF は `SerialControl` 側のボタン（`channelVisible`）で制御

uPlot に特化した解説は `02_uplot.md` を参照してください。

---

## 4. ファイル配置の概要

プロジェクト直下:

- `package.json` … 依存関係とスクリプト
- `vite.config.ts` … Vite 設定
- `docs/` … 本ドキュメント群

ソースコード:

- `src/`
  - `main.tsx` … エントリポイント
  - `App.tsx` … 画面全体のコンテナ
  - `index.css` … 共通スタイルおよびシリアル UI スタイル
  - `components/`
    - `SerialControl.tsx`
    - `WaveformChart.tsx`
  - `lib/`
    - `serial/serialService.ts`
    - `packet/types.ts`
    - `packet/parser.ts`
    - `config/channelConfig.ts`

---

## 5. デプロイと制約

- デプロイ先は GitHub Pages を想定しており、`main` ブランチへの push で Actions によるビルド＆デプロイが行われます。
- Web Serial API は **HTTPS** かつ対応ブラウザ（Chrome / Edge）でのみ利用可能です。
- そのため、GitHub Pages 上でもブラウザは **Chrome または Edge** を使用する必要があります。

デプロイ手順や Pages 設定の詳細は `README.md` を参照してください。

