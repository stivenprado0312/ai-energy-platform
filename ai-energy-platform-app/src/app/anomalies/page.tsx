'use client';

import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { AnomaliesView } from '@/components/domain/anomalies-view';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import type { AnomaliesSummary } from '@/lib/types';

export default function AnomaliesPage() {
  const summary = useAsync<AnomaliesSummary>(
    () => apiClient.getAnomaliesSummary(),
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Anomalies</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every anomaly is produced by the deterministic analytics engine. Filter by meter,
          type, severity or priority. Click an anomaly to investigate.
        </p>
      </div>

      {summary.status === 'loading' ? <LoadingBlock rows={2} /> : null}
      {summary.status === 'error' ? (
        <ErrorState
          description={summary.error?.message ?? 'Could not load summary.'}
          onRetry={summary.refetch}
        />
      ) : null}
      {summary.status === 'ready' && summary.data ? (
        <Card>
          <CardHeader title="Summary" />
          <CardBody>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Total" value={String(summary.data.total)} />
              <Stat label="By type" value={prettyCounts(summary.data.byType)} />
              <Stat label="By severity" value={prettyCounts(summary.data.bySeverity)} />
              <Stat label="By priority" value={prettyCounts(summary.data.byPriority)} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <AnomaliesView />

      <div className="text-xs text-ink-subtle">
        Tip: anomalies are computed on demand from the analytics engine. Open any row to
        see the structured evidence that produced the verdict.{' '}
        <Link href="/" className="underline">
          Back to dashboard
        </Link>
        .
      </div>
    </div>
  );
}

function prettyCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k} ${v}`).join(' · ');
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
