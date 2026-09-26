import { DashboardService } from './dashboard.service';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';
import type { AnomalyResult } from '../analytics/domain/anomaly';

function makeMeterRepo(codes: string[]): PrismaMeterRepository {
  return {
    findAll: jest.fn(async () =>
      codes.map((code) => ({ id: code, code, status: 'ACTIVE', createdAt: new Date() })),
    ),
  } as unknown as PrismaMeterRepository;
}

function makeReadingRepo(opts: {
  total: number;
  min?: Date | null;
  max?: Date | null;
}): PrismaReadingRepository {
  return {
    getDateRange: jest.fn(async () => ({ min: opts.min ?? null, max: opts.max ?? null })),
    getTotalConsumption: jest.fn(async () => opts.total),
  } as unknown as PrismaReadingRepository;
}

function makeAnomalyRepo(opts: {
  total: number;
  high: number;
  anomalies?: AnomalyResult[];
}): PrismaAnomalyRepository {
  const anomalies = opts.anomalies ?? [];
  return {
    count: jest.fn(async (filter: { priority?: string }) =>
      filter.priority === 'HIGH' ? opts.high : opts.total,
    ),
    findMany: jest.fn(async () => anomalies),
  } as unknown as PrismaAnomalyRepository;
}

function makeAnomaly(meterId: string, type: string, severity: string, priority: string, confidence: number): AnomalyResult {
  return {
    id: `id-${meterId}`,
    meterId,
    type: type as AnomalyResult['type'],
    severity: severity as AnomalyResult['severity'],
    priority: priority as AnomalyResult['priority'],
    confidence,
    detectedAt: new Date().toISOString(),
    windowStart: new Date().toISOString(),
    windowEnd: new Date().toISOString(),
    baselineKwh: 0,
    observedKwh: 0,
    deviationPercent: 0,
    relatedEventId: null,
    evidence: {
      meterId,
      baseline: { meanKwh: 0, stdKwh: 0, sampleSize: 0, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: [] },
      spikes: [],
      outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
      consistency: { ratioMean: 0, ratioStd: 0, ratioMin: 0, ratioMax: 0, noisy: false, shifted: false },
      dataQuality: { score: 0, voltageOutlierRate: 0, pfOutlierRate: 0, currentOutlierRate: 0, ratioNoise: 0 },
      candidateWindowSize: 0,
      noOperationalExplanation: true,
    },
    aiExplanation: null,
    recommendedAction: null,
  };
}

describe('DashboardService', () => {
  it('returns zeros for anomalies when none exist', async () => {
    const service = new DashboardService(
      makeMeterRepo(['M-101', 'M-102']),
      makeReadingRepo({ total: 12345.678 }),
      makeAnomalyRepo({ total: 0, high: 0 }),
    );

    const summary = await service.getSummary();

    expect(summary.totalMeters).toBe(2);
    expect(summary.totalConsumptionKwh).toBeCloseTo(12345.678);
    expect(summary.totalAnomalies).toBe(0);
    expect(summary.highPriorityAnomalies).toBe(0);
    expect(summary.aggregatedConfidence).toBeNull();
    expect(summary.analysisStatus).toBe('READY');
  });

  it('returns real anomaly counts and aggregated confidence after Phase 2', async () => {
    const anomalies = [
      makeAnomaly('M-104', 'EXPLAINABLE', 'MEDIUM', 'MEDIUM', 0.75),
      makeAnomaly('M-106', 'FALSE_POSITIVE', 'LOW', 'LOW', 0.75),
      makeAnomaly('M-109', 'REAL_ANOMALY', 'HIGH', 'HIGH', 1),
      makeAnomaly('M-112', 'DATA_QUALITY', 'HIGH', 'HIGH', 0.75),
    ];
    const service = new DashboardService(
      makeMeterRepo(Array.from({ length: 12 }, (_, i) => `M-${String(101 + i).padStart(3, '0')}`)),
      makeReadingRepo({ total: 1000 }),
      makeAnomalyRepo({ total: 4, high: 2, anomalies }),
    );

    const summary = await service.getSummary();

    expect(summary.totalMeters).toBe(12);
    expect(summary.totalAnomalies).toBe(4);
    expect(summary.highPriorityAnomalies).toBe(2);
    expect(summary.aggregatedConfidence).toBeCloseTo((0.75 + 0.75 + 1 + 0.75) / 4, 3);
    expect(summary.analysisStatus).toBe('READY');
  });
});
