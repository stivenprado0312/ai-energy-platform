export const METER_STATUS = {
  ACTIVE: 'ACTIVE',
} as const;

export type MeterStatus = (typeof METER_STATUS)[keyof typeof METER_STATUS];

export const ANOMALY_TYPE = {
  REAL_ANOMALY: 'REAL_ANOMALY',
  EXPLAINABLE: 'EXPLAINABLE',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  DATA_QUALITY: 'DATA_QUALITY',
  NORMAL: 'NORMAL',
} as const;

export type AnomalyType = (typeof ANOMALY_TYPE)[keyof typeof ANOMALY_TYPE];

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

export const READING_STATUS = {
  OK: 'OK',
} as const;

export type ReadingStatus = (typeof READING_STATUS)[keyof typeof READING_STATUS];
