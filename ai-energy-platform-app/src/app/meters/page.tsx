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
import { formatKwh, formatPercent } from '@/lib/format';
import type { AnomalyListItem, MeterListItem } from '@/lib/types';

type FilterMode = 'all' | 'normal' | 'alerts' | 'critical';
type SortKey = 'code' | 'consumption' | 'variation' | 'severity';
type SortDir = 'asc' | 'desc';

const SEVERITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function meterMatchesFilter(m: MeterListItem, anomaly: AnomalyListItem | undefined, mode: FilterMode): boolean {
  if (mode === 'all') return true;
  if (!anomaly) return mode === 'normal';
  if (mode === 'alerts') return anomaly.type !== 'FALSE_POSITIVE' && anomaly.type !== 'NORMAL';
  if (mode === 'critical') return anomaly.severity === 'HIGH' || anomaly.priority === 'HIGH';
  return true;
}

function meterMatchesSearch(m: MeterListItem, q: string): boolean {
  if (!q.trim()) return true;
  return m.code.toLowerCase().includes(q.trim().toLowerCase());
}

function compareMeters(a: MeterListItem, b: MeterListItem, anomalies: Map<string, AnomalyListItem>, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'code':
      return a.code.localeCompare(b.code) * sign;
    case 'consumption':
      return (a.totalConsumptionKwh - b.totalConsumptionKwh) * sign;
    case 'variation':
      return (a.variation - b.variation) * sign;
    case 'severity': {
      const sa = SEVERITY_RANK[anomalies.get(a.code)?.severity ?? ''] ?? 0;
      const sb = SEVERITY_RANK[anomalies.get(b.code)?.severity ?? ''] ?? 0;
      if (sa !== sb) return (sa - sb) * sign;
      return a.code.localeCompare(b.code);
    }
  }
}

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
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const visibleMeters = useMemo(() => {
    const all = meters.data ?? [];
    const filtered = all.filter(
      (m) =>
        meterMatchesFilter(m, anomaliesByMeter.get(m.code), filter) &&
        meterMatchesSearch(m, search),
    );
    return [...filtered].sort((a, b) => compareMeters(a, b, anomaliesByMeter, sortKey, sortDir));
  }, [meters.data, anomaliesByMeter, filter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'code' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meters</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Twelve electrical meters under monitoring. Filter, search and sort to find
            what needs attention.
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

      <div className="rounded-xl border border-surface-border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1 rounded-md border border-surface-border bg-surface-muted p-1 text-sm font-medium">
            {(['all', 'normal', 'alerts', 'critical'] as FilterMode[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  'rounded px-3 py-1 capitalize transition-colors ' +
                  (filter === f
                    ? 'bg-ink text-white'
                    : 'text-ink-muted hover:bg-white hover:text-ink')
                }
              >
                {f}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="uppercase tracking-wide">Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="M-109"
              className="w-44 rounded-md border border-surface-border bg-white px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>Sort by</span>
          {([
            { key: 'code' as const, label: 'code' },
            { key: 'consumption' as const, label: 'consumption' },
            { key: 'variation' as const, label: 'range variation' },
            { key: 'severity' as const, label: 'severity' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSort(key)}
              className={
                'rounded-full border px-2.5 py-0.5 capitalize transition-colors ' +
                (sortKey === key
                  ? 'border-ink bg-ink text-white'
                  : 'border-surface-border bg-white text-ink-muted hover:text-ink')
              }
              title={label === 'range variation' ? 'Range variation = (max − min) / avg' : label}
            >
              {label}
              {sortKey === key ? <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span> : null}
            </button>
          ))}
          <span className="ml-auto">
            Showing <span className="font-semibold text-ink">{visibleMeters.length}</span> of{' '}
            <span className="font-semibold text-ink">{meters.data?.length ?? 0}</span>
          </span>
        </div>
      </div>

      {meters.status === 'loading' ? <LoadingBlock rows={6} /> : null}
      {meters.status === 'error' ? (
        <ErrorState description={meters.error?.message ?? 'Could not load meters.'} onRetry={meters.refetch} />
      ) : null}
      {meters.status === 'ready' && meters.data ? (
        visibleMeters.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-ink-muted">
                No meters match the current filters and search.
              </p>
            </CardBody>
          </Card>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMeters.map((m) => (
              <MeterCard key={m.code} meter={m} anomaly={anomaliesByMeter.get(m.code)} />
            ))}
          </div>
        ) : (
          <MeterTable meters={visibleMeters} anomalies={Array.from(anomaliesByMeter.values())} />
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
            <Field label="Consumption" value={formatKwh(meter.totalConsumptionKwh, 0)} />
            <Field
              label="Range variation"
              value={formatPercent(meter.variation * 100, 0)}
              hint="(max − min) / avg"
            />
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
                <th className="px-3 py-2 text-right font-semibold">Consumption (kWh)</th>
                <th
                  className="px-3 py-2 text-right font-semibold"
                  title="Range variation = (max − min) / avg"
                >
                  Range variation
                </th>
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
                    <td className="px-3 py-2 text-right font-mono">{m.totalConsumptionKwh.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatPercent(m.variation * 100, 0)}</td>
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

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div
        className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle"
        title={hint ?? label}
      >
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{value}</div>
      {hint ? <div className="text-[11px] text-ink-subtle">{hint}</div> : null}
    </div>
  );
}
