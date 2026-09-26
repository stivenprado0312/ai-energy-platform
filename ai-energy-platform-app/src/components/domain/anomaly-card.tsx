'use client';

import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { formatKwh, formatPercent, formatDateTime } from '@/lib/format';
import type { AnomalyListItem } from '@/lib/types';

interface Props {
  anomaly: AnomalyListItem;
  href?: string;
}

export function AnomalyCard({ anomaly, href }: Props) {
  const target = href ?? `/anomalies/${anomaly.id}`;
  return (
    <Link
      href={target}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{anomaly.meterId}</span>
              <TypeBadge value={anomaly.type} />
              <SeverityBadge value={anomaly.severity} />
            </div>
          }
          subtitle={
            <span className="block">
              Detected {formatDateTime(anomaly.detectedAt)}
            </span>
          }
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Baseline">{formatKwh(anomaly.baselineKwh)}</Field>
            <Field label="Observed">{formatKwh(anomaly.observedKwh)}</Field>
            <Field label="Deviation">
              <span className="font-mono">
                {formatPercent(anomaly.deviationPercent)}
              </span>
            </Field>
            <Field label="Confidence">
              <span className="font-mono">
                {(anomaly.confidence * 100).toFixed(0)}%
              </span>
            </Field>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{children}</div>
    </div>
  );
}
