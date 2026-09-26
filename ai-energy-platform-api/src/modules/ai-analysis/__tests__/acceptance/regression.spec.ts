import { AiAnalysisService } from '../../ai-analysis.service';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { PrismaAnomalyRepository } from '../../../analytics/infrastructure/prisma-anomaly.repository';
import {
  bootstrapAcceptance,
  shutdownAcceptance,
} from '../../../analytics/__tests__/fixtures/acceptance.fixture';

describe('Regression: AI layer does not change deterministic fields', () => {
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

  beforeEach(async () => {
    await anomalies.deleteAll();
    await analytics.analyzeAll();
  });

  it('type, severity, priority, confidence, and evidence JSON are preserved after explanation', async () => {
    const all = await anomalies.findMany({});
    expect(all.length).toBe(4);

    for (const a of all) {
      const snapshot = {
        type: a.type,
        severity: a.severity,
        priority: a.priority,
        confidence: a.confidence,
        evidence: a.evidence,
      };
      await ai.explainAnomaly(a.id);
      const after = await anomalies.findById(a.id);
      expect(after!.type).toBe(snapshot.type);
      expect(after!.severity).toBe(snapshot.severity);
      expect(after!.priority).toBe(snapshot.priority);
      expect(after!.confidence).toBe(snapshot.confidence);
      expect(after!.evidence).toEqual(snapshot.evidence);
      // AI columns are now populated.
      expect(after!.aiExplanation).not.toBeNull();
      expect(after!.recommendedAction).not.toBeNull();
    }
  });

  it('re-generating the explanation overwrites only the AI columns', async () => {
    const m109 = (await anomalies.findMany({ meterId: 'M-109' }))[0];
    const before = { ...m109 };
    await ai.explainAnomaly(m109.id);
    await ai.explainAnomaly(m109.id);
    const after = await anomalies.findById(m109.id);
    expect(after!.type).toBe(before.type);
    expect(after!.severity).toBe(before.severity);
    expect(after!.priority).toBe(before.priority);
    expect(after!.confidence).toBe(before.confidence);
    expect(after!.evidence).toEqual(before.evidence);
    expect(after!.aiExplanation).not.toBeNull();
  });
});
