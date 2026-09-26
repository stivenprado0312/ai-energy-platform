// Types mirror the NestJS DTOs in ai-energy-platform-api.
// Keep these in sync with the backend's response shapes.

export const SEVERITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const PRIORITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const ANOMALY_TYPE = {
  REAL_ANOMALY: 'REAL_ANOMALY',
  EXPLAINABLE: 'EXPLAINABLE',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  DATA_QUALITY: 'DATA_QUALITY',
  NORMAL: 'NORMAL',
} as const;
export type AnomalyType = (typeof ANOMALY_TYPE)[keyof typeof ANOMALY_TYPE];

export interface DashboardSummary {
  totalMeters: number;
  totalConsumptionKwh: number;
  totalAnomalies: number;
  highPriorityAnomalies: number;
  /**
   * Average of `confidence` across the persisted anomalies.
   * `null` when there are no anomalies.
   */
  aggregatedConfidence: number | null;
  lastReadingAt: string | null;
  analysisStatus: 'NOT_RUN' | 'READY' | 'PENDING_PHASE_2' | string;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MeterListItem {
  code: string;
  status: string;
  readingsCount: number;
  eventsCount: number;
  totalConsumptionKwh: number;
  variation: number;
}

export interface MeterSummary {
  totalKwh: number;
  averageKwh: number;
  minKwh: number;
  maxKwh: number;
  readingsCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
}

export interface MeterDetail {
  code: string;
  status: string;
  createdAt: string;
  summary: MeterSummary;
  eventsCount: number;
}

export interface MeterEvent {
  id: string;
  meterId: string;
  timestamp: string;
  type: string;
  description: string;
}

export interface MeterReadingsResponse {
  meterId: string;
  readings: Reading[];
}

export interface Reading {
  id: string;
  meterId: string;
  timestamp: string;
  consumptionKwh: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  status: string;
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
  baseline: {
    meanKwh: number;
    stdKwh: number;
    sampleSize: number;
    sourceWindowStart: string | null;
    sourceWindowEnd: string | null;
    hourlyMeanKwh: number[];
  };
  deviation?: {
    start: string;
    end: string;
    durationHours: number;
    baselineMean: number;
    observedMean: number;
    deviationPct: number;
    maxZScore: number;
    spikeCount: number;
  };
  spikes: { timestamp: string; zScore: number; consumptionKwh: number }[];
  outliers: {
    voltage: number;
    powerFactor: number;
    current: number;
    total: number;
  };
  consistency: {
    ratioMean: number;
    ratioStd: number;
    ratioMin: number;
    ratioMax: number;
    noisy: boolean;
    shifted: boolean;
  };
  dataQuality: {
    score: number;
    voltageOutlierRate: number;
    pfOutlierRate: number;
    currentOutlierRate: number;
    ratioNoise: number;
  };
  matchedEvent?: MatchedEvent;
  candidateWindowSize: number;
  noOperationalExplanation: boolean;
}

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

export interface AnomalyDetail extends AnomalyListItem {
  evidence: AnalyticsEvidence;
  aiExplanation: string | null;
  recommendedAction: string | null;
}

export interface AnomaliesSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface AnomalyExplanationsForMeter {
  meterId: string;
  generated: number;
  failed: number;
  results: AiExplanationResponse[];
}

export interface AiExplanationResponse {
  anomalyId: string;
  meterId: string;
  anomalyType: string;
  severity: string;
  priority: string;
  confidence: number;
  summary: string;
  whyItMatters: string;
  evidence: string[];
  recommendation: string;
  generatedAt: string;
}
