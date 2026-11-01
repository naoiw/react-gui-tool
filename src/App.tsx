import { useEffect, useState } from 'react';
import { SerialControl } from './components/SerialControl';
import { WaveformChart } from './components/WaveformChart';
import type { PacketData } from './lib/packet/types';

const INITIAL_CHANNEL_VISIBILITY = [true, true, true, true];
type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'react-gui-tool-theme';

function getInitialTheme(): Theme {
  // index.html applies the saved preference before stylesheets load.
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [connected, setConnected] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [lastPacket, setLastPacket] = useState<PacketData | null>(null);
  const [channelVisible, setChannelVisible] = useState<boolean[]>(INITIAL_CHANNEL_VISIBILITY);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The switch remains usable even if browser storage is disabled.
    }
  }, [theme]);

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
          <div className="header-actions">
            <span className="header-caption">SERIAL MONITOR</span>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'light' ? 'ダークモードに切り替える' : 'ライトモードに切り替える'}
              title={theme === 'light' ? 'ダークモードに切り替える' : 'ライトモードに切り替える'}
              aria-pressed={theme === 'dark'}
            >
              <span className="theme-toggle__icon" aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
              <span>{theme === 'light' ? 'ダーク' : 'ライト'}</span>
            </button>
          </div>
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
