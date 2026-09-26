import { Baseline, Spike } from '../domain/evidence.types';
import { Reading } from '../domain/reading';

export class SpikeDetector {
  /**
   * Returns the hourly readings whose consumption deviates from the
   * baseline by more than `SPIKE_ZSCORE` standard deviations.
   *
   * Uses the baseline std. If the baseline std is zero (constant
   * meter), no spikes can be detected.
   */
  detect(readings: Reading[], baseline: Baseline, zThreshold = 3.0): Spike[] {
    if (baseline.stdKwh <= 0 || baseline.sampleSize === 0) return [];
    const spikes: Spike[] = [];
    for (const r of readings) {
      const z = (r.consumptionKwh - baseline.meanKwh) / baseline.stdKwh;
      if (Math.abs(z) >= zThreshold) {
        spikes.push({
          timestamp: r.timestamp.toISOString(),
          zScore: round(z, 3),
          consumptionKwh: r.consumptionKwh,
        });
      }
    }
    return spikes;
  }
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
