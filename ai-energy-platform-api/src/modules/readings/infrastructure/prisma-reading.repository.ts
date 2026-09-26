import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Reading } from '../domain/reading';

@Injectable()
export class PrismaReadingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMeter(
    meterId: string,
    limit?: number,
  ): Promise<Reading[]> {
    const rows = await this.prisma.reading.findMany({
      where: { meterId },
      orderBy: { timestamp: 'asc' },
      ...(limit !== undefined ? { take: limit } : {}),
    });
    return rows.map(this.toDomain);
  }

  async findByMeterInRange(
    meterId: string,
    from: Date,
    to: Date,
  ): Promise<Reading[]> {
    const rows = await this.prisma.reading.findMany({
      where: {
        meterId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map(this.toDomain);
  }

  async getDateRange(): Promise<{ min: Date | null; max: Date | null }> {
    const result = await this.prisma.reading.aggregate({
      _min: { timestamp: true },
      _max: { timestamp: true },
    });
    return { min: result._min.timestamp, max: result._max.timestamp };
  }

  async getTotalConsumption(where?: Prisma.ReadingWhereInput): Promise<number> {
    const result = await this.prisma.reading.aggregate({
      ...(where ? { where } : {}),
      _sum: { consumptionKwh: true },
    });
    return result._sum.consumptionKwh ?? 0;
  }

  async count(where?: Prisma.ReadingWhereInput): Promise<number> {
    return this.prisma.reading.count({ ...(where ? { where } : {}) });
  }

  private toDomain(r: {
    id: bigint;
    meterId: string;
    timestamp: Date;
    consumptionKwh: number;
    voltageV: number;
    currentA: number;
    powerFactor: number;
    status: string;
  }): Reading {
    return {
      id: r.id.toString(),
      meterId: r.meterId,
      timestamp: r.timestamp,
      consumptionKwh: r.consumptionKwh,
      voltageV: r.voltageV,
      currentA: r.currentA,
      powerFactor: r.powerFactor,
      status: r.status,
    };
  }
}
