/**
 * App … シリアル接続状態・受信データなどの状態を保持し、
 * SerialControl / WaveformChart 等に渡す。
 * docs/architecture.md のコンポーネント責務に従う。
 */
import { useState } from 'react';
import { SerialControl } from './components/SerialControl';
import { WaveformChart } from './components/WaveformChart';
import type { PacketData } from './lib/packet/types';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [lastPacket, setLastPacket] = useState<PacketData | null>(null);
  const [channelVisible, setChannelVisible] = useState<boolean[]>([true, true, true, true]);

  const handleChannelVisibleChange = (index: number, visible: boolean) => {
    setChannelVisible((prev) => {
      const next = [...prev];
      next[index] = visible;
      return next;
    });
  };

  return (
    <main style={{ padding: '1rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>React GUI Tool - シリアル波形表示</h1>
      <p>
        対応ブラウザ: <strong>Chrome または Edge</strong>（Web Serial API 対応）
      </p>

      <SerialControl
        onConnect={() => setConnected(true)}
        onDisconnect={() => setConnected(false)}
        onPacket={setLastPacket}
        onError={setSerialError}
        channelVisible={channelVisible}
        onChannelVisibleChange={handleChannelVisibleChange}
      />
      {serialError != null && (
        <p role="alert" style={{ marginBottom: '0.5rem' }}>
          {serialError}
        </p>
      )}
      <p>接続状態: {connected ? '接続中' : '未接続'}</p>
      {lastPacket != null && (
        <p style={{ fontSize: '0.9rem' }}>
          最終受信値: ch0={lastPacket.ch0} ch1={lastPacket.ch1} ch2={lastPacket.ch2} ch3={lastPacket.ch3}
        </p>
      )}

      <WaveformChart packet={lastPacket} channelVisible={channelVisible} />
    </main>
  );
}
