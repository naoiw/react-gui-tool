/**
 * Web Serial API のラップ。ポート取得・接続・読み取りループを提供する。
 */
import { parsePacket } from '../packet/parser';
import type { PacketData } from '../packet/types';
import { PACKET_SIZE } from '../packet/types';

function getSerial(): Serial | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const nav = navigator as Navigator & { serial?: Serial };
  return nav.serial;
}

/** Web Serial API が利用可能か */
export function isSerialSupported(): boolean {
  return getSerial() !== undefined;
}

/** 既に許可されたポート一覧を取得する */
export async function getPorts(): Promise<SerialPort[]> {
  const serial = getSerial();
  if (!serial) {
    throw new Error('Web Serial API が利用できません。Chrome または Edge で開いてください。');
  }
  return serial.getPorts();
}

/** ユーザーにポートを選択させ、許可されたポートを 1 つ返す */
export async function requestPort(): Promise<SerialPort> {
  const serial = getSerial();
  if (!serial) {
    throw new Error('Web Serial API が利用できません。Chrome または Edge で開いてください。');
  }
  return serial.requestPort();
}

/** ポートを指定ボーレートで開く */
export async function open(port: SerialPort, baudRate: number): Promise<void> {
  await port.open({ baudRate });
}

/** ポートを閉じる */
export async function close(port: SerialPort): Promise<void> {
  await port.close();
}

/**
 * 読み取りループを開始する。受信バイトを内部バッファに蓄積し、
 * 16byte 揃ったタイミングでパースして onPacket を呼ぶ。
 * signal が abort されるか、ポートが閉じられるかエラーで終了するまで実行する。
 */
export async function startReadLoop(
  port: SerialPort,
  onPacket: (data: PacketData) => void,
  onError?: (err: unknown) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!port.readable) {
    onError?.(new Error('ポートの読み取りストリームが利用できません'));
    return;
  }
  const reader = port.readable.getReader();
  const buffer: number[] = [];

  const onAbort = (): void => {
    reader.cancel().catch(() => {});
  };
  if (signal?.aborted) {
    onAbort();
  } else if (signal) {
    signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer.push(...value);
        while (buffer.length >= PACKET_SIZE) {
          const slice = buffer.splice(0, PACKET_SIZE);
          const ab = new ArrayBuffer(PACKET_SIZE);
          new Uint8Array(ab).set(slice);
          try {
            const data = parsePacket(ab);
            onPacket(data);
          } catch (e) {
            onError?.(e);
          }
        }
      }
    }
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (!isAbort && onError) onError(err);
  } finally {
    if (signal && !signal.aborted) {
      signal.removeEventListener('abort', onAbort);
    }
    reader.releaseLock();
  }
}
