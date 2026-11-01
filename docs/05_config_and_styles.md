# 05_config_and_styles — 設定とスタイル

## チャンネル設定

`src/lib/config/channelConfig.ts` で4チャンネルの表示名・線色を設定します。グラフにのみ反映され、シリアルのパケット形式には影響しません。

```ts
export interface ChannelConfig {
  label: string;
  color: string;
}

export const CHANNEL_CONFIG: ChannelConfig[] = [
  { label: 'ch0', color: '#1f77b4' },
  { label: 'ch1', color: '#ff7f0e' },
  { label: 'ch2', color: '#2ca02c' },
  { label: 'ch3', color: '#d62728' },
];
```

変更する場合は `label` / `color` を編集して再ビルドしてください。未定義チャンネルのラベル・線色はグラフ側にフォールバックがあります。

## 共通 UI

スタイルは `src/index.css` に集約しています。他リポジトリとの共通方針は [UI_CONSISTENCY.md](UI_CONSISTENCY.md) を参照してください。

- `--chrome-*`: 他サイトとそろえた最大幅・余白・ヘッダー寸法・文字サイズ
- `--canvas`, `--panel`, `--line`, `--ink`, `--muted`, `--accent`: ダークモードの配色トークン
- `.site-header`, `.site-footer`, `.page-intro`: 共通ページ構成
- `.status-grid`, `.status-card`: 接続状態と最新パケット
- `.serial-control__*`: ポート設定、接続・切断、チャンネル操作
- `.waveform-card`, `.chart-range__*`: チャンネル別波形、縦軸の手動設定
- `.button`, `.field-input`, `.field-label`: 操作 UI

画面幅 750px 以下では2列の領域を縦並びに変更し、620px 以下でフォームを1列化します。値のスケール処理・グラフのデータ保持など機能面は `WaveformChart.tsx` が担当します。

## 関連

- [コンポーネント](04_components.md)
- [グラフ](02_recharts.md)
- [UI 共通方針](UI_CONSISTENCY.md)
