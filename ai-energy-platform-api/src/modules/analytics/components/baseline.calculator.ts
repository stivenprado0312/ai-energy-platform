import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import { Baseline } from '../domain/evidence.types';
import { Reading } from '../domain/reading';

const HOURS_PER_DAY = 24;

export class BaselineCalculator {
  /**
   * Computes a baseline over the pre-event window of the readings.
   *
   * The baseline is captured at two granularities:
   * - `meanKwh` / `stdKwh`: the global mean over the window.
   * - `hourlyMeanKwh`: a per-hour-of-day array (24 values), which
   *   captures the diurnal pattern. This is what the deviation
   *   detector uses so that normal daily cycles (low at night, high
   *   during the day) are not mistaken for anomalies.
   *
   * If the meter has an event timestamp, the baseline uses every reading
   * strictly before the event.
   * If not, it uses the first half of the readings (split at the median
   * timestamp).
   *
   * Returns null when there are not enough samples.
   */
  compute(readings: Reading[], eventTimestamp: Date | null): Baseline | null {
    const baselineReadings = this.selectBaselineReadings(readings, eventTimestamp);
    if (baselineReadings.length < ANALYTICS_THRESHOLDS.MIN_BASELINE_SAMPLES) {
      return null;
    }
    const values = baselineReadings.map((r) => r.consumptionKwh);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
    const std = Math.sqrt(variance);
    const hourly = new Array<number>(HOURS_PER_DAY).fill(mean);
    const hourlyCounts = new Array<number>(HOURS_PER_DAY).fill(0);
    const hourlySums = new Array<number>(HOURS_PER_DAY).fill(0);
    for (const r of baselineReadings) {
      const h = r.timestamp.getUTCHours();
      hourlySums[h] += r.consumptionKwh;
      hourlyCounts[h] += 1;
    }
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      if (hourlyCounts[h] > 0) hourly[h] = hourlySums[h] / hourlyCounts[h];
    }
    return {
      meanKwh: round(mean, 4),
      stdKwh: round(std, 4),
      sampleSize: baselineReadings.length,
      sourceWindowStart: baselineReadings[0].timestamp.toISOString(),
      sourceWindowEnd: baselineReadings[baselineReadings.length - 1].timestamp.toISOString(),
      hourlyMeanKwh: hourly.map((v) => round(v, 4)),
    };
  }

  /**
   * Returns the candidate window start: the event timestamp if present,
   * otherwise the median timestamp of the readings.
   */
  candidateWindowStart(readings: Reading[], eventTimestamp: Date | null): Date | null {
    if (eventTimestamp) return eventTimestamp;
    if (readings.length === 0) return null;
    const sorted = [...readings].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    return sorted[Math.floor(sorted.length / 2)].timestamp;
  }

  private selectBaselineReadings(
    readings: Reading[],
    eventTimestamp: Date | null,
  ): Reading[] {
    const sorted = [...readings].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    if (eventTimestamp) {
      return sorted.filter((r) => r.timestamp.getTime() < eventTimestamp.getTime());
    }
    const mid = Math.floor(sorted.length / 2);
    return sorted.slice(0, mid === 0 ? 1 : mid);
  }
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
