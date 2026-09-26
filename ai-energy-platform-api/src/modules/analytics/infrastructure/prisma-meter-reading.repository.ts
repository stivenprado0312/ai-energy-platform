import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MeterReadingRepository, Reading } from '../domain/evidence.types';

@Injectable()
export class PrismaMeterReadingRepository implements MeterReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMeter(meterId: string): Promise<Reading[]> {
    const rows = await this.prisma.reading.findMany({
      where: { meterId },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id.toString(),
      meterId: r.meterId,
      timestamp: r.timestamp,
      consumptionKwh: r.consumptionKwh,
      voltageV: r.voltageV,
      currentA: r.currentA,
      powerFactor: r.powerFactor,
      status: r.status,
    }));
  }

  async findByMeterInRange(meterId: string, from: Date, to: Date): Promise<Reading[]> {
    const rows = await this.prisma.reading.findMany({
      where: { meterId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id.toString(),
      meterId: r.meterId,
      timestamp: r.timestamp,
      consumptionKwh: r.consumptionKwh,
      voltageV: r.voltageV,
      currentA: r.currentA,
      powerFactor: r.powerFactor,
      status: r.status,
    }));
  }
}
