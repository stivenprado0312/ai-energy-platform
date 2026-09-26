'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient } from '@/lib/api-client';
import { AnomaliesView } from '@/components/domain/anomalies-view';
import type { AnomalyListItem, MeterListItem } from '@/lib/types';

export default function MetersPage() {
  const meters = useAsync<MeterListItem[]>(() => apiClient.listMeters(), []);
  const anomalies = useAsync<AnomalyListItem[]>(() => apiClient.listAnomalies(), []);

  const anomaliesByMeter = useMemo(() => {
    const map = new Map<string, AnomalyListItem>();
    for (const a of anomalies.data ?? []) {
      map.set(a.meterId, a);
    }
    return map;
  }, [anomalies.data]);

  const [view, setView] = useState<'cards' | 'table'>('cards');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meters</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Twelve electrical meters under monitoring. Each card summarizes readings,
            events and any open anomaly.
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-surface-border">
          <button
            type="button"
            className={
              'px-3 py-1.5 text-sm font-medium ' +
              (view === 'cards' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-slate-50')
            }
            onClick={() => setView('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={
              'border-l border-surface-border px-3 py-1.5 text-sm font-medium ' +
              (view === 'table' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-slate-50')
            }
            onClick={() => setView('table')}
          >
            Table
          </button>
        </div>
      </div>

      {meters.status === 'loading' ? <LoadingBlock rows={6} /> : null}
      {meters.status === 'error' ? (
        <ErrorState description={meters.error?.message ?? 'Could not load meters.'} onRetry={meters.refetch} />
      ) : null}
      {meters.status === 'ready' && meters.data ? (
        view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meters.data.map((m) => (
              <MeterCard
                key={m.code}
                meter={m}
                anomaly={anomaliesByMeter.get(m.code)}
              />
            ))}
          </div>
        ) : (
          <MeterTable meters={meters.data} anomalies={Array.from(anomaliesByMeter.values())} />
        )
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Anomalies by meter</h2>
        <AnomaliesView />
      </section>
    </div>
  );
}

function MeterCard({ meter, anomaly }: { meter: MeterListItem; anomaly?: AnomalyListItem }) {
  return (
    <Link
      href={`/meters/${meter.code}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono text-base">{meter.code}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {meter.status}
              </span>
            </span>
          }
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Readings" value={String(meter.readingsCount)} />
            <Field label="Events" value={String(meter.eventsCount)} />
          </div>
          <div className="mt-4 border-t border-surface-border pt-3">
            {anomaly ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ink-muted">Latest:</span>
                <TypeBadge value={anomaly.type} />
                <SeverityBadge value={anomaly.severity} />
                <SeverityBadge value={anomaly.priority} />
              </div>
            ) : (
              <span className="text-xs text-ink-muted">No anomalies on file.</span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {anomaly ? `Detected ${new Date(anomaly.detectedAt).toLocaleDateString()}` : '—'}
            </span>
            <span className="text-xs font-medium text-blue-700">Open meter →</span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function MeterTable({
  meters,
  anomalies,
}: {
  meters: MeterListItem[];
  anomalies: AnomalyListItem[];
}) {
  const anomaliesByMeter = new Map<string, AnomalyListItem>();
  for (const a of anomalies) anomaliesByMeter.set(a.meterId, a);

  return (
    <Card>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-surface-muted">
              <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2 text-left font-semibold">Meter</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Readings</th>
                <th className="px-3 py-2 text-right font-semibold">Events</th>
                <th className="px-3 py-2 text-left font-semibold">Anomaly</th>
                <th className="px-3 py-2 text-left font-semibold">Severity / Priority</th>
                <th className="px-3 py-2 text-right font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m) => {
                const a = anomaliesByMeter.get(m.code);
                return (
                  <tr key={m.code} className="border-b border-surface-border last:border-0">
                    <td className="px-3 py-2 font-mono">{m.code}</td>
                    <td className="px-3 py-2 text-xs text-ink-muted">{m.status}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.readingsCount}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.eventsCount}</td>
                    <td className="px-3 py-2">{a ? <TypeBadge value={a.type} /> : <span className="text-xs text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2">
                      {a ? (
                        <div className="flex flex-wrap gap-1">
                          <SeverityBadge value={a.severity} />
                          <SeverityBadge value={a.priority} />
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/meters/${m.code}`}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
