import { MeterEvent, Reading } from './reading';

export type { MeterEvent, Reading } from './reading';

export interface Baseline {
  meanKwh: number;
  stdKwh: number;
  sampleSize: number;
  sourceWindowStart: string | null;
  sourceWindowEnd: string | null;
  /** Per-hour-of-day mean consumption (24 values, UTC hours). */
  hourlyMeanKwh: number[];
}

export interface DeviationWindow {
  start: string;
  end: string;
  durationHours: number;
  baselineMean: number;
  observedMean: number;
  /** Signed: positive = consumption rose, negative = consumption dropped. */
  deviationPct: number;
  /** Max absolute z-score observed inside the window. */
  maxZScore: number;
  /** Number of spike-hours detected inside the window. */
  spikeCount: number;
}

export interface Spike {
  timestamp: string;
  zScore: number;
  consumptionKwh: number;
}

export interface OutlierCounters {
  voltage: number;
  powerFactor: number;
  current: number;
  total: number;
}

export interface ConsistencyReport {
  ratioMean: number;
  ratioStd: number;
  ratioMin: number;
  ratioMax: number;
  /** True when the ratio spread is wider than the configured threshold. */
  noisy: boolean;
  /** True when the mean ratio drifts far from 1.0. */
  shifted: boolean;
}

export interface DataQualityReport {
  /** 0..1 deterministic score combining outlier rate and ratio noise. */
  score: number;
  voltageOutlierRate: number;
  pfOutlierRate: number;
  currentOutlierRate: number;
  ratioNoise: number;
}

export interface MatchedEvent {
  id: string;
  meterId: string;
  timestamp: string;
  type: string;
  description: string;
}

export interface AnalyticsEvidence {
  meterId: string;
  baseline: Baseline;
  /** Present when a sustained deviation was detected. */
  deviation?: DeviationWindow;
  spikes: Spike[];
  outliers: OutlierCounters;
  consistency: ConsistencyReport;
  dataQuality: DataQualityReport;
  matchedEvent?: MatchedEvent;
  /** Number of readings in the candidate window. */
  candidateWindowSize: number;
  /** True if no operational event was found within the deviation window. */
  noOperationalExplanation: boolean;
}

export interface MeterReadingRepository {
  findByMeter(meterId: string): Promise<Reading[]>;
  findByMeterInRange(meterId: string, from: Date, to: Date): Promise<Reading[]>;
}

export interface MeterEventRepository {
  findByMeter(meterId: string): Promise<MeterEvent[]>;
}
