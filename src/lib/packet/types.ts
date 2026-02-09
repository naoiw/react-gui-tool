/**
 * パケットフォーマットの定数・型定義。
 * docs/architecture.md のデータ構造に従う。
 */

/** 1 パケットのバイト数 */
export const PACKET_SIZE = 16;

/** チャンネル数（ch0〜ch3） */
export const CHANNEL_COUNT = 4;

/** 1 チャンネルあたりのバイト数（32bit = 4byte） */
export const BYTES_PER_CHANNEL = 4;

/** パース済みパケットデータ（各チャンネルは 32bit unsigned、リトルエンディアン） */
export interface PacketData {
  ch0: number;
  ch1: number;
  ch2: number;
  ch3: number;
}
