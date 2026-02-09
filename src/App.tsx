/**
 * App … シリアル接続状態・受信データなどの状態を保持し、
 * SerialControl / WaveformChart 等に渡す。
 * docs/architecture.md のコンポーネント責務に従う。
 */
import { useState } from 'react';

// 後で SerialControl, WaveformChart を import
// import { SerialControl } from './components/SerialControl';
// import { WaveformChart } from './components/WaveformChart';

export default function App() {
  const [connected, _setConnected] = useState(false);
  const [serialError, _setSerialError] = useState<string | null>(null);
  // 受信データ（リングバッファ）は WaveformChart 側で管理する想定。
  // _setConnected / _setSerialError は SerialControl 実装時にコールバックで渡す。

  return (
    <main style={{ padding: '1rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>React GUI Tool - シリアル波形表示</h1>
      <p>
        対応ブラウザ: <strong>Chrome または Edge</strong>（Web Serial API 対応）
      </p>

      {/* シリアル通信エリア（SerialControl を配置予定） */}
      <section aria-label="シリアル通信">
        <p>SerialControl コンポーネント配置予定</p>
        {serialError && <p role="alert">{serialError}</p>}
        <p>接続状態: {connected ? '接続中' : '未接続'}</p>
      </section>

      {/* グラフエリア（WaveformChart を配置予定） */}
      <section aria-label="波形グラフ">
        <p>WaveformChart コンポーネント配置予定</p>
      </section>
    </main>
  );
}
