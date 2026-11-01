# UI 共通方針

`photo-editor` および `naoiw.github.io` と同じサイトクロームの寸法・ダーク系配色を使用します。別の UI フレームワークは導入せず、`src/index.css` の CSS 変数とクラスで統一します。

## サイトクローム

| 項目 | 設定 |
| --- | --- |
| 最大コンテンツ幅 | 1180px |
| 横パディング | 28px（620px 以下は17px） |
| ヘッダー高さ | 78px（620px 以下は67px） |
| 背景色 | `#0b1220` |
| パネル | `#172337` 付近 |
| 境界線 | `#304157` |
| 本文 | `#edf3fb` |
| 補助テキスト | `#a0b2c8` |
| アクセント | `#70ddc7` |

## コンポーネント

- `.site-header` / `.site-footer` — 他ツールと位置・サイズを統一
- `.status-grid` / `.status-card` — 接続状態と直近の受信値
- `.panel` / `.waveform-card` — 角丸・境界線・背景を共通化
- `.field-label` / `.field-input` — COMポート、ボーレート、数値入力
- `.button` / `.button--primary` / `.button--secondary` — 操作ボタン
- `.channel-toggle--on` — 表示チャンネルの選択状態
- `.error-message` — `role=alert` の単一エラー表示

画面幅 750px 以下では受信ステータスとシリアル設定を縦配置にします。620px 以下では入力欄を1列にして、ボタンとグラフ設定を折り返します。

`recharts` の線色は `channelConfig.ts` の設定を維持し、軸ラベルだけをダーク背景に合わせます。Start / Stop は未実装であり、無効化されたままです。

UI は一般的なデザインの共通部分のみ統一し、シリアルポート設定や波形の機能は既存仕様を維持します。
