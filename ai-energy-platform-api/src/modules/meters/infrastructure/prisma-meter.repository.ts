import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Meter, MeterConsumptionSummary } from '../domain/meter';

export const METER_REPOSITORY = 'METER_REPOSITORY';

@Injectable()
export class PrismaMeterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Meter[]> {
    const rows = await this.prisma.meter.findMany({ orderBy: { code: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async findByCode(code: string): Promise<Meter | null> {
    const row = await this.prisma.meter.findUnique({ where: { code } });
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  async getConsumptionSummary(meterId: string): Promise<MeterConsumptionSummary> {
    const agg = await this.prisma.reading.aggregate({
      where: { meterId },
      _sum: { consumptionKwh: true },
      _avg: { consumptionKwh: true },
      _min: { consumptionKwh: true, timestamp: true },
      _max: { consumptionKwh: true, timestamp: true },
      _count: { _all: true },
    });

    return {
      totalKwh: agg._sum.consumptionKwh ?? 0,
      averageKwh: agg._avg.consumptionKwh ?? 0,
      minKwh: agg._min.consumptionKwh ?? 0,
      maxKwh: agg._max.consumptionKwh ?? 0,
      readingsCount: agg._count._all,
      firstTimestamp: agg._min.timestamp,
      lastTimestamp: agg._max.timestamp,
    };
  }

  /**
   * Lightweight per-meter consumption summary used by the meters list.
   * Returns totalKwh, minKwh, maxKwh, avgKwh and the actual readings count.
   */
  async getListSummaries(): Promise<
    Map<string, { totalKwh: number; minKwh: number; maxKwh: number; avgKwh: number; readingsCount: number }>
  > {
    const rows = await this.prisma.reading.groupBy({
      by: ['meterId'],
      _sum: { consumptionKwh: true },
      _avg: { consumptionKwh: true },
      _min: { consumptionKwh: true },
      _max: { consumptionKwh: true },
      _count: { _all: true },
    });
    const map = new Map<string, { totalKwh: number; minKwh: number; maxKwh: number; avgKwh: number; readingsCount: number }>();
    for (const r of rows) {
      map.set(r.meterId, {
        totalKwh: r._sum.consumptionKwh ?? 0,
        minKwh: r._min.consumptionKwh ?? 0,
        maxKwh: r._max.consumptionKwh ?? 0,
        avgKwh: r._avg.consumptionKwh ?? 0,
        readingsCount: r._count._all,
      });
    }
    return map;
  }

  async countEvents(meterId: string): Promise<number> {
    return this.prisma.event.count({ where: { meterId } });
  }
}
