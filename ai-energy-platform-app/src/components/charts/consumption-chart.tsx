'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Reading } from '@/lib/types';

interface Props {
  readings: Reading[];
  windowStart?: string;
  windowEnd?: string;
  height?: number;
}

export function ConsumptionChart({
  readings,
  windowStart,
  windowEnd,
  height = 280,
}: Props) {
  const data = readings.map((r) => ({
    timestamp: r.timestamp,
    label: formatTick(r.timestamp),
    kwh: r.consumptionKwh,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            minTickGap={32}
            stroke="#cbd5e1"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#cbd5e1"
            label={{
              value: 'kWh',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 11,
              offset: 12,
            }}
          />
          <Tooltip
            contentStyle={{ background: '#fff' }}
            formatter={(v: number) => [`${v.toFixed(2)} kWh`, 'Consumption']}
            labelFormatter={(label: string) => label}
          />
          <Line
            type="monotone"
            dataKey="kwh"
            stroke="#0f172a"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
          {windowStart && windowEnd ? (
            <ReferenceArea
              x1={formatTick(windowStart)}
              x2={formatTick(windowEnd)}
              fill="#dc2626"
              fillOpacity={0.08}
              stroke="#dc2626"
              strokeOpacity={0.3}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ElectricalChart({
  readings,
  highlight,
  height = 220,
}: {
  readings: Reading[];
  highlight?: { voltage?: boolean; current?: boolean; pf?: boolean };
  height?: number;
}) {
  const data = readings.map((r) => ({
    timestamp: r.timestamp,
    label: formatTick(r.timestamp),
    voltage: r.voltageV,
    current: r.currentA,
    pf: r.powerFactor,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            minTickGap={32}
            stroke="#cbd5e1"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#cbd5e1"
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#cbd5e1"
            domain={[0.5, 1]}
          />
          <Tooltip
            contentStyle={{ background: '#fff' }}
            labelFormatter={(label: string) => label}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="voltage"
            name="Voltage (V)"
            stroke="#2563eb"
            strokeWidth={1.4}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="current"
            name="Current (A)"
            stroke="#d97706"
            strokeWidth={1.4}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pf"
            name="Power factor"
            stroke="#0f172a"
            strokeWidth={1.4}
            dot={false}
            isAnimationActive={false}
          />
          {highlight?.voltage ? (
            <ReferenceDot yAxisId="left" x={data[0]?.label} y={data[0]?.voltage ?? 0} r={0} />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTick(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
  });
}
