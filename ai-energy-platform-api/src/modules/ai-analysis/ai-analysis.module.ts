import { Module } from '@nestjs/common';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { AI_EXPLANATION_PROVIDER } from './ai-analysis.tokens';
import { StubAiExplanationProvider } from './infrastructure/stub-ai-explanation.provider';

@Module({
  controllers: [AiAnalysisController],
  providers: [
    AiAnalysisService,
    StubAiExplanationProvider,
    PrismaAnomalyRepository,
    PrismaMeterRepository,
    {
      provide: AI_EXPLANATION_PROVIDER,
      useExisting: StubAiExplanationProvider,
    },
  ],
  exports: [AiAnalysisService, AI_EXPLANATION_PROVIDER],
})
export class AiAnalysisModule {}
