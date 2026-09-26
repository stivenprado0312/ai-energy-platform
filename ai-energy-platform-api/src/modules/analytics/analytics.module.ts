import { Module } from '@nestjs/common';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnomaliesService } from './anomalies.service';
import { PrismaAnomalyRepository } from './infrastructure/prisma-anomaly.repository';
import { PrismaEventRepository } from './infrastructure/prisma-event.repository';
import { PrismaMeterReadingRepository } from './infrastructure/prisma-meter-reading.repository';
import { METER_EVENT_REPOSITORY, METER_READING_REPOSITORY } from './analytics.tokens';

@Module({
  imports: [AiAnalysisModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnomaliesService,
    PrismaMeterReadingRepository,
    PrismaEventRepository,
    PrismaAnomalyRepository,
    PrismaMeterRepository,
    {
      provide: METER_READING_REPOSITORY,
      useExisting: PrismaMeterReadingRepository,
    },
    {
      provide: METER_EVENT_REPOSITORY,
      useExisting: PrismaEventRepository,
    },
  ],
  exports: [
    AnalyticsService,
    AnomaliesService,
    PrismaAnomalyRepository,
    PrismaMeterReadingRepository,
    PrismaEventRepository,
    METER_READING_REPOSITORY,
    METER_EVENT_REPOSITORY,
  ],
})
export class AnalyticsModule {}
