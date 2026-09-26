import { Module } from '@nestjs/common';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PrismaMeterRepository, PrismaReadingRepository, PrismaAnomalyRepository],
})
export class DashboardModule {}
