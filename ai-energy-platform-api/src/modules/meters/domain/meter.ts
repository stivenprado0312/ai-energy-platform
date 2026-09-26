import { MeterStatus } from '../../../shared/constants/domain.constants';

export interface Meter {
  id: string;
  code: string;
  status: MeterStatus | string;
  createdAt: Date;
}

export interface MeterConsumptionSummary {
  totalKwh: number;
  averageKwh: number;
  minKwh: number;
  maxKwh: number;
  readingsCount: number;
  firstTimestamp: Date | null;
  lastTimestamp: Date | null;
}
