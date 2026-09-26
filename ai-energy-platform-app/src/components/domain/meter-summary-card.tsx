'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { MetricPill } from '@/components/ui/badges';
import { formatKwh, formatRange } from '@/lib/format';
import type { MeterDetail } from '@/lib/types';

export function MeterSummaryCard({ meter }: { meter: MeterDetail }) {
  const s = meter.summary;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono text-lg">{meter.code}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {meter.status}
            </span>
          </span>
        }
        subtitle={`Readings window: ${formatRange(s.firstTimestamp, s.lastTimestamp)}`}
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <MetricPill
            label="Total consumption"
            value={formatKwh(s.totalKwh, 1)}
            hint={`${s.readingsCount} readings`}
          />
          <MetricPill label="Average" value={formatKwh(s.averageKwh, 2)} />
          <MetricPill label="Min / Max" value={`${formatKwh(s.minKwh, 1)} / ${formatKwh(s.maxKwh, 1)}`} />
          <MetricPill label="Events recorded" value={String(meter.eventsCount)} />
        </div>
      </CardBody>
    </Card>
  );
}
