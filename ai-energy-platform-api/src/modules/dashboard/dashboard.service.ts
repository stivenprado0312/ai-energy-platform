import { Injectable } from '@nestjs/common';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { DashboardSummaryResponse } from './dto/dashboard-summary-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly meters: PrismaMeterRepository,
    private readonly readings: PrismaReadingRepository,
    private readonly anomalies: PrismaAnomalyRepository,
  ) {}

  async getSummary(): Promise<DashboardSummaryResponse> {
    const allMeters = await this.meters.findAll();
    const range = await this.readings.getDateRange();
    const totalConsumption = await this.readings.getTotalConsumption();

    const [totalAnomalies, highPriorityAnomalies, allAnomalies] = await Promise.all([
      this.anomalies.count({}),
      this.anomalies.count({ priority: 'HIGH' }),
      this.anomalies.findMany({}),
    ]);

    const aggregatedConfidence =
      allAnomalies.length > 0
        ? Math.round(
            (allAnomalies.reduce((acc, a) => acc + a.confidence, 0) / allAnomalies.length) * 1000,
          ) / 1000
        : null;

    return {
      totalMeters: allMeters.length,
      totalConsumptionKwh: Math.round(totalConsumption * 1000) / 1000,
      totalAnomalies,
      highPriorityAnomalies,
      aggregatedConfidence,
      lastReadingAt: range.max ? range.max.toISOString() : null,
      analysisStatus: totalAnomalies > 0 || allMeters.length > 0 ? 'READY' : 'NOT_RUN',
      periodStart: range.min ? range.min.toISOString() : null,
      periodEnd: range.max ? range.max.toISOString() : null,
    };
  }
}
