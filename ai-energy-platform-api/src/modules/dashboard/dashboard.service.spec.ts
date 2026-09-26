import { DashboardService } from './dashboard.service';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';

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

function makeAnomalyRepo(opts: { total: number; high: number }): PrismaAnomalyRepository {
  return {
    count: jest.fn(async (filter: { priority?: string }) =>
      filter.priority === 'HIGH' ? opts.high : opts.total,
    ),
  } as unknown as PrismaAnomalyRepository;
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
    expect(summary.analysisStatus).toBe('READY');
  });

  it('returns real anomaly counts after Phase 2', async () => {
    const service = new DashboardService(
      makeMeterRepo(Array.from({ length: 12 }, (_, i) => `M-${String(101 + i).padStart(3, '0')}`)),
      makeReadingRepo({ total: 1000 }),
      makeAnomalyRepo({ total: 4, high: 2 }),
    );

    const summary = await service.getSummary();

    expect(summary.totalMeters).toBe(12);
    expect(summary.totalAnomalies).toBe(4);
    expect(summary.highPriorityAnomalies).toBe(2);
    expect(summary.analysisStatus).toBe('READY');
  });
});
