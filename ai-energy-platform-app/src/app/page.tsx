'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { MetricPill, SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { ConsumptionChart } from '@/components/charts/consumption-chart';
import { AnomalyTypeBreakdown } from '@/components/charts/anomaly-type-breakdown';
import { AnomalyCard } from '@/components/domain/anomaly-card';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, formatKwh, formatRange } from '@/lib/format';
import type { AnomalyListItem, AnomaliesSummary, DashboardSummary, MeterListItem, Reading } from '@/lib/types';

const DEMO_AUTH_KEY = 'demo-authed';

export default function DashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAuthed = window.localStorage.getItem(DEMO_AUTH_KEY) === '1';
    if (!isAuthed) {
      router.replace('/login');
    } else {
      setAuthed(true);
    }
  }, [router]);

  const summary = useAsync<DashboardSummary>(
    () => (authed ? apiClient.getDashboardSummary() : new Promise<DashboardSummary>(() => {})),
    [authed],
  );
  const meters = useAsync<MeterListItem[]>(
    () => (authed ? apiClient.listMeters() : new Promise<MeterListItem[]>(() => {})),
    [authed],
  );
  const anomalies = useAsync<AnomalyListItem[]>(
    () => (authed ? apiClient.listAnomalies() : new Promise<AnomalyListItem[]>(() => {})),
    [authed],
  );
  const anomaliesSummary = useAsync<AnomaliesSummary>(
    () => (authed ? apiClient.getAnomaliesSummary() : new Promise<AnomaliesSummary>(() => {})),
    [authed],
  );

  // Aggregate dashboard consumption chart from all meters — too many
  // readings to fetch at once, so we sample by querying the first
  // 3 meters only. This is enough to give the dashboard a visual
  // hint without overwhelming the API.
  const sampleMeterIds = useMemo(
    () => (meters.data ?? []).slice(0, 3).map((m) => m.code),
    [meters.data],
  );
  const sampleReadings = useAsync<Reading[]>(
    async () => {
      if (!authed) return [];
      const sets = await Promise.all(
        sampleMeterIds.map((id) => apiClient.getMeterReadings(id, { limit: 200 })),
      );
      return sets.flat();
    },
    [sampleMeterIds.join(','), authed],
  );

  const topAnomalies = (anomalies.data ?? [])
    .slice()
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operations dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Overview of monitored meters, consumption, and detected anomalies.
          </p>
        </div>
      </div>

      {summary.status === 'loading' ? <LoadingBlock rows={4} /> : null}
      {summary.status === 'error' ? (
        <ErrorState
          description={summary.error?.message ?? 'Backend not reachable.'}
          onRetry={summary.refetch}
        />
      ) : null}
      {summary.status === 'ready' && summary.data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total meters"
              value={String(summary.data.totalMeters)}
              hint="active in dataset"
            />
            <KpiCard
              title="Total consumption"
              value={formatKwh(summary.data.totalConsumptionKwh, 0)}
              hint={formatRange(summary.data.periodStart, summary.data.periodEnd)}
            />
            <KpiCard
              title="Anomalies"
              value={String(summary.data.totalAnomalies)}
              hint={
                summary.data.highPriorityAnomalies > 0
                  ? `${summary.data.highPriorityAnomalies} HIGH priority`
                  : 'no HIGH-priority issues'
              }
              tone={summary.data.highPriorityAnomalies > 0 ? 'alert' : 'normal'}
            />
            <KpiCard
              title="Aggregated confidence"
              value={
                summary.data.aggregatedConfidence === null
                  ? 'N/A'
                  : `${(summary.data.aggregatedConfidence * 100).toFixed(0)}%`
              }
              hint={
                summary.data.totalAnomalies > 0
                  ? `avg of ${summary.data.totalAnomalies} anomaly confidence value(s)`
                  : 'no anomalies to aggregate'
              }
            />
          </section>

          <p className="text-xs text-ink-subtle">
            Last reading {formatDateTime(summary.data.lastReadingAt)} · Status {summary.data.analysisStatus}
          </p>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Consumption overview"
                subtitle="Sample of the first 3 meters, last 200 readings each."
              />
              <CardBody>
                {sampleReadings.status === 'loading' ? (
                  <LoadingBlock rows={4} />
                ) : (
                  <ConsumptionChart readings={sampleReadings.data ?? []} height={260} />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Anomalies by type" />
              <CardBody>
                {anomaliesSummary.status === 'ready' ? (
                  <AnomalyTypeBreakdown byType={anomaliesSummary.data?.byType ?? {}} />
                ) : (
                  <LoadingBlock rows={3} />
                )}
              </CardBody>
            </Card>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Top priorities to investigate
              </h2>
              <Link
                href="/anomalies"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                View all anomalies →
              </Link>
            </header>
            {topAnomalies.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-ink-muted">
                    No anomalies detected. Run the analysis to refresh the verdicts.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {topAnomalies.map((a) => (
                  <AnomalyCard key={a.id} anomaly={a} />
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Meters" subtitle="Click a meter to see its detail." />
              <CardBody>
                {meters.status === 'loading' ? (
                  <LoadingBlock rows={4} />
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(meters.data ?? []).map((m) => (
                      <li key={m.code}>
                        <Link
                          href={`/meters/${m.code}`}
                          className="block rounded-md border border-surface-border bg-surface-muted px-3 py-2 text-sm transition-colors hover:border-ink hover:bg-white"
                        >
                          <div className="font-mono font-semibold">{m.code}</div>
                          <div className="text-xs text-ink-muted">
                            {m.readingsCount} readings · {m.eventsCount} events
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Recent activity" />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {(anomalies.data ?? [])
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.detectedAt).getTime() -
                        new Date(a.detectedAt).getTime(),
                    )
                    .slice(0, 5)
                    .map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <TypeBadge value={a.type} />
                          <SeverityBadge value={a.severity} />
                          <Link
                            href={`/anomalies/${a.id}`}
                            className="font-mono text-sm text-blue-700 hover:underline"
                          >
                            {a.meterId}
                          </Link>
                        </div>
                        <span className="text-xs text-ink-muted">
                          {formatDateTime(a.detectedAt)}
                        </span>
                      </li>
                    ))}
                </ul>
              </CardBody>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  tone = 'normal',
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: 'normal' | 'alert';
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <MetricPill label={title} value={value} hint={hint} />
          {tone === 'alert' ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              ATTENTION
            </span>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function priorityScore(a: AnomalyListItem): number {
  const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity] ?? 0;
  const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 }[a.priority] ?? 0;
  return severityRank * 10 + priorityRank + a.confidence;
}
