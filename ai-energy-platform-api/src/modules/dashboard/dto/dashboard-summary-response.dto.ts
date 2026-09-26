export interface DashboardSummaryResponse {
  totalMeters: number;
  totalConsumptionKwh: number;
  totalAnomalies: number;
  highPriorityAnomalies: number;
  lastReadingAt: string | null;
  analysisStatus: 'NOT_RUN' | 'READY' | 'PENDING_PHASE_2';
  periodStart: string | null;
  periodEnd: string | null;
}
