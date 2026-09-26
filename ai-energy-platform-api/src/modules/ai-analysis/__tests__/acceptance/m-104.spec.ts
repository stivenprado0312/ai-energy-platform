import { AiAnalysisService } from '../../ai-analysis.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { PrismaAnomalyRepository } from '../../../analytics/infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  resetAnomaliesForMeter,
  shutdownAcceptance,
} from '../../../analytics/__tests__/fixtures/acceptance.fixture';

describe('Acceptance: M-104 explanation', () => {
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

  it('produces an EXPLAINABLE explanation mentioning the OPERATIONAL_CHANGE event and keeps MEDIUM severity', async () => {
    await resetAnomaliesForMeter(anomalies, 'M-104');
    const analyzed = await analytics.analyzeMeter('M-104');
    expect(analyzed).not.toBeNull();
    expect(analyzed!.type).toBe('EXPLAINABLE');
    expect(analyzed!.severity).toBe('MEDIUM');
    const beforeType = analyzed!.type;
    const beforeSeverity = analyzed!.severity;
    const beforePriority = analyzed!.priority;
    const beforeConfidence = analyzed!.confidence;
    const beforeEvidence = analyzed!.evidence;

    const out = await ai.explainAnomaly(analyzed!.id);

    expect(out.anomalyType).toBe('EXPLAINABLE');
    expect(out.severity).toBe('MEDIUM');
    expect(out.priority).toBe('MEDIUM');
    const joined = [out.summary, out.whyItMatters, ...out.evidence, out.recommendation]
      .join(' ')
      .toLowerCase();
    expect(joined).toContain('operational_change');
    expect(joined).toContain('new production line');

    // Regression: type/severity/priority/confidence unchanged.
    const persisted = await anomalies.findById(analyzed!.id);
    expect(persisted!.type).toBe(beforeType);
    expect(persisted!.severity).toBe(beforeSeverity);
    expect(persisted!.priority).toBe(beforePriority);
    expect(persisted!.confidence).toBe(beforeConfidence);
    expect(persisted!.evidence).toEqual(beforeEvidence);
    // AI columns are now populated.
    expect(persisted!.aiExplanation).not.toBeNull();
    expect(persisted!.recommendedAction).not.toBeNull();
  });
});
