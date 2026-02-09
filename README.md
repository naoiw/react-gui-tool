# React GUI Tool（シリアル波形表示）

1 ページの SPA で、COM ポート経由のシリアル通信を行い、取得したデータを波形として GUI 表示するツールです。

## 技術スタック

- **TypeScript** … 型安全性と保守性のため
- **React** … コンポーネントベースの UI 構築
- **Vite** … 高速な開発サーバーとビルド
- **pnpm** … パッケージ管理
- **React Router** … ルーティング
- **Web Serial API** … ブラウザから COM ポートへアクセス
- **uPlot** … 波形グラフの描画

## 必要環境

- **Node.js** … 執筆時点の推奨は LTS（例: Node 22 以上）。[Node.js](https://nodejs.org/) からインストール
- **pnpm** … `npm install -g pnpm` でインストール
- **対応ブラウザ** … Web Serial API 対応のため **Chrome または Edge** で利用してください。GitHub Pages（HTTPS）でも Web Serial は利用可能です。

## セットアップ

```bash
git clone <リポジトリURL>
cd react-gui-tool
pnpm install
```

環境変数（`.env`）が必要な場合はリポジトリ内の説明に従って設定してください。基本は `pnpm install` のみで開発を開始できます。

## 開発

```bash
pnpm dev
```

開発サーバーが起動します。localhost では Web Serial API が利用可能です。ブラウザは **Chrome または Edge** を使用してください。

## ビルド

```bash
pnpm build
```

ビルド結果は `dist` ディレクトリに出力されます。

## GitHub Pages でのデプロイ

`main` ブランチへの push で GitHub Actions がビルドし、GitHub Pages へ自動デプロイします。

### 初回のみ：GitHub Pages を有効にする

**404 / "Creating Pages deployment failed" が出る場合は、リポジトリで Pages のソースを「GitHub Actions」に設定してください。**

1. GitHub でリポジトリを開く
2. **Settings** → 左メニュー **Code and automation** の **Pages**
3. **Build and deployment** の **Source** で **GitHub Actions** を選択する  
   （「Deploy from a branch」や「None」のままでは `deploy-pages` が 404 になります）

設定後、`main` への push または **Actions** タブから「Deploy to GitHub Pages」を手動実行するとデプロイされます。

### ローカルでのビルド

- `pnpm build` でビルドし、出力は `dist` にあります。
- デプロイは `actions/upload-pages-artifact` と `actions/deploy-pages` が行います。

**注意**: 本番は HTTPS のため Web Serial API は利用可能ですが、**対応ブラウザは Chrome/Edge に限定されます**。GitHub Pages の URL を開く際も Chrome または Edge を使用してください。

## 使い方（概要）

1. **シリアル通信**
   - 「Refresh」で COM ポート一覧を更新
   - プルダウンでポートとボーレートを選択
   - 「Connect」/「Disconnect」のトグルで接続・切断
   - 接続エラーや状態はシリアル設定エリアにインラインで表示されます
2. **グラフ**
   - シリアルから受信した 4ch（ch0〜ch3）のデータを波形表示
   - 各チャンネルの表示/非表示はトグルで切り替え可能
3. **Start/Stop ボタン** … 拡張用の UI のみ用意しており、現時点では未実装です。

## ライセンス

本プロジェクトは [LICENSE](LICENSE) に従います。
