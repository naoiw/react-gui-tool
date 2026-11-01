# 開発手順

## 必要環境

- Node.js 22（`.nvmrc`）
- pnpm 9（`pnpm/action-setup` に合わせる）
- Web Serial API に対応した Chrome または Edge

```bash
git clone https://github.com/naoiw/react-gui-tool.git
cd react-gui-tool
git switch develop
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## 確認

```bash
pnpm build
pnpm preview
```

`pnpm build` は `tsc -b` と Vite ビルドを実行します。実機の COM ポート通信までは自動検証されないため、Chrome / Edge で接続・切断、4ch 受信、縦軸設定、画面幅の変化を確認してください。

## 変更箇所

- `src/App.tsx` — ページ全体とステータス表示
- `src/components/SerialControl.tsx` — ポート接続・操作
- `src/components/WaveformChart.tsx` — 4ch 波形、20点バッファ、スケール操作
- `src/lib/serial/serialService.ts` — Web Serial API と読み取り
- `src/lib/packet/` — 16byte パケットを4chへ変換
- `src/lib/config/channelConfig.ts` — ラベルと線の色
- `src/index.css` — 共通クロームと個別コンポーネントのスタイル

## 運用

`develop` に通常の変更を push し、検証成功後にプレビューを確認します。本番反映は `develop` から `main` への PR で行います。マージ後も `develop` を残し、両ブランチを同期します。TypeScript のビルドキャッシュ `*.tsbuildinfo` は Git にコミットしません。

## オフライン版

`pnpm bundle:offline` はViteの相対パスビルドと配布用BAT・PowerShellサーバーをまとめ、`release/react-gui-tool-offline-windows.zip` を作成します。Windows用EXEの再生成は不要です。詳しくは [OFFLINE.md](OFFLINE.md) を参照してください。
