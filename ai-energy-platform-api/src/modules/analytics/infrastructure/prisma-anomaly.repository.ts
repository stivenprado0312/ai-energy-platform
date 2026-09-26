import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AnomalyResult } from '../domain/anomaly';

@Injectable()
export class PrismaAnomalyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AnomalyResult | null> {
    const row = await this.prisma.anomaly.findUnique({ where: { id } });
    if (!row) return null;
    return this.toResult(row);
  }

  async findMany(filter: {
    meterId?: string;
    type?: string;
    severity?: string;
    priority?: string;
  }): Promise<AnomalyResult[]> {
    const where: Prisma.AnomalyWhereInput = {};
    if (filter.meterId) where.meterId = filter.meterId;
    if (filter.type) where.type = filter.type;
    if (filter.severity) where.severity = filter.severity;
    if (filter.priority) where.priority = filter.priority;
    const rows = await this.prisma.anomaly.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { confidence: 'desc' }, { detectedAt: 'desc' }],
    });
    return rows.map((r) => this.toResult(r));
  }

  async count(filter: {
    type?: string;
    severity?: string;
    priority?: string;
  }): Promise<number> {
    const where: Prisma.AnomalyWhereInput = {};
    if (filter.type) where.type = filter.type;
    if (filter.severity) where.severity = filter.severity;
    if (filter.priority) where.priority = filter.priority;
    return this.prisma.anomaly.count({ where });
  }

  async deleteAllForMeter(meterId: string): Promise<number> {
    const result = await this.prisma.anomaly.deleteMany({ where: { meterId } });
    return result.count;
  }

  async deleteAll(): Promise<number> {
    const result = await this.prisma.anomaly.deleteMany({});
    return result.count;
  }

  async create(result: AnomalyResult): Promise<AnomalyResult> {
    const row = await this.prisma.anomaly.create({
      data: {
        meterId: result.meterId,
        type: result.type,
        severity: result.severity,
        confidence: result.confidence,
        priority: result.priority,
        detectedAt: new Date(result.detectedAt),
        windowStart: new Date(result.windowStart),
        windowEnd: new Date(result.windowEnd),
        baselineKwh: result.baselineKwh,
        observedKwh: result.observedKwh,
        deviationPercent: result.deviationPercent,
        relatedEventId: result.relatedEventId ?? null,
        evidence: result.evidence as unknown as Prisma.InputJsonValue,
        aiExplanation: null,
        recommendedAction: null,
      },
    });
    return this.toResult(row);
  }

  private toResult(row: {
    id: string;
    meterId: string;
    type: string;
    severity: string;
    confidence: number;
    priority: string;
    detectedAt: Date;
    windowStart: Date;
    windowEnd: Date;
    baselineKwh: number;
    observedKwh: number;
    deviationPercent: number;
    relatedEventId: string | null;
    evidence: unknown;
    aiExplanation: string | null;
    recommendedAction: string | null;
  }): AnomalyResult {
    return {
      id: row.id,
      meterId: row.meterId,
      type: row.type as AnomalyResult['type'],
      severity: row.severity as AnomalyResult['severity'],
      confidence: row.confidence,
      priority: row.priority as AnomalyResult['priority'],
      detectedAt: row.detectedAt.toISOString(),
      windowStart: row.windowStart.toISOString(),
      windowEnd: row.windowEnd.toISOString(),
      baselineKwh: row.baselineKwh,
      observedKwh: row.observedKwh,
      deviationPercent: row.deviationPercent,
      relatedEventId: row.relatedEventId,
      evidence: row.evidence as AnomalyResult['evidence'],
    };
  }
}
