import { AiAnalysisService } from '../../ai-analysis.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { PrismaAnomalyRepository } from '../../../analytics/infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../../../analytics/__tests__/fixtures/acceptance.fixture';

describe('Acceptance: M-106 explanation', () => {
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

  it('produces a FALSE_POSITIVE explanation mentioning the SCHEDULED_OUTAGE and keeps LOW severity', async () => {
    await resetAnomaliesForMeter(anomalies, 'M-106');
    const analyzed = await analytics.analyzeMeter('M-106');
    expect(analyzed).not.toBeNull();
    const beforeType = analyzed!.type;
    const beforeSeverity = analyzed!.severity;
    const beforePriority = analyzed!.priority;
    const beforeConfidence = analyzed!.confidence;

    const out = await ai.explainAnomaly(analyzed!.id);

    expect(out.anomalyType).toBe('FALSE_POSITIVE');
    expect(out.severity).toBe('LOW');
    expect(out.priority).toBe('LOW');
    const joined = [out.summary, out.whyItMatters, ...out.evidence, out.recommendation]
      .join(' ')
      .toLowerCase();
    expect(joined).toContain('scheduled_outage');
    expect(out.recommendation.toLowerCase()).toContain('do not escalate');

    // Regression.
    const persisted = await anomalies.findById(analyzed!.id);
    expect(persisted!.type).toBe(beforeType);
    expect(persisted!.severity).toBe(beforeSeverity);
    expect(persisted!.priority).toBe(beforePriority);
    expect(persisted!.confidence).toBe(beforeConfidence);
  });
});
