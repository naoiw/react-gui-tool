import { useState } from 'react';
import { SerialControl } from './components/SerialControl';
import { WaveformChart } from './components/WaveformChart';
import type { PacketData } from './lib/packet/types';

const INITIAL_CHANNEL_VISIBILITY = [true, true, true, true];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [lastPacket, setLastPacket] = useState<PacketData | null>(null);
  const [channelVisible, setChannelVisible] = useState<boolean[]>(INITIAL_CHANNEL_VISIBILITY);

  const handleChannelVisibleChange = (index: number, visible: boolean) => {
    setChannelVisible((current) => current.map((value, channel) => channel === index ? visible : value));
  };

  return (
    <div className="site-shell">
      <div className="page-container">
        <header className="site-header">
          <div className="site-brand">
            <span className="brand-mark" aria-hidden="true">∿</span>
            <span>React GUI Tool</span>
          </div>
          <span className="header-caption">SERIAL MONITOR</span>
        </header>

        <main className="site-main">
          <section className="page-intro">
            <p className="section-kicker">WEB SERIAL</p>
            <h1>シリアル波形モニター</h1>
            <p className="page-description">
              Web Serial API で受信した4チャンネルの値を表示します。
              シリアル接続には Chrome または Edge を使用してください。
            </p>
          </section>

          <div className="status-grid" aria-label="受信ステータス">
            <div className="status-card">
              <span className="status-card__label">接続状態</span>
              <strong className={connected ? 'status-card__value status-card__value--active' : 'status-card__value'}>
                <span className="status-dot" aria-hidden="true" />
                {connected ? '接続中' : '未接続'}
              </strong>
            </div>
            <div className="status-card">
              <span className="status-card__label">最新の受信値</span>
              <div className="packet-values">
                {(['ch0', 'ch1', 'ch2', 'ch3'] as const).map((channel) => (
                  <span key={channel}>
                    <small>{channel}</small>
                    <strong>{lastPacket?.[channel] ?? '—'}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <SerialControl
            onConnect={() => setConnected(true)}
            onDisconnect={() => setConnected(false)}
            onPacket={setLastPacket}
            onError={setSerialError}
            channelVisible={channelVisible}
            onChannelVisibleChange={handleChannelVisibleChange}
          />
          {serialError != null && <p className="error-message" role="alert">{serialError}</p>}
          <WaveformChart packet={lastPacket} channelVisible={channelVisible} />
        </main>
        <footer className="site-footer">
          <span>React GUI Tool</span>
          <a href="https://github.com/naoiw/react-gui-tool" target="_blank" rel="noopener noreferrer" aria-label="GitHubでソースコードを開く">GitHub ↗</a>
        </footer>
      </div>
    </div>
  );
}
