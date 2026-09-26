import { AnalyticsService } from '../../analytics.service';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../fixtures/acceptance.fixture';
import { AnomalyResult } from '../../domain/anomaly';

describe('Acceptance: M-112 (DATA_QUALITY / HIGH)', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it('produces a DATA_QUALITY anomaly with HIGH severity from electrical inconsistency', async () => {
    await resetAnomaliesForMeter(fx.anomalies, 'M-112');
    const result: AnomalyResult | null = await analytics.analyzeMeter('M-112');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('DATA_QUALITY');
    expect(result!.severity).toBe('HIGH');
    expect(result!.evidence.dataQuality.score).toBeGreaterThanOrEqual(0.5);
    // Consumption is stable, so there should be no deviation window.
    expect(result!.evidence.deviation).toBeUndefined();
  });
});
