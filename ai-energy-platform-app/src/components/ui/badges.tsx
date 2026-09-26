import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Severity, AnomalyType, Priority } from '@/lib/types';

const SEVERITY_STYLES: Record<Severity, string> = {
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const TYPE_STYLES: Record<AnomalyType, string> = {
  REAL_ANOMALY: 'bg-red-50 text-red-700 ring-red-200',
  EXPLAINABLE: 'bg-blue-50 text-blue-700 ring-blue-200',
  FALSE_POSITIVE: 'bg-slate-100 text-slate-700 ring-slate-200',
  DATA_QUALITY: 'bg-amber-50 text-amber-700 ring-amber-200',
  NORMAL: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const TYPE_LABEL: Record<AnomalyType, string> = {
  REAL_ANOMALY: 'Real anomaly',
  EXPLAINABLE: 'Explainable',
  FALSE_POSITIVE: 'False positive',
  DATA_QUALITY: 'Data quality',
  NORMAL: 'Normal',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: 'High priority',
  MEDIUM: 'Medium priority',
  LOW: 'Low priority',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const ICON: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: '!',
  MEDIUM: '~',
  LOW: '·',
};

export function SeverityBadge({ value }: { value: string }) {
  const style = SEVERITY_STYLES[value as Severity] ?? SEVERITY_STYLES.LOW;
  const label = SEVERITY_LABEL[value as Severity] ?? value;
  const icon = ICON[value as Severity] ?? '·';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style,
      )}
    >
      <span aria-hidden className="text-[10px] font-bold">
        {icon}
      </span>
      {label}
    </span>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const style = PRIORITY_STYLES[value as Priority] ?? PRIORITY_STYLES.LOW;
  const label = PRIORITY_LABEL[value as Priority] ?? value;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style,
      )}
    >
      {label}
    </span>
  );
}

export function TypeBadge({ value }: { value: string }) {
  const style = TYPE_STYLES[value as AnomalyType] ?? TYPE_STYLES.NORMAL;
  const label = TYPE_LABEL[value as AnomalyType] ?? value;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style,
      )}
    >
      {label}
    </span>
  );
}

export function MetricPill({
  label,
  value,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <span className="text-base font-semibold text-ink">{value}</span>
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}
