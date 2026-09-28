'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';
import { EvidencePanel } from '@/components/domain/evidence-panel';
import { AiExplanationPanel } from '@/components/domain/ai-explanation-panel';
import { RelatedEventCard } from '@/components/domain/related-event-card';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { useAsync } from '@/lib/hooks/use-async';
import { apiClient, ApiError } from '@/lib/api-client';
import { formatDateTime, formatKwh, formatPercent } from '@/lib/format';
import type { AnomalyDetail, AiExplanationResponse } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnomalyDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [triggeredNotFound, setTriggeredNotFound] = useState(false);
  const { data, status, error, refetch } = useAsync<AnomalyDetail>(
    () => apiClient.getAnomaly(id),
    [id],
  );
  const [explanation, setExplanation] = useState<AiExplanationResponse | null>(null);

  useEffect(() => {
    if (status === 'ready' && !data) {
      setTriggeredNotFound(true);
    } else if (status === 'error' && error instanceof ApiError && error.status === 404) {
      setTriggeredNotFound(true);
    } else {
      setTriggeredNotFound(false);
    }
  }, [status, data, error]);

  if (triggeredNotFound) {
    notFound();
  }

  if (status === 'loading') return <LoadingBlock rows={6} />;
  if (status === 'error' && error && !(error instanceof ApiError && error.status === 404)) {
    return (
      <ErrorState
        description={error.message ?? 'Could not load anomaly.'}
        onRetry={refetch}
      />
    );
  }
  if (status === 'error' || !data) {
    notFound();
  }

  const live = explanation
    ? {
        ...data,
        aiExplanation: [
          data.aiExplanation ?? '',
          '',
          'SUMMARY',
          explanation.summary,
          '',
          'WHY IT MATTERS',
          explanation.whyItMatters,
          '',
          'EVIDENCE',
          ...explanation.evidence.map((b) => `- ${b}`),
          '',
          'RECOMMENDED ACTION',
          explanation.recommendation,
        ]
          .filter(Boolean)
          .join('\n'),
        recommendedAction: explanation.recommendation,
      }
    : data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/anomalies"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"
        >
          ← Back to anomalies
        </Link>
      </div>

      <p
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase tracking-wide text-slate-600"
        data-testid="deterministic-verdict-banner"
      >
        Deterministic verdict — produced by the analytics engine
      </p>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono text-lg">{live.meterId}</span>
              <TypeBadge value={live.type} />
              <SeverityBadge value={live.severity} />
              <SeverityBadge value={live.priority} />
            </span>
          }
          subtitle={
            <span>
              Anomaly detected {formatDateTime(live.detectedAt)} · window{' '}
              {formatDateTime(live.windowStart)} → {formatDateTime(live.windowEnd)}
            </span>
          }
          actions={
            <Link
              href={`/meters/${live.meterId}`}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Open meter →
            </Link>
          }
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Baseline" value={formatKwh(live.baselineKwh)} />
            <Stat label="Observed" value={formatKwh(live.observedKwh)} />
            <Stat label="Deviation" value={formatPercent(live.deviationPercent)} />
            <Stat
              label="Confidence"
              value={`${(live.confidence * 100).toFixed(0)}%`}
            />
            <Stat label="Priority" value={live.priority} />
          </div>
        </CardBody>
      </Card>

      <p
        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs uppercase tracking-wide text-blue-700"
        data-testid="ai-explanation-banner"
      >
        AI explanation — generated from the deterministic evidence above
      </p>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AiExplanationPanel
          anomalyId={live.id}
          existing={explanation}
          onGenerated={setExplanation}
        />
        <RecommendationCard anomaly={live} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvidencePanel evidence={live.evidence} />
        <div className="space-y-4">
          {live.evidence.matchedEvent ? (
            <RelatedEventCard event={live.evidence.matchedEvent} />
          ) : (
            <Card>
              <CardHeader title="Operational event" />
              <CardBody>
                <p className="text-sm text-ink-muted">
                  No operational event from the dataset coincides with the deviation.
                  This anomaly is uncorrelated with any known event.
                </p>
              </CardBody>
            </Card>
          )}
          <Narrative interpretation={live} />
        </div>
      </section>
    </div>
  );
}

function RecommendationCard({ anomaly }: { anomaly: AnomalyDetail }) {
  const recommendation = anomaly.recommendedAction;
  const headline =
    anomaly.type === 'REAL_ANOMALY'
      ? 'Investigate operation and equipment'
      : anomaly.type === 'EXPLAINABLE'
        ? 'Validate the operational event'
        : anomaly.type === 'FALSE_POSITIVE'
          ? 'No escalation required'
          : anomaly.type === 'DATA_QUALITY'
            ? 'Review sensor and calibration'
            : 'Standard monitoring';
  return (
    <Card>
      <CardHeader title="Recommended action" subtitle="From the AI explanation layer." />
      <CardBody>
        <p className="text-sm font-semibold text-ink">{headline}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {recommendation ?? 'No recommendation generated yet.'}
        </p>
      </CardBody>
    </Card>
  );
}

function Narrative({ interpretation }: { interpretation: AnomalyDetail }) {
  const e = interpretation.evidence;
  let body: string;
  if (interpretation.type === 'EXPLAINABLE' && e.matchedEvent) {
    body = `The deviation coincides with the operational event "${
      e.matchedEvent.description
    }" (${e.matchedEvent.type} at ${formatDateTime(
      e.matchedEvent.timestamp,
    )}). The evidence is consistent with a planned operational change rather than an uncontrolled anomaly.`;
  } else if (interpretation.type === 'FALSE_POSITIVE' && e.matchedEvent) {
    body = `The deviation coincides with a known scheduled outage (${e.matchedEvent.type} at ${formatDateTime(
      e.matchedEvent.timestamp,
    )}). Treat as a known benign event; no escalation required.`;
  } else if (interpretation.type === 'DATA_QUALITY') {
    body = `Consumption is stable but electrical readings are inconsistent (data-quality score ${e.dataQuality.score.toFixed(2)}). The reported consumption may not reflect real consumption until the sensor is validated.`;
  } else {
    const d = e.deviation;
    body = `The deviation (${d?.deviationPct.toFixed(1) ?? 'n/a'}%, sustained ${
      d?.durationHours ?? 0
    } h) has no operational event that explains it. ${
      e.consistency.shifted
        ? 'Electrical ratios show a measurable shift.'
        : e.consistency.noisy
          ? 'Electrical readings are noisy.'
          : ''
    } Treat as an active investigation.`;
  }
  return (
    <Card>
      <CardHeader title="What is happening?" subtitle="Plain-language interpretation." />
      <CardBody>
        <p className="text-sm leading-relaxed text-ink">{body}</p>
      </CardBody>
    </Card>
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
