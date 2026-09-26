import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { formatDateTime, formatDurationHours, formatKwh, formatNumber, formatPercent } from '@/lib/format';
import type { AnalyticsEvidence } from '@/lib/types';

export function EvidencePanel({ evidence }: { evidence: AnalyticsEvidence }) {
  const { baseline, deviation, consistency, dataQuality, outliers, matchedEvent } = evidence;
  return (
    <Card>
      <CardHeader
        title="Evidence"
        subtitle="All numbers below come from the deterministic analytics engine."
      />
      <CardBody className="space-y-5">
        <Section title="Baseline">
          <Field label="Mean" value={formatKwh(baseline.meanKwh, 2)} />
          <Field label="Std dev" value={formatKwh(baseline.stdKwh, 2)} />
          <Field label="Samples" value={String(baseline.sampleSize)} />
        </Section>

        {deviation ? (
          <Section title="Persistent deviation">
            <Field label="Window" value={formatDurationHours(deviation.durationHours)} />
            <Field label="Baseline mean" value={formatKwh(deviation.baselineMean, 2)} />
            <Field label="Observed mean" value={formatKwh(deviation.observedMean, 2)} />
            <Field label="Deviation" value={formatPercent(deviation.deviationPct)} />
            <Field label="Max z-score" value={formatNumber(deviation.maxZScore, 2)} />
            <Field label="Spikes" value={String(deviation.spikeCount)} />
          </Section>
        ) : (
          <p className="rounded-lg border border-dashed border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink-muted">
            No sustained consumption deviation was detected for this meter.
          </p>
        )}

        <Section title="Electrical consistency">
          <Field
            label="Ratio mean"
            value={formatNumber(consistency.ratioMean, 3)}
            hint="V · I · PF / kWh"
          />
          <Field label="Ratio std" value={formatNumber(consistency.ratioStd, 3)} />
          <Field
            label="Status"
            value={consistency.shifted ? 'Shifted' : consistency.noisy ? 'Noisy' : 'Stable'}
            hint={consistency.shifted ? 'Electrical ratio drifts from 1.0' : undefined}
          />
        </Section>

        <Section title="Outliers">
          <Field label="Voltage" value={String(outliers.voltage)} />
          <Field label="Power factor" value={String(outliers.powerFactor)} />
          <Field label="Current" value={String(outliers.current)} />
        </Section>

        <Section title="Data quality">
          <Field
            label="Score"
            value={formatNumber(dataQuality.score, 2)}
            hint={dataQuality.score >= 0.5 ? 'Above DATA_QUALITY threshold' : 'Within tolerance'}
          />
          <Field label="Voltage outlier rate" value={formatPercent(dataQuality.voltageOutlierRate * 100)} />
          <Field label="PF outlier rate" value={formatPercent(dataQuality.pfOutlierRate * 100)} />
        </Section>

        {matchedEvent ? (
          <Section title="Operational event correlation">
            <Field label="Event type" value={matchedEvent.type} />
            <Field label="Timestamp" value={formatDateTime(matchedEvent.timestamp)} />
            <Field label="Description" value={matchedEvent.description} />
          </Section>
        ) : (
          <p className="rounded-lg border border-dashed border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink-muted">
            No operational event from the dataset coincides with the deviation window.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-md bg-surface-muted px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{value}</div>
      {hint ? <div className="text-xs text-ink-muted">{hint}</div> : null}
    </div>
  );
}
