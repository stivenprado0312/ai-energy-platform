import { AiAnalysisService } from '../../ai-analysis.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { PrismaAnomalyRepository } from '../../../analytics/infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../../../analytics/__tests__/fixtures/acceptance.fixture';

describe('Acceptance: M-112 explanation', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;
  let ai: AiAnalysisService;
  let anomalies: PrismaAnomalyRepository;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
    ai = fx.ai;
    anomalies = fx.anomalies;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it('produces a DATA_QUALITY explanation recommending sensor review and keeps HIGH', async () => {
    await resetAnomaliesForMeter(anomalies, 'M-112');
    const analyzed = await analytics.analyzeMeter('M-112');
    expect(analyzed).not.toBeNull();

    const out = await ai.explainAnomaly(analyzed!.id);

    expect(out.anomalyType).toBe('DATA_QUALITY');
    expect(out.severity).toBe('HIGH');
    expect(out.priority).toBe('HIGH');
    expect(out.recommendation.toLowerCase()).toMatch(/sensor|calibration|wiring/);
    // Should explicitly warn against trusting the consumption figures.
    expect(out.whyItMatters.toLowerCase()).toContain('unreliable');

    // Regression.
    const persisted = await anomalies.findById(analyzed!.id);
    expect(persisted!.type).toBe('DATA_QUALITY');
    expect(persisted!.severity).toBe('HIGH');
  });
});
