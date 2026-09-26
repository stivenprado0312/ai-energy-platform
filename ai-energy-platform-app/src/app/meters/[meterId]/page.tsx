'use client';

import Link from 'next/link';
import { use } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { ConsumptionChart } from '@/components/charts/consumption-chart';
import { ElectricalChart } from '@/components/charts/consumption-chart';
import { MeterSummaryCard } from '@/components/domain/meter-summary-card';
import { EventsList } from '@/components/domain/events-list';
import { AnomalyCard } from '@/components/domain/anomaly-card';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient } from '@/lib/api-client';
import { formatKwh } from '@/lib/format';
import type {
  AnomalyListItem,
  MeterDetail,
  MeterEvent,
  Reading,
} from '@/lib/types';

interface PageProps {
  params: Promise<{ meterId: string }>;
}

export default function MeterDetailPage({ params }: PageProps) {
  const { meterId } = use(params);
  const detail = useAsync<MeterDetail>(() => apiClient.getMeter(meterId), [meterId]);
  const readings = useAsync<Reading[]>(
    () => apiClient.getMeterReadings(meterId),
    [meterId],
  );
  const events = useAsync<MeterEvent[]>(
    async () => apiClient.getMeterEvents(meterId).catch(() => []),
    [meterId],
  );
  const anomalies = useAsync<AnomalyListItem[]>(
    () => apiClient.listAnomaliesByMeter(meterId),
    [meterId],
  );

  const mainAnomaly = anomalies.data?.[0];
  const windowStart = mainAnomaly?.windowStart;
  const windowEnd = mainAnomaly?.windowEnd;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/meters"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"
        >
          ← Back to meters
        </Link>
      </div>

      {detail.status === 'loading' ? <LoadingBlock rows={4} /> : null}
      {detail.status === 'error' ? (
        <ErrorState
          description={detail.error?.message ?? 'Could not load meter.'}
          onRetry={detail.refetch}
        />
      ) : null}
      {detail.status === 'ready' && detail.data ? <MeterSummaryCard meter={detail.data} /> : null}

      {mainAnomaly ? (
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="font-mono text-base">{mainAnomaly.meterId}</span>
                <TypeBadge value={mainAnomaly.type} />
                <SeverityBadge value={mainAnomaly.severity} />
                <SeverityBadge value={mainAnomaly.priority} />
              </span>
            }
            subtitle="Detected anomaly — open the detail page for full evidence."
            actions={
              <Link
                href={`/anomalies/${mainAnomaly.id}`}
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                Investigate →
              </Link>
            }
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Baseline" value={formatKwh(mainAnomaly.baselineKwh)} />
              <Stat label="Observed" value={formatKwh(mainAnomaly.observedKwh)} />
              <Stat label="Deviation" value={`${mainAnomaly.deviationPercent.toFixed(1)}%`} />
              <Stat
                label="Confidence"
                value={`${(mainAnomaly.confidence * 100).toFixed(0)}%`}
              />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Consumption timeline" subtitle="Hourly kWh over the full window." />
        <CardBody>
          {readings.status === 'loading' ? (
            <LoadingBlock rows={5} />
          ) : (
            <ConsumptionChart
              readings={readings.data ?? []}
              windowStart={windowStart}
              windowEnd={windowEnd}
              height={300}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Electrical variables"
          subtitle="Voltage, current and power factor."
        />
        <CardBody>
          {readings.status === 'loading' ? (
            <LoadingBlock rows={5} />
          ) : (
            <ElectricalChart readings={readings.data ?? []} />
          )}
        </CardBody>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EventsList events={events.data ?? []} />
        <Card>
          <CardHeader
            title="Anomalies"
            subtitle={
              anomalies.data && anomalies.data.length > 0
                ? `${anomalies.data.length} on file`
                : 'No anomalies on file for this meter.'
            }
          />
          <CardBody>
            {anomalies.status === 'loading' ? (
              <LoadingBlock rows={2} />
            ) : anomalies.data && anomalies.data.length > 0 ? (
              <div className="space-y-3">
                {anomalies.data.map((a) => (
                  <AnomalyCard key={a.id} anomaly={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                This meter is currently classified as normal.
              </p>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
