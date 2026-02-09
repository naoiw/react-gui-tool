/**
 * WaveformChart … uPlot のラップ、20 point のバッファ管理、
 * 4 つの独立したグラフ（ch0～ch3）、オートスケール用チェックボックス、
 * コンフィグ（系統名・線色）の適用。
 * docs/architecture.md のコンポーネント責務に従う。
 */
import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
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
}

/** 横軸の値（インデックス 0～19。表示は 20～1 に変換） */
function buildX(): number[] {
  const x: number[] = [];
  for (let i = 0; i < POINTS; i++) x.push(i);
  return x;
}

function makeChartOptions(
  channelIndex: number,
  autoScale: boolean,
  width: number,
  height: number
): uPlot.Options {
  const cfg = CHANNEL_CONFIG[channelIndex] ?? { label: `ch${channelIndex}`, color: '#888' };
  return {
    width,
    height,
    title: cfg.label,
    series: [
      { label: 'point' },
      {
        label: cfg.label,
        stroke: cfg.color,
        scale: 'y',
      },
    ],
    scales: {
      x: {
        range: [0, POINTS - 1],
        min: 0,
        max: POINTS - 1,
      },
      y: {
        min: 0,
        max: Y_MAX,
        ...(autoScale ? { auto: true } : { range: [0, Y_MAX] }),
      },
    },
    axes: [
      {
        scale: 'x',
        label: 'point',
        side: 2,
        size: 55,
        labelSize: 20,
        labelGap: -20,
        values: (_, splits) => splits.map((v) => String(POINTS - Math.round(v))),
      },
      {
        scale: 'y',
        label: 'count',
        side: 3,
        size: 100,
        gap: 8,
        labelSize: 20,
        labelGap: 0,
      },
    ],
    legend: { show: false },
  };
}

export function WaveformChart({ packet }: WaveformChartProps) {
  const [autoScale, setAutoScale] = useState(false);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const plotRefs = useRef<(uPlot | null)[]>([null, null, null, null]);
  const buffersRef = useRef<number[][]>([
    [],
    [],
    [],
    [],
  ]);

  const width = 800;
  const height = 280;
  /** 軸ラベルが切れないよう uPlot に渡す高さ（下側に余白を追加） */
  const chartHeight = height + 28;

  // uPlot インスタンスの生成（マウント時）と破棄（アンマウント時）
  useEffect(() => {
    const containers = containerRefs.current;
    const plots: uPlot[] = [];
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const el = containers[ch];
      if (!el) continue;
      const opts = makeChartOptions(ch, autoScale, width, chartHeight);
      const x = buildX();
      const y = new Array<number | null>(POINTS).fill(null);
      const u = new uPlot(opts, [x, y], el);
      plotRefs.current[ch] = u;
      plots.push(u);
    }
    return () => {
      for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
        plotRefs.current[ch]?.destroy();
        plotRefs.current[ch] = null;
      }
    };
  }, []);

  // オートスケール変更時に scale を更新（uPlot の opts は作成時のみなので setScale で縦軸を更新）
  useEffect(() => {
    const buffers = buffersRef.current;
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const u = plotRefs.current[ch];
      if (!u) continue;
      const arr = buffers[ch];
      if (!arr) continue;
      if (autoScale && arr.length > 0) {
        let min = arr[0]!;
        let max = arr[0]!;
        for (let i = 1; i < arr.length; i++) {
          const v = arr[i]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const pad = (max - min) * 0.05 || 1;
        u.setScale('y', { min: Math.max(0, min - pad), max: Math.min(Y_MAX, max + pad) });
      } else {
        u.setScale('y', { min: 0, max: Y_MAX });
      }
    }
  }, [autoScale]);

  // パケット受信でバッファ更新と setData
  useEffect(() => {
    if (packet == null) return;
    const buffers = buffersRef.current;
    const b0 = buffers[0]!;
    const b1 = buffers[1]!;
    const b2 = buffers[2]!;
    const b3 = buffers[3]!;
    b0.push(packet.ch0);
    b1.push(packet.ch1);
    b2.push(packet.ch2);
    b3.push(packet.ch3);
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const b = buffers[ch]!;
      if (b.length > POINTS) b.shift();
    }

    const x = buildX();
    for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
      const u = plotRefs.current[ch];
      if (!u) continue;
      const b = buffers[ch]!;
      const y: (number | null)[] = [];
      for (let i = 0; i < POINTS; i++) {
        y.push(i < b.length ? b[i]! : null);
      }
      u.setData([x, y], false);
      if (autoScale && b.length > 0) {
        let min = b[0]!;
        let max = b[0]!;
        for (let i = 1; i < b.length; i++) {
          const v = b[i]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        const pad = (max - min) * 0.05 || 1;
        u.setScale('y', { min: Math.max(0, min - pad), max: Math.min(Y_MAX, max + pad) });
      }
    }
  }, [packet, autoScale]);

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
        {[0, 1, 2, 3].map((ch) => (
          <div
            key={ch}
            ref={(el) => {
              if (containerRefs.current) containerRefs.current[ch] = el;
            }}
            data-channel={ch}
            style={{
              width,
              height: chartHeight + 8,
              border: '1px solid #999',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
          />
        ))}
      </div>
    </section>
  );
}
