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
  /** Number of AI explanations generated when `explain: true` was passed. */
  explanationsGenerated: number;
  /**
   * Number of anomalies in this response that have HIGH severity
   * or HIGH priority. Lets the UI display messages like
   * "4 anomalies detected · 2 require priority attention".
   */
  requiringAttention: number;
}

export interface AnomaliesSummaryResponse {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
}
