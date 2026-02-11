/**
 * SerialControl … ポート一覧取得・選択、ボーレート選択、Connect/Disconnect、
 * Start/Stop（UI のみ）、エラー/状態のインライン表示。
 * docs/architecture.md のコンポーネント責務に従う。
 */
import { useCallback, useRef, useState } from 'react';
import type { PacketData } from '../lib/packet/types';
import {
  close,
  getPorts,
  isSerialSupported,
  open,
  requestPort,
  startReadLoop,
} from '../lib/serial/serialService';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;

export interface SerialControlProps {
  onConnect: () => void;
  onDisconnect: () => void;
  onPacket: (data: PacketData) => void;
  onError: (message: string | null) => void;
  /** ch0～ch3 の波形表示 ON/OFF（渡すと 3 行目にトグルを表示） */
  channelVisible?: boolean[];
  onChannelVisibleChange?: (index: number, visible: boolean) => void;
}

function getPortLabel(port: SerialPort, index: number): string {
  try {
    const info = port.getInfo();
    if (info.usbVendorId != null && info.usbProductId != null) {
      return `COM (USB ${info.usbVendorId.toString(16)}:${info.usbProductId.toString(16)})`;
    }
  } catch {
    // ignore
  }
  return `ポート ${index + 1}`;
}

export function SerialControl({
  onConnect,
  onDisconnect,
  onPacket,
  onError,
  channelVisible,
  onChannelVisibleChange,
}: SerialControlProps) {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentPortRef = useRef<SerialPort | null>(null);
  const isDisconnectingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readLoopPromiseRef = useRef<Promise<void> | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    onError(null);
  }, [onError]);

  const handleRefresh = useCallback(async () => {
    clearError();
    if (!isSerialSupported()) {
      const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
      setError(msg);
      onError(msg);
      return;
    }
    try {
      const list = await getPorts();
      setPorts(list);
      if (selectedIndex >= list.length) {
        setSelectedIndex(list.length > 0 ? 0 : -1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onError(msg);
    }
  }, [clearError, selectedIndex]);

  const handleAddPort = useCallback(async () => {
    clearError();
    if (!isSerialSupported()) {
      const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
      setError(msg);
      onError(msg);
      return;
    }
    try {
      const port = await requestPort();
      setPorts((prev) => [...prev, port]);
      setSelectedIndex((prev) => (prev < 0 ? 0 : prev + 1));
    } catch (e) {
      if ((e as Error).name === 'NotFoundError') return; // ユーザーがキャンセル
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onError(msg);
    }
  }, [clearError, onError]);

  const handleConnect = useCallback(async () => {
    clearError();
    if (selectedIndex < 0 || selectedIndex >= ports.length) {
      const msg = 'ポートを選択してください。';
      setError(msg);
      onError(msg);
      return;
    }
    const port = ports[selectedIndex];
    if (!port) {
      return;
    }
    try {
      await open(port, baudRate);
      currentPortRef.current = port;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setConnected(true);
      onConnect();

      const readLoopPromise = startReadLoop(
        port,
        onPacket,
        (err) => {
          if (isDisconnectingRef.current) return;
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          onError(msg);
        },
        controller.signal
      );
      readLoopPromiseRef.current = readLoopPromise;
      readLoopPromise.catch((err) => {
        if (isDisconnectingRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError(msg);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onError(msg);
    }
  }, [clearError, selectedIndex, ports, baudRate, onConnect, onPacket, onError]);

  const handleDisconnect = useCallback(async () => {
    const port = currentPortRef.current;
    if (!port) return;
    isDisconnectingRef.current = true;
    const controller = abortControllerRef.current;
    const readLoopPromise = readLoopPromiseRef.current;
    try {
      if (controller) {
        controller.abort();
        abortControllerRef.current = null;
      }
      if (readLoopPromise) {
        await readLoopPromise;
        readLoopPromiseRef.current = null;
      }
      await close(port);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onError(msg);
    } finally {
      currentPortRef.current = null;
      isDisconnectingRef.current = false;
      setConnected(false);
      onDisconnect();
    }
  }, [onDisconnect, onError]);

  return (
    <section aria-label="シリアル通信" className="serial-control" style={{ marginBottom: '1rem' }}>
      <div className="serial-control__row">
        <button type="button" onClick={handleRefresh} disabled={connected}>
          Refresh
        </button>
        <button type="button" onClick={handleAddPort} disabled={connected}>
          Add port
        </button>
        <div className="serial-control__port-group">
          <label className="serial-control__label">
            COMポート一覧:
            <select
              className="serial-control__port-select"
              value={selectedIndex < 0 ? '' : selectedIndex}
              onChange={(e) => setSelectedIndex(e.target.value === '' ? -1 : Number(e.target.value))}
              disabled={connected}
              aria-label="COMポート一覧"
            >
              <option value="">-- 選択 --</option>
              {ports.map((port, i) => (
                <option key={i} value={i}>
                  {getPortLabel(port, i)}
                </option>
              ))}
            </select>
          </label>
          <label className="serial-control__label">
            Baudrate:
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={connected}
              aria-label="Baudrate"
            >
              {BAUD_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="serial-control__row">
        {connected ? (
          <button type="button" onClick={handleDisconnect}>
            Disconnect
          </button>
        ) : (
          <button type="button" onClick={handleConnect}>
            Connect
          </button>
        )}
        <button type="button" disabled>
          Start
        </button>
        <button type="button" disabled>
          Stop
        </button>
        {channelVisible != null &&
          onChannelVisibleChange != null &&
          channelVisible.length >= 4 && (
            <div className="serial-control__channel-toggles">
              {[0, 1, 2, 3].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={channelVisible[ch]}
                  aria-label={`ch${ch} 波形表示`}
                  className={channelVisible[ch] ? 'channel-toggle--on' : undefined}
                  onClick={() => onChannelVisibleChange(ch, !channelVisible[ch])}
                >
                  ch{ch}
                </button>
              ))}
            </div>
          )}
      </div>
      {connected && (
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>接続中</p>
      )}
      {error != null && (
        <p role="alert" style={{ margin: '0.25rem 0', color: 'var(--error-color, #f88)' }}>
          {error}
        </p>
      )}
    </section>
  );
}
