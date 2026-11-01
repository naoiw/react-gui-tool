# React GUI Tool

React / TypeScript 製のシリアル波形モニターです。Web Serial API で受信した4チャンネルの値を Recharts で表示します。

## 主な機能

- Chrome / Edge からのシリアルポート検出・追加・接続・切断
- ボーレートの選択（9,600〜115,200）
- 16byte・4ch・32bit unsigned・リトルエンディアンのパケット受信
- チャンネルごとに直近20点の波形表示・表示切替
- 縦軸オートスケール、チャンネル別の手動範囲設定
- PC / スマートフォン向けのレスポンシブ画面
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
- Node.js 22 / pnpm 9
- GitHub Actions / GitHub Pages

## ローカル開発

```bash
git clone https://github.com/naoiw/react-gui-tool.git
cd react-gui-tool
git switch develop
corepack enable
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

## オフライン配布

```bash
pnpm bundle:offline
```

このコマンドは `pnpm build` と Windows 向け `pkg` パッケージングを実行し、`release/offline-bundle/` に `react-gui-tool-server.exe`、`start-server.bat`、`dist/` を生成します。Windows で `start-server.bat` を起動するとローカルサーバーから画面を開けます。ブラウザの `file://` で直接 `dist/index.html` を開く方式は非対応です。

既存の `release/` 内のコミット済み実行ファイルは以前のビルドです。UI の変更をオフライン版へ反映する場合は、Windows で改めてパッケージを生成してください。

## 構成・ドキュメント

- `src/components/` — シリアル接続 UI と Recharts 波形表示
- `src/lib/` — パケットパーサー、シリアル通信、チャンネル設定
- `src/index.css` — 共通デザイン、フォーム、状態表示、レスポンシブスタイル
- `scripts/` — オフライン配布用サーバーとバンドル作成
- `.github/workflows/` — 検証と Pages 公開
- [開発手順](docs/DEVELOPMENT.md) / [デプロイ構成](docs/DEPLOYMENT.md) / [UIの共通方針](docs/UI_CONSISTENCY.md)
- [技術概要](docs/00_overview.md) / [Web Serial API](docs/01_web_serial_api.md) / [グラフ表示](docs/02_recharts.md) / [パケット仕様](docs/03_packet.md) / [コンポーネント構成](docs/04_components.md) / [設定とスタイル](docs/05_config_and_styles.md)

## ライセンス

[MIT License](LICENSE)
