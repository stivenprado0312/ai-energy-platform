import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../../analytics.service';
import { PrismaAnomalyRepository } from '../../infrastructure/prisma-anomaly.repository';
import { PrismaEventRepository } from '../../infrastructure/prisma-event.repository';
import { PrismaMeterReadingRepository } from '../../infrastructure/prisma-meter-reading.repository';
import { PrismaMeterRepository } from '../../../../modules/meters/infrastructure/prisma-meter.repository';
import { AppModule } from '../../../../app.module';
import { HttpExceptionFilter } from '../../../../shared/filters/http-exception.filter';

export interface AcceptanceFixture {
  app: INestApplication;
  analytics: AnalyticsService;
  anomalies: PrismaAnomalyRepository;
}

export async function bootstrapAcceptance(): Promise<AcceptanceFixture> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return {
    app,
    analytics: moduleRef.get(AnalyticsService),
    anomalies: moduleRef.get(PrismaAnomalyRepository),
  };
}

export async function resetAnomaliesForMeter(
  anomalies: PrismaAnomalyRepository,
  meterId: string,
): Promise<void> {
  await anomalies.deleteAllForMeter(meterId);
}

export async function shutdownAcceptance(fx: AcceptanceFixture): Promise<void> {
  await fx.app.close();
}

/** Re-export for convenience. */
export { PrismaAnomalyRepository, PrismaEventRepository, PrismaMeterReadingRepository, PrismaMeterRepository };
