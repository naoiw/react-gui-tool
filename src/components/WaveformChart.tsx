/**
 * WaveformChart … Recharts のラップ、20 point のバッファ管理、
 * 4 つの独立したグラフ（ch0～ch3）、オートスケール用チェックボックス、
 * コンフィグ（系統名・線色）の適用。
 * docs/architecture.md のコンポーネント責務に従う。
 */
import { useEffect, useRef, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNEL_CONFIG } from '../lib/config/channelConfig';
import type { PacketData } from '../lib/packet/types';
import { CHANNEL_COUNT } from '../lib/packet/types';

/** 横軸の点数 */
const POINTS = 20;
/** 縦軸最大（32bit unsigned） */
const Y_MAX = 2 ** 32;

export interface WaveformChartProps {
  /** 直近受信パケット（null の場合は更新しない） */
  packet: PacketData | null;
  /** ch0～ch3 の表示 ON/OFF（未指定時は全て表示） */
  channelVisible?: boolean[];
}

/** 1 チャンネル分の描画用データ */
interface ChartDatum {
  point: number;
  value: number | null;
}

/** 横軸の値（インデックス 0～19。表示は 20～1 に変換） */
function buildChartData(buffer: number[]): ChartDatum[] {
  const data: ChartDatum[] = [];
  for (let i = 0; i < POINTS; i++) {
    data.push({
      point: i,
      value: i < buffer.length ? buffer[i]! : null,
    });
  }
  return data;
}

function computeYDomain(buffer: number[], autoScale: boolean): [number, number] {
  if (!autoScale || buffer.length === 0) return [0, Y_MAX];
  let min = buffer[0]!;
  let max = buffer[0]!;
  for (let i = 1; i < buffer.length; i++) {
    const v = buffer[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const pad = (max - min) * 0.05 || 1;
  return [
    Math.max(0, min - pad),
    Math.min(Y_MAX, max + pad),
  ];
}

const DEFAULT_CHANNEL_VISIBLE: boolean[] = [true, true, true, true];

const HEIGHT = 280;

export function WaveformChart({
  packet,
  channelVisible = DEFAULT_CHANNEL_VISIBLE,
}: WaveformChartProps) {
  const [autoScale, setAutoScale] = useState(false);
  const [, setDataVersion] = useState(0);
  const buffersRef = useRef<number[][]>([[], [], [], []]);

  // パケット受信でバッファ更新し、再描画をトリガー
  useEffect(() => {
    if (packet == null) return;
    const buffers = buffersRef.current;
    buffers[0]!.push(packet.ch0);
    buffers[1]!.push(packet.ch1);
    buffers[2]!.push(packet.ch2);
    buffers[3]!.push(packet.ch3);
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const b = buffers[ch]!;
      if (b.length > POINTS) b.shift();
    }
    setDataVersion((v) => v + 1);
  }, [packet]);

  return (
    <section aria-label="波形グラフ" style={{ marginTop: '1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <input
            type="checkbox"
            checked={autoScale}
            onChange={(e) => setAutoScale(e.target.checked)}
            aria-label="縦軸オートスケール"
          />
          縦軸オートスケール
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[0, 1, 2, 3].map((ch) => {
          const buffer = buffersRef.current[ch]!;
          const chartData = buildChartData(buffer);
          const [yMin, yMax] = computeYDomain(buffer, autoScale);
          const cfg = CHANNEL_CONFIG[ch] ?? {
            label: `ch${ch}`,
            color: '#888',
          };
          return (
            <div
              key={ch}
              data-channel={ch}
              style={{
                display: channelVisible[ch] !== false ? undefined : 'none',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  padding: '4px 8px 0',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                }}
              >
                {cfg.label}
              </div>
              <ResponsiveContainer width="100%" height={HEIGHT}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 52, bottom: 24 }}
                >
                  <XAxis
                    dataKey="point"
                    type="number"
                    domain={[0, POINTS - 1]}
                    ticks={[0, 5, 10, 15, 19]}
                    tickFormatter={(v) => String(POINTS - Math.round(Number(v)))}
                    label={{
                      value: 'point',
                      position: 'insideBottom',
                      offset: -8,
                    }}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    label={{
                      value: 'count',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={cfg.color}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </section>
  );
}
