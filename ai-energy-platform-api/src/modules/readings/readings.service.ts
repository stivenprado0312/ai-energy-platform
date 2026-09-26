import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ValidationError } from '../../shared/errors/validation.error';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { ReadingResponse } from './dto/reading-response.dto';
import { PrismaReadingRepository } from './infrastructure/prisma-reading.repository';

const METER_ID_PATTERN = /^M-\d{3}$/;
const MAX_LIMIT = 5000;

@Injectable()
export class ReadingsService {
  constructor(
    private readonly readings: PrismaReadingRepository,
    private readonly meters: PrismaMeterRepository,
  ) {}

  async listByMeter(
    meterId: string,
    options: { from?: Date; to?: Date; limit?: number } = {},
  ): Promise<ReadingResponse[]> {
    this.validateMeterId(meterId);
    const meter = await this.meters.findByCode(meterId);
    if (!meter) {
      throw new NotFoundError('Meter', meterId);
    }

    let domain;
    if (options.from && options.to) {
      domain = await this.readings.findByMeterInRange(meterId, options.from, options.to);
    } else if (options.limit !== undefined) {
      const limit = this.clampLimit(options.limit);
      domain = await this.readings.findByMeter(meterId, limit);
    } else {
      domain = await this.readings.findByMeter(meterId);
    }

    return domain.map((r) => ({
      id: r.id,
      meterId: r.meterId,
      timestamp: r.timestamp.toISOString(),
      consumptionKwh: r.consumptionKwh,
      voltageV: r.voltageV,
      currentA: r.currentA,
      powerFactor: r.powerFactor,
      status: r.status,
    }));
  }

  private validateMeterId(id: string): void {
    if (!METER_ID_PATTERN.test(id)) {
      throw new ValidationError(`Invalid meter id format: ${id}`);
    }
  }

  private clampLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError(`Invalid limit: ${limit}`);
    }
    return Math.min(Math.floor(limit), MAX_LIMIT);
  }
}
