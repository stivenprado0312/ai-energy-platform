import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import { ConsistencyReport, DataQualityReport, OutlierCounters } from '../domain/evidence.types';

export class DataQualityAnalyzer {
  /**
   * Produces a deterministic 0..1 score combining:
   * - voltage outlier rate (0..1)
   * - power-factor outlier rate (0..1)
   * - current outlier rate (0..1)
   * - electrical ratio noise (0..1, clamped)
   *
   * The score is a weighted average that hits DATA_QUALITY_THRESHOLD
   * for M-112's pattern (intermittent readings + electrical jumps).
   */
  analyze(opts: {
    readingsCount: number;
    outliers: OutlierCounters;
    consistency: ConsistencyReport;
  }): DataQualityReport {
    const { readingsCount, outliers, consistency } = opts;
    if (readingsCount === 0) {
      return {
        score: 0,
        voltageOutlierRate: 0,
        pfOutlierRate: 0,
        currentOutlierRate: 0,
        ratioNoise: 0,
      };
    }
    const vRate = outliers.voltage / readingsCount;
    const pRate = outliers.powerFactor / readingsCount;
    const cRate = outliers.current / readingsCount;
    const noise = Math.min(consistency.ratioStd / 0.3, 1);

    const vWeight = ANALYTICS_THRESHOLDS.DATA_QUALITY_VOLTAGE_OUTLIER_RATE;
    const pWeight = ANALYTICS_THRESHOLDS.DATA_QUALITY_PF_OUTLIER_RATE;
    const nWeight = ANALYTICS_THRESHOLDS.DATA_QUALITY_RATIO_NOISE;

    const vComponent = vRate > 0 ? Math.min(vRate / Math.max(vWeight, 1e-6), 1) : 0;
    const pComponent = pRate > 0 ? Math.min(pRate / Math.max(pWeight, 1e-6), 1) : 0;
    const cComponent = cRate > 0 ? Math.min(cRate / 0.05, 1) : 0;
    const nComponent = noise > 0 ? Math.min(noise / Math.max(nWeight, 1e-6), 1) : 0;

    const score = clamp(
      0.4 * vComponent + 0.3 * pComponent + 0.15 * cComponent + 0.15 * nComponent,
      0,
      1,
    );

    return {
      score: round(score, 4),
      voltageOutlierRate: round(vRate, 4),
      pfOutlierRate: round(pRate, 4),
      currentOutlierRate: round(cRate, 4),
      ratioNoise: round(consistency.ratioStd, 4),
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
