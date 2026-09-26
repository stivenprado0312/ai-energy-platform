import { Injectable } from '@nestjs/common';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { DashboardSummaryResponse } from './dto/dashboard-summary-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly meters: PrismaMeterRepository,
    private readonly readings: PrismaReadingRepository,
  ) {}

  async getSummary(): Promise<DashboardSummaryResponse> {
    const allMeters = await this.meters.findAll();
    const range = await this.readings.getDateRange();
    const totalConsumption = await this.readings.getTotalConsumption();

    return {
      totalMeters: allMeters.length,
      totalConsumptionKwh: Math.round(totalConsumption * 1000) / 1000,
      totalAnomalies: 0,
      highPriorityAnomalies: 0,
      lastReadingAt: range.max ? range.max.toISOString() : null,
      analysisStatus: 'PENDING_PHASE_2',
      periodStart: range.min ? range.min.toISOString() : null,
      periodEnd: range.max ? range.max.toISOString() : null,
    };
  }
}
