import { AnalyticsService } from '../../analytics.service';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../fixtures/acceptance.fixture';
import { AnomalyResult } from '../../domain/anomaly';

describe('Acceptance: M-109 (REAL_ANOMALY / HIGH)', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it('produces a REAL_ANOMALY with HIGH severity and HIGH priority', async () => {
    await resetAnomaliesForMeter(fx.anomalies, 'M-109');
    const result: AnomalyResult | null = await analytics.analyzeMeter('M-109');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('REAL_ANOMALY');
    expect(result!.severity).toBe('HIGH');
    expect(result!.priority).toBe('HIGH');
    // The matched event has type UNKNOWN ("No operational event reported")
    // so the classifier routes the deviation to REAL_ANOMALY.
    expect(result!.evidence.noOperationalExplanation).toBe(true);
    expect(result!.evidence.deviation).toBeDefined();
    expect(Math.abs(result!.evidence.deviation!.deviationPct)).toBeGreaterThan(50);
  });
});
