import {
  AnomalyClassifier,
  ConfidenceCalculator,
  PriorityCalculator,
  SeverityCalculator,
} from './anomaly-classifier';
import { AnalyticsEvidence } from '../domain/evidence.types';

function evidence(over: Partial<AnalyticsEvidence>): AnalyticsEvidence {
  return {
    meterId: 'M-XXX',
    baseline: { meanKwh: 50, stdKwh: 5, sampleSize: 200, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: new Array(24).fill(50) },
    deviation: undefined,
    spikes: [],
    outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
    consistency: { ratioMean: 0.95, ratioStd: 0.01, ratioMin: 0.9, ratioMax: 1.0, noisy: false, shifted: false },
    dataQuality: { score: 0, voltageOutlierRate: 0, pfOutlierRate: 0, currentOutlierRate: 0, ratioNoise: 0 },
    matchedEvent: undefined,
    candidateWindowSize: 24,
    noOperationalExplanation: true,
    ...over,
  };
}

describe('AnomalyClassifier', () => {
  const classifier = new AnomalyClassifier();

  it('classifies as DATA_QUALITY when the DQ score exceeds the threshold', () => {
    const e = evidence({ dataQuality: { ...evidence({}).dataQuality, score: 0.9 } });
    expect(classifier.classify(e)).toBe('DATA_QUALITY');
  });

  it('classifies as EXPLAINABLE on OPERATIONAL_CHANGE event', () => {
    const e = evidence({
      matchedEvent: { id: 'x', meterId: 'M-104', timestamp: '2026-09-11T00:00:00Z', type: 'OPERATIONAL_CHANGE', description: '' },
      deviation: {
        start: '2026-09-11T00:00:00Z',
        end: '2026-09-14T23:00:00Z',
        durationHours: 96,
        baselineMean: 48,
        observedMean: 71,
        deviationPct: 47,
        maxZScore: 3,
        spikeCount: 0,
      },
    });
    expect(classifier.classify(e)).toBe('EXPLAINABLE');
  });

  it('classifies as FALSE_POSITIVE on SCHEDULED_OUTAGE event', () => {
    const e = evidence({
      matchedEvent: { id: 'x', meterId: 'M-106', timestamp: '2026-09-08T00:00:00Z', type: 'SCHEDULED_OUTAGE', description: '' },
      deviation: {
        start: '2026-09-08T00:00:00Z',
        end: '2026-09-08T12:00:00Z',
        durationHours: 12,
        baselineMean: 56,
        observedMean: 9,
        deviationPct: -84,
        maxZScore: 9,
        spikeCount: 0,
      },
    });
    expect(classifier.classify(e)).toBe('FALSE_POSITIVE');
  });

  it('treats UNKNOWN event as no operational explanation and routes to REAL_ANOMALY', () => {
    const e = evidence({
      matchedEvent: { id: 'x', meterId: 'M-109', timestamp: '2026-09-12T14:00:00Z', type: 'UNKNOWN', description: '' },
      deviation: {
        start: '2026-09-12T14:00:00Z',
        end: '2026-09-14T23:00:00Z',
        durationHours: 58,
        baselineMean: 44,
        observedMean: 92,
        deviationPct: 112,
        maxZScore: 8,
        spikeCount: 0,
      },
      consistency: { ratioMean: 0.72, ratioStd: 0.04, ratioMin: 0.7, ratioMax: 0.75, noisy: false, shifted: true },
    });
    expect(classifier.classify(e)).toBe('REAL_ANOMALY');
  });

  it('returns NORMAL when nothing fires', () => {
    expect(classifier.classify(evidence({}))).toBe('NORMAL');
  });
});

describe('SeverityCalculator', () => {
  const sev = new SeverityCalculator();

  it('DATA_QUALITY is always HIGH', () => {
    expect(sev.compute('DATA_QUALITY', evidence({}))).toBe('HIGH');
  });

  it('REAL_ANOMALY HIGH on >50% deviation', () => {
    const e = evidence({
      deviation: { start: '', end: '', durationHours: 1, baselineMean: 1, observedMean: 2, deviationPct: 60, maxZScore: 1, spikeCount: 0 },
    });
    expect(sev.compute('REAL_ANOMALY', e)).toBe('HIGH');
  });

  it('REAL_ANOMALY MEDIUM on 20-50% deviation', () => {
    const e = evidence({
      deviation: { start: '', end: '', durationHours: 1, baselineMean: 1, observedMean: 1.4, deviationPct: 40, maxZScore: 1, spikeCount: 0 },
    });
    expect(sev.compute('REAL_ANOMALY', e)).toBe('MEDIUM');
  });

  it('EXPLAINABLE MEDIUM in 30-75% band', () => {
    const e = evidence({
      deviation: { start: '', end: '', durationHours: 1, baselineMean: 1, observedMean: 1.47, deviationPct: 47, maxZScore: 1, spikeCount: 0 },
    });
    expect(sev.compute('EXPLAINABLE', e)).toBe('MEDIUM');
  });

  it('FALSE_POSITIVE is always LOW', () => {
    expect(sev.compute('FALSE_POSITIVE', evidence({}))).toBe('LOW');
  });
});

describe('ConfidenceCalculator', () => {
  const conf = new ConfidenceCalculator();

  it('combines alignment signals and clamps to 1', () => {
    const e = evidence({
      deviation: { start: '', end: '', durationHours: 60, baselineMean: 1, observedMean: 2, deviationPct: 100, maxZScore: 5, spikeCount: 0 },
      consistency: { ratioMean: 0.7, ratioStd: 0.05, ratioMin: 0.6, ratioMax: 0.8, noisy: false, shifted: true },
      noOperationalExplanation: true,
    });
    const c = conf.compute(e, 'REAL_ANOMALY');
    expect(c).toBeGreaterThanOrEqual(0.8);
    expect(c).toBeLessThanOrEqual(1);
  });

  it('never exceeds 1 and never goes below 0', () => {
    const c1 = conf.compute(evidence({}), 'NORMAL');
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c1).toBeLessThanOrEqual(1);
  });
});

describe('PriorityCalculator', () => {
  const pri = new PriorityCalculator();

  it('equals severity normally', () => {
    expect(pri.compute('LOW', 0.5)).toBe('LOW');
    expect(pri.compute('MEDIUM', 0.5)).toBe('MEDIUM');
    expect(pri.compute('HIGH', 0.5)).toBe('HIGH');
  });

  it('locks MEDIUM/HIGH at HIGH when confidence >= 0.85', () => {
    expect(pri.compute('MEDIUM', 0.9)).toBe('HIGH');
    expect(pri.compute('HIGH', 0.9)).toBe('HIGH');
    expect(pri.compute('LOW', 0.9)).toBe('LOW');
  });
});
