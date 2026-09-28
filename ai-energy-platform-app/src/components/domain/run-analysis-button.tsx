'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';

export interface RunAnalysisResult {
  anomaliesCount: number;
  requiringAttention: number;
}

interface RunAnalysisButtonProps {
  /** When omitted, the button runs the global analysis (all meters). */
  meterId?: string;
  /** Optional callback invoked after a successful run. */
  onResult?: (result: RunAnalysisResult) => void;
}

export function RunAnalysisButton({ meterId, onResult }: RunAnalysisButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RunAnalysisResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = meterId
        ? await apiClient.analyzeMeter(meterId)
        : await apiClient.analyzeAll();
      const result: RunAnalysisResult = {
        anomaliesCount: response.anomalies.length,
        requiringAttention: response.requiringAttention,
      };
      setSuccess(result);
      onResult?.(result);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not run analysis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const label = loading
    ? 'Running analysis…'
    : meterId
      ? `Run AI Analysis for ${meterId}`
      : 'Run AI Analysis';

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} loading={loading}>
        {label}
      </Button>
      {success ? (
        <span
          className="text-xs text-ink-muted"
          data-testid="run-analysis-success"
          role="status"
        >
          {success.anomaliesCount} anomal
          {success.anomaliesCount === 1 ? 'ía' : 'ías'} detectada
          {success.anomaliesCount === 1 ? '' : 's'}
          {success.requiringAttention > 0
            ? ` · ${success.requiringAttention} requieren atención prioritaria`
            : ''}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
