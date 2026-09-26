import { AnomalyResult } from '../domain/anomaly';

export interface AnomalyListItem {
  id: string;
  meterId: string;
  type: string;
  severity: string;
  confidence: number;
  priority: string;
  detectedAt: string;
  windowStart: string;
  windowEnd: string;
  baselineKwh: number;
  observedKwh: number;
  deviationPercent: number;
  relatedEventId: string | null;
}

export interface AnomalyDetailResponse extends AnomalyListItem {
  evidence: AnomalyResult['evidence'];
  aiExplanation: string | null;
  recommendedAction: string | null;
}

export interface AnalyzeResponse {
  status: 'DONE';
  anomalies: AnomalyListItem[];
  /** Number of meters that produced no anomaly (NORMAL). */
  skippedMeters: number;
  analyzedMeters: number;
}

export interface AnomaliesSummaryResponse {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
}
