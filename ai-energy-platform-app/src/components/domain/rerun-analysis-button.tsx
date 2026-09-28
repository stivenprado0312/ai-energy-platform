'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export function RerunAnalysisButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.analyzeAll();
      router.push('/anomalies');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not re-run analysis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={run} loading={loading}>
        Re-run analysis for all meters
      </Button>
      {error ? (
        <span className="text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
