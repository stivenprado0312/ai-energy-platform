import { DashboardService } from './dashboard.service';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';

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

describe('DashboardService', () => {
  it('returns zeros for anomalies and high priority (Phase 1 contract)', async () => {
    const service = new DashboardService(
      makeMeterRepo(['M-101', 'M-102']),
      makeReadingRepo({ total: 12345.678 }),
    );

    const summary = await service.getSummary();

    expect(summary.totalMeters).toBe(2);
    expect(summary.totalConsumptionKwh).toBeCloseTo(12345.678);
    expect(summary.totalAnomalies).toBe(0);
    expect(summary.highPriorityAnomalies).toBe(0);
    expect(summary.analysisStatus).toBe('PENDING_PHASE_2');
    expect(summary.periodStart).toBeNull();
    expect(summary.periodEnd).toBeNull();
    expect(summary.lastReadingAt).toBeNull();
  });

  it('maps date range and last reading timestamp', async () => {
    const start = new Date('2026-09-01T00:00:00Z');
    const end = new Date('2026-09-14T23:00:00Z');
    const service = new DashboardService(
      makeMeterRepo(Array.from({ length: 12 }, (_, i) => `M-${String(101 + i).padStart(3, '0')}`)),
      makeReadingRepo({ total: 1000, min: start, max: end }),
    );

    const summary = await service.getSummary();

    expect(summary.totalMeters).toBe(12);
    expect(summary.periodStart).toBe('2026-09-01T00:00:00.000Z');
    expect(summary.periodEnd).toBe('2026-09-14T23:00:00.000Z');
    expect(summary.lastReadingAt).toBe('2026-09-14T23:00:00.000Z');
  });
});
