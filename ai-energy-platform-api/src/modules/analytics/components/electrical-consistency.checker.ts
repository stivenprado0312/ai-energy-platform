import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import { ConsistencyReport } from '../domain/evidence.types';
import { Reading } from '../domain/reading';

/**
 * Theoretical power from V · I · PF / 1000. Compared against the
 * reported hourly kWh. Healthy data sits around 1.0 (allowing for
 * measurement timing differences); values far from 1.0 indicate either
 * measurement noise (high std) or a real systematic shift.
 */
export class ElectricalConsistencyChecker {
  check(readings: Reading[]): ConsistencyReport {
    if (readings.length === 0) {
      return { ratioMean: 0, ratioStd: 0, ratioMin: 0, ratioMax: 0, noisy: false, shifted: false };
    }
    const ratios: number[] = [];
    for (const r of readings) {
      const theoreticalKw = (r.voltageV * r.currentA * r.powerFactor) / 1000;
      if (r.consumptionKwh <= 0) continue;
      ratios.push(theoreticalKw / r.consumptionKwh);
    }
    if (ratios.length === 0) {
      return { ratioMean: 0, ratioStd: 0, ratioMin: 0, ratioMax: 0, noisy: false, shifted: false };
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance =
      ratios.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / ratios.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...ratios);
    const max = Math.max(...ratios);
    const tolerance = ANALYTICS_THRESHOLDS.ELECTRICAL_RATIO_TOLERANCE;
    return {
      ratioMean: round(mean, 4),
      ratioStd: round(std, 4),
      ratioMin: round(min, 4),
      ratioMax: round(max, 4),
      noisy: std > ANALYTICS_THRESHOLDS.ELECTRICAL_RATIO_NOISE_THRESHOLD,
      shifted: mean < 1 - tolerance || mean > 1 + tolerance,
    };
  }
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
