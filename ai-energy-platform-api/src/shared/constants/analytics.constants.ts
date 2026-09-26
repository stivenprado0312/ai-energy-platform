// Thresholds for the analytics pipeline.
//
// These values are derived from the actual dataset (see docs/data-analysis.md)
// and are intentionally expressed as ranges and defaults. They are not
// exact numerical answers and are not tied to expected_results.csv.

export const ANALYTICS_THRESHOLDS = {
  /** Minimum samples required to compute a baseline. */
  MIN_BASELINE_SAMPLES: 24,

  /**
   * Mean hourly consumption deviation from baseline, in percent, that
   * is considered "significant" for the persistent-deviation detector.
   */
  DEVIATION_THRESHOLD_EXPLAINABLE: 20,

  /** Minimum duration (in hours) of a sustained deviation window. */
  MIN_DEVIATION_HOURS: 6,

  /** Severity HIGH threshold for REAL_ANOMALY (% deviation). */
  REAL_ANOMALY_HIGH_DEVIATION_PCT: 50,

  /** Severity HIGH threshold for EXPLAINABLE (% deviation). */
  EXPLAINABLE_HIGH_DEVIATION_PCT: 75,

  /** Lower band of MEDIUM for EXPLAINABLE (% deviation). */
  EXPLAINABLE_MEDIUM_DEVIATION_PCT: 30,

  /** Nominal voltage band (V). Readings outside are flagged. */
  NOMINAL_VOLTAGE_MIN: 210,
  NOMINAL_VOLTAGE_MAX: 230,

  /** Minimum accepted power factor. Readings below are flagged. */
  NOMINAL_PF_MIN: 0.85,

  /** Minimum accepted current (A). Used to guard against near-zero floor. */
  NOMINAL_CURRENT_MIN: 1,

  /** Maximum accepted current (A). Used to flag extreme surges. */
  NOMINAL_CURRENT_MAX: 600,

  /** Allowed relative drift of theoretical power vs reported consumption. */
  ELECTRICAL_RATIO_TOLERANCE: 0.25,

  /** StdDev of the per-reading electrical ratio above which we flag noise. */
  ELECTRICAL_RATIO_NOISE_THRESHOLD: 0.1,

  /** Voltage outlier rate above which the meter is DATA_QUALITY. */
  DATA_QUALITY_VOLTAGE_OUTLIER_RATE: 0.05,

  /** Power-factor outlier rate above which the meter is DATA_QUALITY. */
  DATA_QUALITY_PF_OUTLIER_RATE: 0.03,

  /** Electrical ratio noise threshold above which the meter is DATA_QUALITY. */
  DATA_QUALITY_RATIO_NOISE: 0.08,

  /**
   * Combined data-quality score (0..1) above which the classifier emits
   * DATA_QUALITY regardless of the consumption signal.
   */
  DATA_QUALITY_THRESHOLD: 0.5,

  /** Bonus when the deviation window is sustained (>= SUSTAINED_HOURS). */
  CONFIDENCE_SUSTAINED_HOURS: 12,
  CONFIDENCE_SUSTAINED_BONUS: 0.15,

  /** Bonus when electrical-consistency signal is significant. */
  CONFIDENCE_ELECTRICAL_BONUS: 0.15,

  /** Bonus when no operational event matches. */
  CONFIDENCE_NO_EVENT_BONUS: 0.1,

  /** Bonus when the baseline sample size is large. */
  CONFIDENCE_LARGE_SAMPLE_SIZE: 100,
  CONFIDENCE_LARGE_SAMPLE_BONUS: 0.1,

  /** Confidence threshold above which a MEDIUM/HIGH priority is locked. */
  CONFIDENCE_HIGH_THRESHOLD: 0.85,

  /** Base confidence value before bonuses are added. */
  CONFIDENCE_BASE: 0.5,
} as const;

export type AnalyticsThresholds = typeof ANALYTICS_THRESHOLDS;
