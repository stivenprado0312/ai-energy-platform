import { AnalyticsService } from '../../analytics.service';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../fixtures/acceptance.fixture';
import { AnomalyResult } from '../../domain/anomaly';

describe('Acceptance: M-106 (FALSE_POSITIVE / LOW)', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it('produces a FALSE_POSITIVE anomaly with LOW severity during the outage', async () => {
    await resetAnomaliesForMeter(fx.anomalies, 'M-106');
    const result: AnomalyResult | null = await analytics.analyzeMeter('M-106');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('FALSE_POSITIVE');
    expect(result!.severity).toBe('LOW');
    expect(result!.evidence.matchedEvent?.type).toBe('SCHEDULED_OUTAGE');
    expect(result!.evidence.deviation).toBeDefined();
    expect(result!.evidence.deviation!.deviationPct).toBeLessThan(0);
  });
});
