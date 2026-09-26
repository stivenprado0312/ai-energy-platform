import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MeterEvent, MeterEventRepository } from '../domain/evidence.types';

@Injectable()
export class PrismaEventRepository implements MeterEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMeter(meterId: string): Promise<MeterEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: { meterId },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      meterId: r.meterId,
      timestamp: r.timestamp,
      type: r.type,
      description: r.description,
    }));
  }
}
