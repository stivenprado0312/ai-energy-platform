'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import type { AiExplanationResponse } from '@/lib/types';
import { apiClient, ApiError } from '@/lib/api-client';

interface Props {
  anomalyId: string;
  existing: AiExplanationResponse | null;
  onGenerated?: (explanation: AiExplanationResponse) => void;
}

export function AiExplanationPanel({ anomalyId, existing, onGenerated }: Props) {
  const [explanation, setExplanation] = useState<AiExplanationResponse | null>(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await apiClient.generateExplanation(anomalyId);
      setExplanation(out);
      onGenerated?.(out);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate explanation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="AI explanation"
        subtitle="AI-generated text from the deterministic evidence above. Does not change the verdict."
        actions={
          explanation ? (
            <Button variant="secondary" loading={loading} onClick={generate}>
              Regenerate
            </Button>
          ) : null
        }
      />
      <CardBody>
        {explanation ? (
          <div className="space-y-4">
            <Block title="Summary">{explanation.summary}</Block>
            <Block title="Why it matters">{explanation.whyItMatters}</Block>
            <Block title="Evidence">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {explanation.evidence.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </Block>
            <Block title="Recommended action">
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-ink">
                {explanation.recommendation}
              </span>
            </Block>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              No AI explanation has been generated yet. The explanation is built from the
              structured evidence that the analytics engine already produced — it will not
              change the type, severity, or priority.
            </p>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <Button loading={loading} onClick={generate}>
              Generate explanation
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </div>
  );
}
