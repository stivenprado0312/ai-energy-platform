import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import { Baseline, DeviationWindow, Spike } from '../domain/evidence.types';
import { Reading } from '../domain/reading';

export interface PersistentDeviationInput {
  readings: Reading[];
  candidateStart: Date;
  baseline: Baseline;
  spikes: Spike[];
}

export class PersistentDeviationDetector {
  /**
   * Finds the longest contiguous run of hours within the candidate
   * window where the consumption deviates from the **per-hour-of-day**
   * baseline by at least `DEVIATION_THRESHOLD_EXPLAINABLE` percent.
   *
   * Using the hourly baseline eliminates normal diurnal cycles from
   * being mistaken for anomalies (a meter's nighttime consumption is
   * naturally lower than the global mean).
   *
   * Returns null when no contiguous run satisfies the threshold.
   */
  detect(input: PersistentDeviationInput): DeviationWindow | null {
    const { readings, candidateStart, baseline, spikes } = input;
    if (baseline.meanKwh <= 0) return null;

    const candidate = readings
      .filter((r) => r.timestamp.getTime() >= candidateStart.getTime())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (candidate.length < ANALYTICS_THRESHOLDS.MIN_DEVIATION_HOURS) return null;

    const threshold = ANALYTICS_THRESHOLDS.DEVIATION_THRESHOLD_EXPLAINABLE / 100;
    const maxZByTs = new Map<number, number>();
    for (const s of spikes) {
      const t = new Date(s.timestamp).getTime();
      const prev = maxZByTs.get(t);
      maxZByTs.set(t, Math.max(prev ?? 0, Math.abs(s.zScore)));
    }

    type Run = { start: number; end: number };
    let best: Run | null = null;
    let current: Run | null = null;

    for (const r of candidate) {
      const hourBaseline =
        baseline.hourlyMeanKwh[r.timestamp.getUTCHours()] ?? baseline.meanKwh;
      const ref = hourBaseline > 0 ? hourBaseline : baseline.meanKwh;
      const devPct = Math.abs((r.consumptionKwh - ref) / ref);
      if (devPct >= threshold) {
        if (!current) {
          current = { start: r.timestamp.getTime(), end: r.timestamp.getTime() };
        }
        current.end = r.timestamp.getTime();
        if (!best || current.end - current.start > best.end - best.start) {
          best = { ...current };
        }
      } else {
        current = null;
      }
    }

    if (!best) return null;

    const startTs = best.start;
    const endTs = best.end + 60 * 60 * 1000 - 1;
    const windowReadings = candidate.filter(
      (r) => r.timestamp.getTime() >= startTs && r.timestamp.getTime() <= best!.end,
    );
    const observedSum = windowReadings.reduce((a, r) => a + r.consumptionKwh, 0);
    const observedMean = observedSum / windowReadings.length;
    // The reference for the deviation percent is the mean of the hourly
    // baselines across the hours covered by the window. This stays
    // comparable to the previous global-mean metric while staying
    // aligned with the diurnal pattern.
    const refMean = meanOverWindow(baseline.hourlyMeanKwh, windowReadings);
    const deviationPct = ((observedMean - refMean) / refMean) * 100;

    let maxZ = 0;
    for (const r of windowReadings) {
      const t = r.timestamp.getTime();
      const z = maxZByTs.get(t) ?? 0;
      if (z > maxZ) maxZ = z;
    }

    const spikeCount = spikes.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= startTs && t <= best!.end;
    }).length;

    return {
      start: new Date(startTs).toISOString(),
      end: new Date(endTs).toISOString(),
      durationHours: windowReadings.length,
      baselineMean: round(refMean, 4),
      observedMean: round(observedMean, 4),
      deviationPct: round(deviationPct, 3),
      maxZScore: round(maxZ, 3),
      spikeCount,
    };
  }
}

function meanOverWindow(hourly: number[], windowReadings: Reading[]): number {
  if (windowReadings.length === 0) return 0;
  const sum = windowReadings.reduce((acc, r) => {
    const h = r.timestamp.getUTCHours();
    return acc + (hourly[h] ?? 0);
  }, 0);
  return sum / windowReadings.length;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
