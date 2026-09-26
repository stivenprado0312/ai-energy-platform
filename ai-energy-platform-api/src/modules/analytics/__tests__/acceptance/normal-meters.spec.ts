import { AnalyticsService } from '../../analytics.service';
import { PrismaAnomalyRepository } from '../../infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../fixtures/acceptance.fixture';

describe('Normal meters do not produce spurious anomalies', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;
  let anomalies: PrismaAnomalyRepository;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
    anomalies = fx.anomalies;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it.each(['M-101', 'M-102', 'M-103', 'M-105', 'M-107', 'M-108', 'M-110', 'M-111'])(
    '%s does not generate an anomaly record',
    async (meterId) => {
      await resetAnomaliesForMeter(anomalies, meterId);
      const result = await analytics.analyzeMeter(meterId);
      expect(result).toBeNull();
      const persisted = await anomalies.findMany({ meterId });
      expect(persisted).toHaveLength(0);
    },
  );
});
