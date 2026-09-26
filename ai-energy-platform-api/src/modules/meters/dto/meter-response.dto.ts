export interface MeterListItem {
  code: string;
  status: string;
  readingsCount: number;
  eventsCount: number;
  /** Total consumption across all readings (kWh). */
  totalConsumptionKwh: number;
  /**
   * Relative variation of consumption (max - min) / avg.
   * `0` when avg is 0 (no readings).
   */
  variation: number;
}

export interface MeterDetailResponse {
  code: string;
  status: string;
  createdAt: string;
  summary: {
    totalKwh: number;
    averageKwh: number;
    minKwh: number;
    maxKwh: number;
    readingsCount: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
  };
  eventsCount: number;
}
