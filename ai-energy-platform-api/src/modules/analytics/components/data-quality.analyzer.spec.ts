import { DataQualityAnalyzer } from './data-quality.analyzer';

describe('DataQualityAnalyzer', () => {
  const analyzer = new DataQualityAnalyzer();

  it('returns a low score for clean data', () => {
    const score = analyzer.analyze({
      readingsCount: 48,
      outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
      consistency: { ratioMean: 0.95, ratioStd: 0.01, ratioMin: 0.9, ratioMax: 1.0, noisy: false, shifted: false },
    });
    expect(score.score).toBeLessThan(0.1);
  });

  it('returns a high score for the M-112 pattern (16 voltage + 12 pf outliers in 48 readings)', () => {
    const score = analyzer.analyze({
      readingsCount: 48,
      outliers: { voltage: 16, powerFactor: 12, current: 0, total: 28 },
      consistency: { ratioMean: 0.95, ratioStd: 0.3, ratioMin: 0.24, ratioMax: 1.73, noisy: true, shifted: false },
    });
    expect(score.score).toBeGreaterThanOrEqual(0.5);
  });

  it('returns 0 when no readings are provided', () => {
    expect(
      analyzer.analyze({
        readingsCount: 0,
        outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
        consistency: { ratioMean: 0, ratioStd: 0, ratioMin: 0, ratioMax: 0, noisy: false, shifted: false },
      }).score,
    ).toBe(0);
  });
});
