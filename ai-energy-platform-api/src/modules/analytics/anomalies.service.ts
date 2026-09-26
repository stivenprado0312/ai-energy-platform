import { Injectable, NotFoundException } from '@nestjs/common';
import { ValidationError } from '../../shared/errors/validation.error';
import { AnomalyResult } from './domain/anomaly';
import { PrismaAnomalyRepository } from './infrastructure/prisma-anomaly.repository';
import { AnomaliesSummaryResponse } from './dto/anomaly-response.dto';

const METER_ID_PATTERN = /^M-\d{3}$/;
const ALLOWED_TYPES = new Set([
  'REAL_ANOMALY',
  'EXPLAINABLE',
  'FALSE_POSITIVE',
  'DATA_QUALITY',
  'NORMAL',
]);
const ALLOWED_BUCKETS = new Set(['HIGH', 'MEDIUM', 'LOW']);

export interface ListFilter {
  meterId?: string;
  type?: string;
  severity?: string;
  priority?: string;
}

@Injectable()
export class AnomaliesService {
  constructor(private readonly repo: PrismaAnomalyRepository) {}

  async list(filter: ListFilter): Promise<AnomalyResult[]> {
    const clean = sanitize(filter);
    return this.repo.findMany(clean);
  }

  async getById(id: string): Promise<AnomalyResult> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid anomaly id');
    }
    const found = await this.repo.findById(id);
    if (!found) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Anomaly not found: ${id}`,
      });
    }
    return found;
  }

  async listByMeter(meterId: string): Promise<AnomalyResult[]> {
    if (!METER_ID_PATTERN.test(meterId)) {
      throw new ValidationError(`Invalid meter id format: ${meterId}`);
    }
    return this.repo.findMany({ meterId });
  }

  async getSummary(): Promise<AnomaliesSummaryResponse> {
    const all = await this.repo.findMany({});
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const a of all) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
      byPriority[a.priority] = (byPriority[a.priority] ?? 0) + 1;
    }
    return { total: all.length, byType, bySeverity, byPriority };
  }
}

function sanitize(filter: ListFilter): ListFilter {
  const clean: ListFilter = {};
  if (filter.meterId) {
    if (!METER_ID_PATTERN.test(filter.meterId)) {
      throw new ValidationError(`Invalid meter id format: ${filter.meterId}`);
    }
    clean.meterId = filter.meterId;
  }
  if (filter.type) {
    if (!ALLOWED_TYPES.has(filter.type)) {
      throw new ValidationError(`Invalid type: ${filter.type}`);
    }
    clean.type = filter.type;
  }
  if (filter.severity) {
    if (!ALLOWED_BUCKETS.has(filter.severity)) {
      throw new ValidationError(`Invalid severity: ${filter.severity}`);
    }
    clean.severity = filter.severity;
  }
  if (filter.priority) {
    if (!ALLOWED_BUCKETS.has(filter.priority)) {
      throw new ValidationError(`Invalid priority: ${filter.priority}`);
    }
    clean.priority = filter.priority;
  }
  return clean;
}
