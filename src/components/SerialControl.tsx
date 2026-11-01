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
  const currentPortRef = useRef<SerialPort | null>(null);
  const isDisconnectingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readLoopPromiseRef = useRef<Promise<void> | null>(null);

  const clearError = useCallback(() => {
    onError(null);
  }, [onError]);

  const handleRefresh = useCallback(async () => {
    clearError();
    if (!isSerialSupported()) {
      const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
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
      onError(msg);
    }
  }, [clearError, selectedIndex]);

  const handleAddPort = useCallback(async () => {
    clearError();
    if (!isSerialSupported()) {
      const msg = 'Web Serial API が利用できません。Chrome または Edge で開いてください。';
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
      onError(msg);
    }
  }, [clearError, onError]);

  const handleConnect = useCallback(async () => {
    clearError();
    if (selectedIndex < 0 || selectedIndex >= ports.length) {
      const msg = 'ポートを選択してください。';
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
          onError(msg);
        },
        controller.signal
      );
      readLoopPromiseRef.current = readLoopPromise;
      readLoopPromise.catch((err) => {
        if (isDisconnectingRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        onError(msg);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
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
      onError(msg);
    } finally {
      currentPortRef.current = null;
      isDisconnectingRef.current = false;
      setConnected(false);
      onDisconnect();
    }
  }, [onDisconnect, onError]);

  return (
    <section aria-label="シリアル通信" className="panel serial-control">
      <div className="panel-header">
        <div>
          <p className="section-kicker">DEVICE</p>
          <h2>シリアル接続</h2>
        </div>
        <span className={connected ? 'status-badge status-badge--connected' : 'status-badge'}>
          {connected ? '接続中' : '未接続'}
        </span>
      </div>

      <div className="serial-control__layout">
        <div className="serial-control__actions">
          <button className="button button--secondary" type="button" onClick={handleRefresh} disabled={connected}>
            ポート更新
          </button>
          <button className="button button--secondary" type="button" onClick={handleAddPort} disabled={connected}>
            ポート追加
          </button>
        </div>
        <div className="serial-control__fields">
          <label className="field-label">
            COMポート
            <select
              className="field-input"
              value={selectedIndex < 0 ? '' : selectedIndex}
              onChange={(event) => setSelectedIndex(event.target.value === '' ? -1 : Number(event.target.value))}
              disabled={connected}
              aria-label="COMポート一覧"
            >
              <option value="">ポートを選択</option>
              {ports.map((port, index) => (
                <option key={index} value={index}>{getPortLabel(port, index)}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            ボーレート
            <select
              className="field-input"
              value={baudRate}
              onChange={(event) => setBaudRate(Number(event.target.value))}
              disabled={connected}
              aria-label="Baudrate"
            >
              {BAUD_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="serial-control__commands">
        {connected ? (
          <button className="button button--secondary" type="button" onClick={handleDisconnect}>切断</button>
        ) : (
          <button className="button button--primary" type="button" onClick={handleConnect}>接続</button>
        )}
        <button className="button button--secondary" type="button" disabled title="未実装">Start</button>
        <button className="button button--secondary" type="button" disabled title="未実装">Stop</button>
        <span className="helper-text">Start / Stop は未実装</span>
      </div>

      {channelVisible != null && onChannelVisibleChange != null && channelVisible.length >= 4 && (
        <div className="channel-visibility">
          <span className="field-label">表示チャンネル</span>
          <div className="channel-visibility__buttons" role="group" aria-label="波形表示チャンネル">
            {[0, 1, 2, 3].map((channel) => (
              <button
                key={channel}
                type="button"
                aria-pressed={channelVisible[channel]}
                aria-label={`ch${channel} 波形表示`}
                className={channelVisible[channel] ? 'button channel-toggle channel-toggle--on' : 'button channel-toggle'}
                onClick={() => onChannelVisibleChange(channel, !channelVisible[channel])}
              >
                ch{channel}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
