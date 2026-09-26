import { AnalyticsEvidence } from '../../analytics/domain/evidence.types';
import { StubAiExplanationProvider } from './stub-ai-explanation.provider';

function makeEvidence(over: Partial<AnalyticsEvidence> = {}): AnalyticsEvidence {
  return {
    meterId: 'M-109',
    baseline: {
      meanKwh: 43.7,
      stdKwh: 7.6,
      sampleSize: 278,
      sourceWindowStart: '2026-09-01T00:00:00Z',
      sourceWindowEnd: '2026-09-12T13:00:00Z',
      hourlyMeanKwh: new Array(24).fill(43.7),
    },
    deviation: {
      start: '2026-09-12T14:00:00Z',
      end: '2026-09-14T23:00:00Z',
      durationHours: 58,
      baselineMean: 43.7,
      observedMean: 92.77,
      deviationPct: 112.3,
      maxZScore: 8.2,
      spikeCount: 0,
    },
    spikes: [],
    outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
    consistency: { ratioMean: 0.72, ratioStd: 0.04, ratioMin: 0.7, ratioMax: 0.75, noisy: false, shifted: true },
    dataQuality: { score: 0.05, voltageOutlierRate: 0, pfOutlierRate: 0, currentOutlierRate: 0, ratioNoise: 0.04 },
    matchedEvent: undefined,
    candidateWindowSize: 58,
    noOperationalExplanation: true,
    ...over,
  };
}

describe('StubAiExplanationProvider', () => {
  const provider = new StubAiExplanationProvider();

  describe('determinism', () => {
    it('produces byte-identical output for identical input', async () => {
      const input = {
        meterId: 'M-109',
        anomalyType: 'REAL_ANOMALY' as const,
        severity: 'HIGH' as const,
        priority: 'HIGH',
        confidence: 0.9,
        evidence: makeEvidence(),
        relatedEvent: undefined,
      };
      const a = await provider.explain(input);
      const b = await provider.explain(input);
      expect(a).toEqual(b);
    });
  });

  describe('no fabricated data', () => {
    it('does not mention values that are not in the evidence', async () => {
      const output = await provider.explain({
        meterId: 'M-XXX',
        anomalyType: 'REAL_ANOMALY',
        severity: 'HIGH',
        priority: 'HIGH',
        confidence: 0.9,
        evidence: makeEvidence(),
        relatedEvent: undefined,
      });
      const joined = [output.summary, output.whyItMatters, ...output.evidence, output.recommendation]
        .join('\n')
        .toLowerCase();
      // The stub should only mention the meter id passed in, not invent
      // numbers or other meter ids.
      expect(joined).toContain('m-xxx');
      expect(joined).not.toContain('m-109');
      expect(joined).not.toContain('undefined');
    });
  });

  describe('REAL_ANOMALY', () => {
    it('mentions the absence of an operational event', async () => {
      const output = await provider.explain({
        meterId: 'M-109',
        anomalyType: 'REAL_ANOMALY',
        severity: 'HIGH',
        priority: 'HIGH',
        confidence: 0.95,
        evidence: makeEvidence(),
        relatedEvent: undefined,
      });
      const joined = output.evidence.join(' ').toLowerCase();
      expect(joined).toContain('no operational event');
      expect(joined).toContain('112');
    });
    it('recommends prioritised inspection for HIGH severity', async () => {
      const output = await provider.explain({
        meterId: 'M-109',
        anomalyType: 'REAL_ANOMALY',
        severity: 'HIGH',
        priority: 'HIGH',
        confidence: 0.95,
        evidence: makeEvidence(),
        relatedEvent: undefined,
      });
      expect(output.recommendation.toLowerCase()).toContain('prioritise');
    });
  });

  describe('EXPLAINABLE', () => {
    it('mentions the matched operational event', async () => {
      const output = await provider.explain({
        meterId: 'M-104',
        anomalyType: 'EXPLAINABLE',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        confidence: 0.75,
        evidence: makeEvidence({ deviation: {
          start: '2026-09-11T00:00:00Z',
          end: '2026-09-14T23:00:00Z',
          durationHours: 96,
          baselineMean: 48.7,
          observedMean: 71.5,
          deviationPct: 47,
          maxZScore: 5,
          spikeCount: 0,
        } }),
        relatedEvent: {
          id: 'evt-1',
          meterId: 'M-104',
          timestamp: '2026-09-11T00:00:00Z',
          type: 'OPERATIONAL_CHANGE',
          description: 'New production line activated',
        },
      });
      const joined = output.evidence.join(' ').toLowerCase();
      expect(joined).toContain('operational_change');
      expect(joined).toContain('new production line');
    });
  });

  describe('FALSE_POSITIVE', () => {
    it('mentions the SCHEDULED_OUTAGE event', async () => {
      const output = await provider.explain({
        meterId: 'M-106',
        anomalyType: 'FALSE_POSITIVE',
        severity: 'LOW',
        priority: 'LOW',
        confidence: 0.75,
        evidence: makeEvidence(),
        relatedEvent: {
          id: 'evt-2',
          meterId: 'M-106',
          timestamp: '2026-09-08T00:00:00Z',
          type: 'SCHEDULED_OUTAGE',
          description: 'Scheduled maintenance outage for 12 hours',
        },
      });
      expect(output.recommendation.toLowerCase()).toContain('do not escalate');
      const joined = output.evidence.join(' ').toLowerCase();
      expect(joined).toContain('scheduled_outage');
    });
  });

  describe('DATA_QUALITY', () => {
    it('recommends reviewing the sensor and warns against trusting consumption', async () => {
      const output = await provider.explain({
        meterId: 'M-112',
        anomalyType: 'DATA_QUALITY',
        severity: 'HIGH',
        priority: 'HIGH',
        confidence: 0.8,
        evidence: makeEvidence({
          dataQuality: { score: 0.7, voltageOutlierRate: 0.33, pfOutlierRate: 0.25, currentOutlierRate: 0, ratioNoise: 0.3 },
          outliers: { voltage: 16, powerFactor: 12, current: 0, total: 28 },
          deviation: undefined,
        }),
        relatedEvent: undefined,
      });
      expect(output.recommendation.toLowerCase()).toMatch(/sensor|calibration|wiring/);
      expect(output.summary.toLowerCase()).toContain('data-quality');
    });
  });

  describe('all fields are populated', () => {
    it('always returns non-empty summary, whyItMatters, evidence list, and recommendation', async () => {
      const cases = [
        'REAL_ANOMALY',
        'EXPLAINABLE',
        'FALSE_POSITIVE',
        'DATA_QUALITY',
        'NORMAL',
      ] as const;
      for (const t of cases) {
        const output = await provider.explain({
          meterId: 'M-XXX',
          anomalyType: t,
          severity: t === 'REAL_ANOMALY' ? 'HIGH' : t === 'DATA_QUALITY' ? 'HIGH' : t === 'EXPLAINABLE' ? 'MEDIUM' : 'LOW',
          priority: t === 'REAL_ANOMALY' ? 'HIGH' : t === 'DATA_QUALITY' ? 'HIGH' : t === 'EXPLAINABLE' ? 'MEDIUM' : 'LOW',
          confidence: 0.7,
          evidence: makeEvidence(),
          relatedEvent: undefined,
        });
        expect(output.summary.length).toBeGreaterThan(10);
        expect(output.whyItMatters.length).toBeGreaterThan(20);
        expect(output.evidence.length).toBeGreaterThan(0);
        expect(output.recommendation.length).toBeGreaterThan(20);
      }
    });
  });
});
