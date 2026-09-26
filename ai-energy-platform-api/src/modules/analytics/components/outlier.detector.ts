import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import { OutlierCounters } from '../domain/evidence.types';
import { Reading } from '../domain/reading';

export class OutlierDetector {
  /**
   * Counts electrical reading outliers in the supplied readings.
   *
   * - Voltage outliers: outside the nominal band.
   * - Power-factor outliers: below the configured minimum.
   * - Current outliers: outside [NOMINAL_CURRENT_MIN, NOMINAL_CURRENT_MAX].
   *
   * "total" is the unique count of readings with at least one outlier
   * (not the sum of categories).
   */
  detect(readings: Reading[]): OutlierCounters {
    let voltage = 0;
    let powerFactor = 0;
    let current = 0;
    let total = 0;
    for (const r of readings) {
      const v = voltageOutlier(r);
      const p = pfOutlier(r);
      const c = currentOutlier(r);
      if (v) voltage++;
      if (p) powerFactor++;
      if (c) current++;
      if (v || p || c) total++;
    }
    return { voltage, powerFactor, current, total };
  }
}

export function voltageOutlier(r: Reading): boolean {
  return (
    r.voltageV < ANALYTICS_THRESHOLDS.NOMINAL_VOLTAGE_MIN ||
    r.voltageV > ANALYTICS_THRESHOLDS.NOMINAL_VOLTAGE_MAX
  );
}

export function pfOutlier(r: Reading): boolean {
  return r.powerFactor < ANALYTICS_THRESHOLDS.NOMINAL_PF_MIN;
}

export function currentOutlier(r: Reading): boolean {
  return (
    r.currentA < ANALYTICS_THRESHOLDS.NOMINAL_CURRENT_MIN ||
    r.currentA > ANALYTICS_THRESHOLDS.NOMINAL_CURRENT_MAX
  );
}
