# デプロイ構成

## URL

- 本番: https://naoiw.github.io/react-gui-tool/（`main`）
- 開発: https://naoiw.github.io/react-gui-tool/develop/（`develop`）

両環境は GitHub Pages の単一 `github-pages` 環境で公開します。リポジトリの **Settings → Pages → Source** を **GitHub Actions** に設定してください。

## ワークフロー

- `validate-develop.yml`: `develop` への push、`main` / `develop` 宛の PR で、依存関係の導入・型検査・ビルドを実施
- `deploy-pages.yml`: `main` への push、成功した `develop` 検証の `workflow_run`、手動実行で、本番・プレビュー双方をビルドし `publish/` に統合して公開

`workflow_run` 方式ではデプロイワークフローが **`main` に存在すること** が必要です。今回の変更を `main` にマージする前は、開発プレビューの自動更新は有効になりません。

本番ビルドには `GITHUB_PAGES_BASE=/react-gui-tool/`、プレビューには `GITHUB_PAGES_BASE=/react-gui-tool/develop/` を指定します。ローカル / オフライン向け通常ビルドは相対パス `./` を使います。URL は React Router による遷移を伴わない単一ページです。

## 注意点

- `main` のデプロイでも `develop` のチェックアウト・ビルドが必要です。両方のブランチは維持してください。
- ビルドが成功しても、実機への Web Serial 接続は別途確認してください。
- Pages の `github-pages` 環境にブランチ制限がある場合は設定を確認してください。
- Pages の URL は HTTPS ですが、Web Serial API 対応ブラウザが必要です。
- `workflow_run` からの公開は同一リポジトリの `develop` の push に限り、検証成功の場合のみ動作します。

## Windows オフラインZIP

`.github/workflows/build-offline.yml` は `main` / `develop` のpushやPRで、Windows上のビルド、ZIP作成、PowerShellサーバーのHTTP動作確認を実行します。成功したジョブから `react-gui-tool-offline-windows` アーティファクトをダウンロードできます。Pages向けとは別に、ローカル起動用の相対アセットパスでビルドします。詳細は [OFFLINE.md](OFFLINE.md) を参照してください。
