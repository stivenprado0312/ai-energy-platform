import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ValidationError } from '../../shared/errors/validation.error';
import { PrismaMeterRepository } from './infrastructure/prisma-meter.repository';
import { MeterDetailResponse, MeterListItem } from './dto/meter-response.dto';

const METER_ID_PATTERN = /^M-\d{3}$/;

@Injectable()
export class MetersService {
  constructor(private readonly meters: PrismaMeterRepository) {}

  async listAll(): Promise<MeterListItem[]> {
    const all = await this.meters.findAll();
    const items: MeterListItem[] = [];
    for (const m of all) {
      const summary = await this.meters.getConsumptionSummary(m.code);
      const eventsCount = await this.meters.countEvents(m.code);
      items.push({
        code: m.code,
        status: m.status,
        readingsCount: summary.readingsCount,
        eventsCount,
      });
    }
    return items;
  }

  async getDetail(meterId: string): Promise<MeterDetailResponse> {
    this.validateMeterId(meterId);
    const meter = await this.meters.findByCode(meterId);
    if (!meter) {
      throw new NotFoundError('Meter', meterId);
    }
    const summary = await this.meters.getConsumptionSummary(meter.code);
    const eventsCount = await this.meters.countEvents(meter.code);
    return {
      code: meter.code,
      status: meter.status,
      createdAt: meter.createdAt.toISOString(),
      summary: {
        totalKwh: this.round(summary.totalKwh, 3),
        averageKwh: this.round(summary.averageKwh, 3),
        minKwh: this.round(summary.minKwh, 3),
        maxKwh: this.round(summary.maxKwh, 3),
        readingsCount: summary.readingsCount,
        firstTimestamp: summary.firstTimestamp ? summary.firstTimestamp.toISOString() : null,
        lastTimestamp: summary.lastTimestamp ? summary.lastTimestamp.toISOString() : null,
      },
      eventsCount,
    };
  }

  private validateMeterId(id: string): void {
    if (!METER_ID_PATTERN.test(id)) {
      throw new ValidationError(`Invalid meter id format: ${id}`);
    }
  }

  private round(n: number, decimals: number): number {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }
}
