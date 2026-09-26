import { AnalyticsService } from '../../analytics.service';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../fixtures/acceptance.fixture';
import { AnomalyResult } from '../../domain/anomaly';

describe('Acceptance: M-104 (EXPLAINABLE / MEDIUM)', () => {
  let fx: Awaited<ReturnType<typeof bootstrapAcceptance>>;
  let analytics: AnalyticsService;

  beforeAll(async () => {
    fx = await bootstrapAcceptance();
    analytics = fx.analytics;
  });

  afterAll(async () => {
    await shutdownAcceptance(fx);
  });

  it('produces an EXPLAINABLE anomaly with MEDIUM severity', async () => {
    await resetAnomaliesForMeter(fx.anomalies, 'M-104');
    const result: AnomalyResult | null = await analytics.analyzeMeter('M-104');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('EXPLAINABLE');
    expect(result!.severity).toBe('MEDIUM');
    expect(result!.evidence.matchedEvent?.type).toBe('OPERATIONAL_CHANGE');
    expect(result!.evidence.deviation).toBeDefined();
    expect(result!.evidence.deviation!.durationHours).toBeGreaterThan(12);
    expect(result!.evidence.dataQuality.score).toBeLessThan(0.5);
  });
});
