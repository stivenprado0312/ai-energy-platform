'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';

export function RunAnalysisButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.analyzeAll();
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not run analysis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={run} loading={loading}>
        Run analysis
      </Button>
      {error ? (
        <span className="text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
