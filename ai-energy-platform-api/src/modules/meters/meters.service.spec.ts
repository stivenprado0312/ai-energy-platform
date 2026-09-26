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

interface ListSummaryRecord {
  totalKwh: number;
  minKwh: number;
  maxKwh: number;
  avgKwh: number;
  readingsCount: number;
}

interface DetailSummaryRecord {
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
  listSummaries: Map<string, ListSummaryRecord>;
  detailSummaries: Map<string, DetailSummaryRecord>;
  events: Map<string, number>;
} {
  const meters = new Map<string, MeterRecord>();
  const listSummaries = new Map<string, ListSummaryRecord>();
  const detailSummaries = new Map<string, DetailSummaryRecord>();
  const events = new Map<string, number>();

  const repo = {
    findAll: jest.fn(async () => Array.from(meters.values())),
    findByCode: jest.fn(async (code: string) => meters.get(code) ?? null),
    getConsumptionSummary: jest.fn(async (code: string) => {
      const s = detailSummaries.get(code);
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
    getListSummaries: jest.fn(async () => {
      const map = new Map<string, ListSummaryRecord>();
      for (const [code, s] of listSummaries) map.set(code, s);
      return map;
    }),
    countEvents: jest.fn(async (code: string) => events.get(code) ?? 0),
  } as unknown as PrismaMeterRepository;

  return { repo, meters, listSummaries, detailSummaries, events };
}

function primeMeter(
  ctx: {
    meters: Map<string, MeterRecord>;
    listSummaries: Map<string, ListSummaryRecord>;
    detailSummaries: Map<string, DetailSummaryRecord>;
    events: Map<string, number>;
  },
  code: string,
  eventCount = 0,
  listSummary: Partial<ListSummaryRecord> = {},
  detailSummary: Partial<DetailSummaryRecord> = {},
): void {
  ctx.meters.set(code, {
    id: `id-${code}`,
    code,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T00:00:00Z'),
  });
  ctx.listSummaries.set(code, {
    totalKwh: 1000,
    minKwh: 10,
    maxKwh: 100,
    avgKwh: 50,
    readingsCount: 336,
    ...listSummary,
  });
  ctx.detailSummaries.set(code, {
    total: 1000,
    avg: 50,
    min: 10,
    max: 100,
    count: 336,
    first: new Date('2026-09-01T00:00:00Z'),
    last: new Date('2026-09-14T23:00:00Z'),
    ...detailSummary,
  });
  ctx.events.set(code, eventCount);
}

describe('MetersService', () => {
  describe('listAll', () => {
    it('returns the list of meters with summary, consumption, variation and event count', async () => {
      const ctx = buildFakeRepo();
      primeMeter(ctx, 'M-101', 0, { totalKwh: 1000, minKwh: 10, maxKwh: 100, avgKwh: 50, readingsCount: 336 });
      primeMeter(ctx, 'M-102', 1, { totalKwh: 2000, minKwh: 20, maxKwh: 200, avgKwh: 100, readingsCount: 336 });
      const service = new MetersService(ctx.repo);

      const result = await service.listAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        code: 'M-101',
        status: 'ACTIVE',
        readingsCount: 336,
        eventsCount: 0,
        totalConsumptionKwh: 1000,
        variation: (100 - 10) / 50,
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
