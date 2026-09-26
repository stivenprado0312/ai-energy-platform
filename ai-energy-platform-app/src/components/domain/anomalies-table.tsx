'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { formatDateTime, formatKwh, formatPercent } from '@/lib/format';
import type { AnomalyListItem } from '@/lib/types';

interface Props {
  data: AnomalyListItem[];
  loading?: boolean;
}

type SortKey = 'meterId' | 'type' | 'severity' | 'priority' | 'deviationPercent' | 'confidence' | 'detectedAt';

const SEVERITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const PRIORITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function AnomaliesTable({ data, loading = false }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = readSortValue(a, sortKey);
      const bv = readSortValue(b, sortKey);
      if (av === bv) return 0;
      return av < bv ? -1 * dir : 1 * dir;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'meterId' ? 'asc' : 'desc');
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-border bg-white p-6 text-sm text-ink-muted">
        Loading anomalies…
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white p-10 text-center text-sm text-ink-muted">
        No anomalies match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-surface-border bg-surface-muted">
          <tr>
            <Th onClick={() => toggleSort('meterId')} active={sortKey === 'meterId'} dir={sortDir}>
              Meter
            </Th>
            <Th onClick={() => toggleSort('type')} active={sortKey === 'type'} dir={sortDir}>
              Type
            </Th>
            <Th onClick={() => toggleSort('severity')} active={sortKey === 'severity'} dir={sortDir}>
              Severity
            </Th>
            <Th onClick={() => toggleSort('priority')} active={sortKey === 'priority'} dir={sortDir}>
              Priority
            </Th>
            <Th
              onClick={() => toggleSort('deviationPercent')}
              active={sortKey === 'deviationPercent'}
              dir={sortDir}
              numeric
            >
              Deviation
            </Th>
            <Th>Baseline</Th>
            <Th>Observed</Th>
            <Th
              onClick={() => toggleSort('confidence')}
              active={sortKey === 'confidence'}
              dir={sortDir}
              numeric
            >
              Confidence
            </Th>
            <Th onClick={() => toggleSort('detectedAt')} active={sortKey === 'detectedAt'} dir={sortDir}>
              Detected
            </Th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr
              key={a.id}
              className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
            >
              <td className="px-4 py-3 align-middle">
                <Link
                  href={`/meters/${a.meterId}`}
                  className="font-mono text-sm text-blue-700 hover:underline"
                >
                  {a.meterId}
                </Link>
              </td>
              <td className="px-4 py-3 align-middle">
                <TypeBadge value={a.type} />
              </td>
              <td className="px-4 py-3 align-middle">
                <SeverityBadge value={a.severity} />
              </td>
              <td className="px-4 py-3 align-middle">
                <SeverityBadge value={a.priority} />
              </td>
              <td className="px-4 py-3 align-middle font-mono">
                {formatPercent(a.deviationPercent)}
              </td>
              <td className="px-4 py-3 align-middle font-mono text-xs">
                {formatKwh(a.baselineKwh, 1)}
              </td>
              <td className="px-4 py-3 align-middle font-mono text-xs">
                {formatKwh(a.observedKwh, 1)}
              </td>
              <td className="px-4 py-3 align-middle font-mono text-xs">
                {(a.confidence * 100).toFixed(0)}%
              </td>
              <td className="px-4 py-3 align-middle text-xs text-ink-muted">
                {formatDateTime(a.detectedAt)}
              </td>
              <td className="px-4 py-3 align-middle text-right">
                <Link
                  href={`/anomalies/${a.id}`}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Investigate →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function readSortValue(a: AnomalyListItem, key: SortKey): string | number {
  switch (key) {
    case 'meterId':
      return a.meterId;
    case 'type':
      return a.type;
    case 'severity':
      return SEVERITY_RANK[a.severity] ?? 0;
    case 'priority':
      return PRIORITY_RANK[a.priority] ?? 0;
    case 'deviationPercent':
      return Math.abs(a.deviationPercent);
    case 'confidence':
      return a.confidence;
    case 'detectedAt':
      return new Date(a.detectedAt).getTime();
  }
}

interface ThProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: 'asc' | 'desc';
  numeric?: boolean;
}

function Th({ children, onClick, active, dir, numeric }: ThProps) {
  return (
    <th
      onClick={onClick}
      className={
        'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-muted ' +
        (onClick ? 'cursor-pointer select-none hover:text-ink ' : '') +
        (numeric ? 'text-right ' : '')
      }
    >
      {children}
      {active ? (
        <span className="ml-1 text-ink-subtle">{dir === 'asc' ? '▲' : '▼'}</span>
      ) : null}
    </th>
  );
}
