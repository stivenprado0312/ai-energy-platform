import { NotFoundError } from '../../shared/errors/not-found.error';
import { ValidationError } from '../../shared/errors/validation.error';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from './infrastructure/prisma-reading.repository';
import { ReadingsService } from './readings.service';
import { Reading } from './domain/reading';

const METER_ID = 'M-109';

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: '1',
    meterId: METER_ID,
    timestamp: new Date('2026-09-01T00:00:00Z'),
    consumptionKwh: 23.5,
    voltageV: 220,
    currentA: 100,
    powerFactor: 0.95,
    status: 'OK',
    ...overrides,
  };
}

function makeMeterRepo(exists = true): PrismaMeterRepository {
  return {
    findByCode: jest.fn(async () =>
      exists
        ? { id: 'id', code: METER_ID, status: 'ACTIVE', createdAt: new Date() }
        : null,
    ),
  } as unknown as PrismaMeterRepository;
}

function makeReadingRepo(readings: Reading[]): PrismaReadingRepository {
  return {
    findByMeter: jest.fn(async () => readings),
    findByMeterInRange: jest.fn(async () => readings),
  } as unknown as PrismaReadingRepository;
}

describe('ReadingsService', () => {
  describe('listByMeter', () => {
    it('returns the readings mapped to DTOs', async () => {
      const reading = makeReading();
      const meters = makeMeterRepo(true);
      const repo = makeReadingRepo([reading]);
      const service = new ReadingsService(repo, meters);

      const result = await service.listByMeter(METER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        meterId: METER_ID,
        timestamp: '2026-09-01T00:00:00.000Z',
        consumptionKwh: 23.5,
        voltageV: 220,
        currentA: 100,
        powerFactor: 0.95,
        status: 'OK',
      });
    });

    it('uses range query when both from and to are provided', async () => {
      const meters = makeMeterRepo(true);
      const repo = makeReadingRepo([]);
      const service = new ReadingsService(repo, meters);

      await service.listByMeter(METER_ID, {
        from: new Date('2026-09-01T00:00:00Z'),
        to: new Date('2026-09-02T00:00:00Z'),
      });

      expect(repo.findByMeterInRange).toHaveBeenCalledWith(
        METER_ID,
        new Date('2026-09-01T00:00:00Z'),
        new Date('2026-09-02T00:00:00Z'),
      );
      expect(repo.findByMeter).not.toHaveBeenCalled();
    });

    it('clamps a too-large limit to the configured maximum', async () => {
      const meters = makeMeterRepo(true);
      const repo = makeReadingRepo([]);
      const service = new ReadingsService(repo, meters);

      await service.listByMeter(METER_ID, { limit: 1_000_000 });

      expect(repo.findByMeter).toHaveBeenCalledWith(METER_ID, 5000);
    });

    it('rejects a non-positive limit', async () => {
      const meters = makeMeterRepo(true);
      const repo = makeReadingRepo([]);
      const service = new ReadingsService(repo, meters);

      await expect(service.listByMeter(METER_ID, { limit: 0 })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('throws NotFoundError when the meter does not exist', async () => {
      const meters = makeMeterRepo(false);
      const repo = makeReadingRepo([]);
      const service = new ReadingsService(repo, meters);

      await expect(service.listByMeter('M-999')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ValidationError for a malformed meter id', async () => {
      const meters = makeMeterRepo(true);
      const repo = makeReadingRepo([]);
      const service = new ReadingsService(repo, meters);

      await expect(service.listByMeter('bad-id')).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
