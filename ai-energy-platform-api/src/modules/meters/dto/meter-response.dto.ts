export interface MeterListItem {
  code: string;
  status: string;
  readingsCount: number;
  eventsCount: number;
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
