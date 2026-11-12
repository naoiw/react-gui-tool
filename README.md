# React GUI Tool

React / TypeScript 製のシリアル波形モニターです。Web Serial API で受信した4チャンネルの値を Recharts で表示します。

## 主な機能

- Chrome / Edge からのシリアルポート検出・追加・接続・切断
- ボーレートの選択（9,600〜115,200）
- 16byte・4ch・32bit unsigned・リトルエンディアンのパケット受信
- チャンネルごとに直近20点の波形表示・表示切替
- 縦軸オートスケール、チャンネル別の手動範囲設定
- PC / スマートフォン向けのレスポンシブ画面
- ライト／ダークモード切替（初期値はライト、ブラウザ内に選択を保存）
- オフライン配布用のローカル HTTP サーバーと Windows 実行ファイルの生成

**制約**: Web Serial API に対応した Chrome / Edge と、HTTPS または localhost が必要です。Start / Stop ボタンは未実装です。実際の機器を接続する動作確認は別途必要です。

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/react-gui-tool/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/react-gui-tool/develop/ |

`main` に統合されたワークフローが、両ブランチの内容を1つの Pages サイト内の別パスに配置します。

## 技術スタック

- TypeScript 5 / React 18 / React Router 6
- Web Serial API / Recharts 2
- Vite 5 / CSS
- Node.js 26 / pnpm 9
- GitHub Actions / GitHub Pages

## ローカル開発

```bash
git clone https://github.com/naoiw/react-gui-tool.git
cd react-gui-tool
git switch develop
npm install --global pnpm@9
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

開発サーバーは `localhost` で動作します。生成された `dist/` は Git 管理対象外です。

## ブランチ運用

1. 通常の変更は `develop` に反映し、`main` を本番ブランチとして維持します。
2. `develop` への push と PR で TypeScript チェック・ビルドを実行します。
3. 検証済みの `develop` の更新は、`main` に配置した公開ワークフローが `/develop/` に反映します。
4. `develop` → `main` の Pull Request で本番反映します。マージ後も `develop` を維持・同期します。

## 表示テーマ

ヘッダー右上の「ダーク」「ライト」ボタンで表示テーマを切り替えます。**初回はライトモード**で表示し、選択したテーマはブラウザの `localStorage` に保存され、次回も使用されます。OSのテーマ設定には自動追従しません。

この切替はGitHub Pages版とWindowsオフライン版の両方で利用できます。Web Serialの通信や波形データはテーマ変更によってリセットされません。

## Windows オフライン版（BAT + ZIP）

[Build Windows offline ZIP](https://github.com/naoiw/react-gui-tool/actions/workflows/build-offline.yml) の成功した実行から `react-gui-tool-offline-windows` アーティファクトをダウンロードします。

1. ZIPを展開する。
2. `start-server.bat` をダブルクリックする。
3. 自動的に開くブラウザでWeb Serial APIを使う（**Chrome/Edge** が必要。既定ブラウザが非対応なら表示URLをChrome/Edgeで開く）。
4. 停止するときはコマンドプロンプトで `Ctrl+C`。

実行時のNode.js・pnpm・Python・ネット接続は不要です。Windows標準PowerShellでローカルサーバーを起動します。USBシリアル機器とドライバは別途必要です。

配布用ZIPはmain/developの更新時にWindows Actionsでビルド・動作確認して生成します。ソースから手元で生成する場合は `pnpm bundle:offline` を実行します（ビルド用PCにはNode.jsとpnpmが必要）。古いコミット済みEXE/ZIPは削除しました。

詳細: [オフライン版の手順](docs/OFFLINE.md)
## 構成・ドキュメント

- `src/components/` — シリアル接続 UI と Recharts 波形表示
- `src/lib/` — パケットパーサー、シリアル通信、チャンネル設定
- `src/index.css` — 共通デザイン、フォーム、状態表示、レスポンシブスタイル
- `scripts/` — オフライン配布用サーバーとバンドル作成
- `.github/workflows/` — 検証と Pages 公開
- [開発手順](docs/DEVELOPMENT.md) / [デプロイ構成](docs/DEPLOYMENT.md) / [オフライン版](docs/OFFLINE.md) / [UIの共通方針](docs/UI_CONSISTENCY.md)
- [技術概要](docs/00_overview.md) / [Web Serial API](docs/01_web_serial_api.md) / [グラフ表示](docs/02_recharts.md) / [パケット仕様](docs/03_packet.md) / [コンポーネント構成](docs/04_components.md) / [設定とスタイル](docs/05_config_and_styles.md)

## ライセンス

[MIT License](LICENSE)
