/**
 * 波形グラフ用チャンネル設定（系統名・線色）。
 * ビルド時に取り込み、WaveformChart で使用する。
 */

export interface ChannelConfig {
  /** 系統名（凡例・タイトル表示用） */
  label: string;
  /** 線の色（CSS 色指定、例: "#1f77b4"） */
  color: string;
}

/** ch0～ch3 のデフォルト設定。コンフィグで上書き可能。 */
export const CHANNEL_CONFIG: ChannelConfig[] = [
  { label: 'ch0', color: '#1f77b4' },
  { label: 'ch1', color: '#ff7f0e' },
  { label: 'ch2', color: '#2ca02c' },
  { label: 'ch3', color: '#d62728' },
];
