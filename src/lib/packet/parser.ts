/**
 * 16byte バイト列を ch0〜ch3（各 32bit unsigned、リトルエンディアン）にパースする。
 */
import { PACKET_SIZE, BYTES_PER_CHANNEL, type PacketData } from './types';

/**
 * ArrayBuffer の指定オフセットから 16byte をパースして PacketData を返す。
 * @param buffer - 元の ArrayBuffer
 * @param offset - 読み取り開始オフセット（省略時は 0）
 * @returns パース結果。buffer が 16byte に満たない場合は throw
 */
export function parsePacket(buffer: ArrayBuffer, offset = 0): PacketData {
  if (buffer.byteLength < offset + PACKET_SIZE) {
    throw new RangeError(
      `parsePacket: buffer が ${PACKET_SIZE} byte に満ちません（offset=${offset}, length=${buffer.byteLength}）`
    );
  }
  const view = new DataView(buffer, offset, PACKET_SIZE);
  return {
    ch0: view.getUint32(0, true),
    ch1: view.getUint32(BYTES_PER_CHANNEL, true),
    ch2: view.getUint32(BYTES_PER_CHANNEL * 2, true),
    ch3: view.getUint32(BYTES_PER_CHANNEL * 3, true),
  };
}
