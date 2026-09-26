import { AiAnalysisService } from '../../ai-analysis.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { PrismaAnomalyRepository } from '../../../analytics/infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../../../analytics/__tests__/fixtures/acceptance.fixture';

describe('Acceptance: M-109 explanation', () => {
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

  it('produces a REAL_ANOMALY explanation with electrical evidence + no operational event, keeps HIGH', async () => {
    await resetAnomaliesForMeter(anomalies, 'M-109');
    const analyzed = await analytics.analyzeMeter('M-109');
    expect(analyzed).not.toBeNull();
    const beforeEvidence = analyzed!.evidence;

    const out = await ai.explainAnomaly(analyzed!.id);

    expect(out.anomalyType).toBe('REAL_ANOMALY');
    expect(out.severity).toBe('HIGH');
    expect(out.priority).toBe('HIGH');
    const joined = [out.summary, out.whyItMatters, ...out.evidence, out.recommendation]
      .join(' ')
      .toLowerCase();
    expect(joined).toContain('no operational event');
    // The shifted electrical ratio should be surfaced as evidence.
    expect(joined).toMatch(/shift|noisy/);

    // Regression.
    const persisted = await anomalies.findById(analyzed!.id);
    expect(persisted!.evidence).toEqual(beforeEvidence);
    expect(persisted!.type).toBe('REAL_ANOMALY');
    expect(persisted!.severity).toBe('HIGH');
  });
});
