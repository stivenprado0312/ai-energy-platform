import { NotFoundError } from '../../shared/errors/not-found.error';
import { ValidationError } from '../../shared/errors/validation.error';
import { PrismaMeterRepository } from './infrastructure/prisma-meter.repository';
import { MetersService } from './meters.service';

interface MeterRecord {
  id: string;
  code: string;
  status: string;
  createdAt: Date;
}

interface SummaryRecord {
  total: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  first: Date | null;
  last: Date | null;
}

function buildFakeRepo(): {
  repo: PrismaMeterRepository;
  meters: Map<string, MeterRecord>;
  summaries: Map<string, SummaryRecord>;
  events: Map<string, number>;
} {
  const meters = new Map<string, MeterRecord>();
  const summaries = new Map<string, SummaryRecord>();
  const events = new Map<string, number>();

  const repo = {
    findAll: jest.fn(async () => Array.from(meters.values())),
    findByCode: jest.fn(async (code: string) => meters.get(code) ?? null),
    getConsumptionSummary: jest.fn(async (code: string) => {
      const s = summaries.get(code);
      if (!s) {
        return {
          totalKwh: 0,
          averageKwh: 0,
          minKwh: 0,
          maxKwh: 0,
          readingsCount: 0,
          firstTimestamp: null,
          lastTimestamp: null,
        };
      }
      return {
        totalKwh: s.total,
        averageKwh: s.avg,
        minKwh: s.min,
        maxKwh: s.max,
        readingsCount: s.count,
        firstTimestamp: s.first,
        lastTimestamp: s.last,
      };
    }),
    countEvents: jest.fn(async (code: string) => events.get(code) ?? 0),
  } as unknown as PrismaMeterRepository;

  return { repo, meters, summaries, events };
}

function primeMeter(
  ctx: { meters: Map<string, MeterRecord>; summaries: Map<string, SummaryRecord>; events: Map<string, number> },
  code: string,
  eventCount = 0,
  summary: Partial<SummaryRecord> = {},
): void {
  ctx.meters.set(code, {
    id: `id-${code}`,
    code,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T00:00:00Z'),
  });
  ctx.summaries.set(code, {
    total: 1000,
    avg: 50,
    min: 10,
    max: 100,
    count: 336,
    first: new Date('2026-09-01T00:00:00Z'),
    last: new Date('2026-09-14T23:00:00Z'),
    ...summary,
  });
  ctx.events.set(code, eventCount);
}

describe('MetersService', () => {
  describe('listAll', () => {
    it('returns the list of meters with summary and event count', async () => {
      const ctx = buildFakeRepo();
      primeMeter(ctx, 'M-101', 0);
      primeMeter(ctx, 'M-102', 1);
      const service = new MetersService(ctx.repo);

      const result = await service.listAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        code: 'M-101',
        status: 'ACTIVE',
        readingsCount: 336,
        eventsCount: 0,
      });
      expect(result[1].eventsCount).toBe(1);
    });

    it('returns an empty array when there are no meters', async () => {
      const ctx = buildFakeRepo();
      const service = new MetersService(ctx.repo);

      expect(await service.listAll()).toEqual([]);
    });
  });

  describe('getDetail', () => {
    it('returns the detail of an existing meter', async () => {
      const ctx = buildFakeRepo();
      primeMeter(ctx, 'M-109', 1);
      const service = new MetersService(ctx.repo);

      const detail = await service.getDetail('M-109');

      expect(detail.code).toBe('M-109');
      expect(detail.summary.readingsCount).toBe(336);
      expect(detail.eventsCount).toBe(1);
      expect(detail.summary.totalKwh).toBeCloseTo(1000);
    });

    it('throws NotFoundError for a missing meter', async () => {
      const ctx = buildFakeRepo();
      const service = new MetersService(ctx.repo);

      await expect(service.getDetail('M-999')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ValidationError for a malformed meter id', async () => {
      const ctx = buildFakeRepo();
      const service = new MetersService(ctx.repo);

      await expect(service.getDetail('bad-id')).rejects.toBeInstanceOf(ValidationError);
      await expect(service.getDetail('m-101')).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
