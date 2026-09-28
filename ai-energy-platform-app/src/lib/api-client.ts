import type {
  AiExplanationResponse,
  AnomaliesSummary,
  AnomalyDetail,
  AnomalyExplanationsForMeter,
  AnomalyListItem,
  DashboardSummary,
  MeterDetail,
  MeterEvent,
  MeterListItem,
  MeterReadingsResponse,
  Reading,
} from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3000';

function getBaseUrl(): string {
  // Same default as the build-time constant; read on demand so tests
  // can monkey-patch the value.
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return DEFAULT_BASE_URL;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', `Could not reach ${url}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const body = (payload ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      res.status,
      body.code ?? `HTTP_${res.status}`,
      body.message ?? `Request failed: ${res.status}`,
      payload,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const apiClient = {
  getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary');
  },

  listMeters(): Promise<MeterListItem[]> {
    return request<MeterListItem[]>('/meters');
  },

  getMeter(meterId: string): Promise<MeterDetail> {
    return request<MeterDetail>(`/meters/${encodeURIComponent(meterId)}`);
  },

  getMeterReadings(
    meterId: string,
    options: { from?: string; to?: string; limit?: number } = {},
  ): Promise<Reading[]> {
    const params = new URLSearchParams();
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    const qs = params.toString();
    const suffix = qs ? `?${qs}` : '';
    return request<Reading[]>(`/meters/${encodeURIComponent(meterId)}/readings${suffix}`);
  },

  getMeterEvents(meterId: string): Promise<MeterEvent[]> {
    // Backend does not expose /meters/:id/events directly; events
    // surface via the anomaly detail. We expose this client method
    // anyway for forward compatibility.
    return request<MeterEvent[]>(`/meters/${encodeURIComponent(meterId)}/events`);
  },

  listAnomalies(filter: {
    meterId?: string;
    type?: string;
    severity?: string;
    priority?: string;
  } = {}): Promise<AnomalyListItem[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) {
      if (v) params.set(k, String(v));
    }
    const qs = params.toString();
    return request<AnomalyListItem[]>(`/anomalies${qs ? `?${qs}` : ''}`);
  },

  getAnomaliesSummary(): Promise<AnomaliesSummary> {
    return request<AnomaliesSummary>('/anomalies/summary');
  },

  getAnomaly(id: string): Promise<AnomalyDetail> {
    return request<AnomalyDetail>(`/anomalies/${encodeURIComponent(id)}`);
  },

  listAnomaliesByMeter(meterId: string): Promise<AnomalyListItem[]> {
    return request<AnomalyListItem[]>(
      `/meters/${encodeURIComponent(meterId)}/anomalies`,
    );
  },

  analyzeAll(): Promise<{ anomalies: AnomalyListItem[]; metersAnalyzed: number; explanationsGenerated: number; skippedMeters: number; requiringAttention: number }> {
    return request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ explain: true }),
    });
  },

  analyzeMeter(meterId: string): Promise<{ anomalies: AnomalyListItem[]; metersAnalyzed: number; skippedMeters: number; requiringAttention: number }> {
    return request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ meterId, explain: true }),
    });
  },

  generateExplanation(id: string): Promise<AiExplanationResponse> {
    return request<AiExplanationResponse>(
      `/anomalies/${encodeURIComponent(id)}/explanation`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  },

  generateExplanationsForMeter(meterId: string): Promise<AnomalyExplanationsForMeter> {
    return request<AnomalyExplanationsForMeter>(
      `/meters/${encodeURIComponent(meterId)}/anomalies/explanations`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  },
};

export { getBaseUrl };

// Re-export type for callers that want a single import surface.
export type { Reading };
