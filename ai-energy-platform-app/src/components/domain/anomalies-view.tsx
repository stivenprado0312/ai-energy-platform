'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnomaliesTable } from './anomalies-table';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient } from '@/lib/api-client';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import type { AnomalyListItem, AnomalyType, Severity, Priority } from '@/lib/types';

const TYPE_OPTIONS: { value: AnomalyType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'REAL_ANOMALY', label: 'Real anomaly' },
  { value: 'EXPLAINABLE', label: 'Explainable' },
  { value: 'FALSE_POSITIVE', label: 'False positive' },
  { value: 'DATA_QUALITY', label: 'Data quality' },
];

const SEVERITY_OPTIONS: { value: Severity | ''; label: string }[] = [
  { value: '', label: 'All severities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const PRIORITY_OPTIONS: { value: Priority | ''; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export function AnomaliesView() {
  const [meter, setMeter] = useState('');
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');

  const filter = {
    meterId: meter || undefined,
    type: type || undefined,
    severity: severity || undefined,
    priority: priority || undefined,
  };

  const { data, status, error, refetch } = useAsync<AnomalyListItem[]>(
    () => apiClient.listAnomalies(filter),
    [meter, type, severity, priority],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <FilterInput
            label="Meter"
            value={meter}
            onChange={setMeter}
            placeholder="e.g. M-109"
          />
          <FilterSelect
            label="Type"
            value={type}
            onChange={setType}
            options={TYPE_OPTIONS}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_OPTIONS}
          />
          <FilterSelect
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            Filters update the list automatically. Use the headers to sort.
          </p>
          <Button variant="ghost" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {status === 'loading' ? <LoadingBlock rows={5} /> : null}
      {status === 'error' ? (
        <ErrorState
          description={error?.message ?? 'Could not load anomalies.'}
          onRetry={refetch}
        />
      ) : null}
      {status === 'ready' ? (
        <AnomaliesTable data={data ?? []} />
      ) : null}
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col text-xs font-medium text-ink-muted">
      <span className="mb-1 uppercase tracking-wide">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
      />
    </label>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | '';
  onChange: (v: T | '') => void;
  options: { value: T | ''; label: string }[];
}) {
  return (
    <label className="flex flex-col text-xs font-medium text-ink-muted">
      <span className="mb-1 uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | '')}
        className="rounded-md border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/30"
      >
        {options.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
