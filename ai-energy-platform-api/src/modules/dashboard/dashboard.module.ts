import { Module } from '@nestjs/common';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { PrismaReadingRepository } from '../readings/infrastructure/prisma-reading.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PrismaMeterRepository, PrismaReadingRepository],
})
export class DashboardModule {}
