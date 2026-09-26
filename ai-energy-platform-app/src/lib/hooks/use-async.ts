'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api-client';

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: undefined; error: ApiError };

export interface UseAsyncResult<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | undefined;
  error: ApiError | null;
  refetch: () => void;
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: undefined,
    error: null,
  });
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: undefined, error: null });
    loader()
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ready', data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const apiErr =
          err instanceof ApiError
            ? err
            : new ApiError(0, 'UNKNOWN', (err as Error).message ?? 'Unknown error');
        setState({ status: 'error', data: undefined, error: apiErr });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    refetch,
  };
}
