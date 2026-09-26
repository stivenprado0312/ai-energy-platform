'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ANOMALY_TYPE, type AnomalyType } from '@/lib/types';

const COLORS: Record<AnomalyType, string> = {
  REAL_ANOMALY: '#dc2626',
  EXPLAINABLE: '#2563eb',
  FALSE_POSITIVE: '#94a3b8',
  DATA_QUALITY: '#d97706',
  NORMAL: '#cbd5e1',
};

interface Props {
  byType: Record<string, number>;
}

export function AnomalyTypeBreakdown({ byType }: Props) {
  const types = Object.values(ANOMALY_TYPE);
  const data = types
    .map((t) => ({ type: t, count: byType[t] ?? 0 }))
    .filter((d) => d.count > 0);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white px-6 py-10 text-center text-sm text-ink-muted">
        No anomalies recorded yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="type"
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#cbd5e1"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            stroke="#cbd5e1"
          />
          <Tooltip
            contentStyle={{ background: '#fff' }}
            formatter={(v: number) => [v, 'Anomalies']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.type} fill={COLORS[d.type as AnomalyType] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
