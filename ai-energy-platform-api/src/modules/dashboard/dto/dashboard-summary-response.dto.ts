export interface DashboardSummaryResponse {
  totalMeters: number;
  totalConsumptionKwh: number;
  totalAnomalies: number;
  highPriorityAnomalies: number;
  /**
   * Average confidence across the currently persisted anomalies.
   * `null` when there are no anomalies to aggregate over.
   * Important: this is the *anomaly* confidence produced by the
   * deterministic engine, not a score produced by the AI provider.
   */
  aggregatedConfidence: number | null;
  lastReadingAt: string | null;
  analysisStatus: 'NOT_RUN' | 'READY' | 'PENDING_PHASE_2';
  periodStart: string | null;
  periodEnd: string | null;
}
