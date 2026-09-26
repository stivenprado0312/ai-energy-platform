import { ANALYTICS_THRESHOLDS } from '../../../shared/constants/analytics.constants';
import {
  AnomalyType,
  Priority,
  Severity,
} from '../../../shared/constants/domain.constants';
import { AnalyticsEvidence } from '../domain/evidence.types';

/**
 * Combines the analytical evidence and the matched operational event
 * (if any) into a single AnomalyType.
 *
 * Order of checks matters: more specific rules override more general ones.
 * See .opencode/skills/anomaly-detection/SKILL.md § 2.
 */
export class AnomalyClassifier {
  classify(evidence: AnalyticsEvidence): AnomalyType {
    if (evidence.dataQuality.score >= ANALYTICS_THRESHOLDS.DATA_QUALITY_THRESHOLD) {
      return 'DATA_QUALITY';
    }
    if (evidence.matchedEvent) {
      const t = evidence.matchedEvent.type;
      if (t === 'OPERATIONAL_CHANGE') return 'EXPLAINABLE';
      if (t === 'SCHEDULED_OUTAGE') return 'FALSE_POSITIVE';
      if (t === 'DATA_QUALITY') return 'DATA_QUALITY';
      // UNKNOWN: events.csv says "No operational event reported",
      // so we treat it as "no operational explanation" and fall through
      // to the deviation-based rule below.
    }
    if (evidence.deviation) {
      return 'REAL_ANOMALY';
    }
    return 'NORMAL';
  }
}

export class SeverityCalculator {
  /**
   * Severity is a deterministic function of the anomaly type and the
   * deviation magnitude (and the data-quality score for DATA_QUALITY).
   * See .opencode/skills/anomaly-detection/SKILL.md § 3.
   */
  compute(type: AnomalyType, evidence: AnalyticsEvidence): Severity {
    const dev = evidence.deviation?.deviationPct ?? 0;
    const absDev = Math.abs(dev);
    switch (type) {
      case 'DATA_QUALITY':
        return 'HIGH';
      case 'REAL_ANOMALY':
        if (absDev > ANALYTICS_THRESHOLDS.REAL_ANOMALY_HIGH_DEVIATION_PCT) return 'HIGH';
        if (absDev > ANALYTICS_THRESHOLDS.DEVIATION_THRESHOLD_EXPLAINABLE) return 'MEDIUM';
        return 'LOW';
      case 'EXPLAINABLE':
        if (absDev > ANALYTICS_THRESHOLDS.EXPLAINABLE_HIGH_DEVIATION_PCT) return 'HIGH';
        if (absDev > ANALYTICS_THRESHOLDS.EXPLAINABLE_MEDIUM_DEVIATION_PCT) return 'MEDIUM';
        return 'LOW';
      case 'FALSE_POSITIVE':
        return 'LOW';
      case 'NORMAL':
        return 'LOW';
    }
  }
}

export class ConfidenceCalculator {
  /**
   * Deterministic 0..1 score built from evidence alignment.
   * Never random; never produced by an LLM.
   */
  compute(evidence: AnalyticsEvidence, type: AnomalyType): number {
    let confidence = ANALYTICS_THRESHOLDS.CONFIDENCE_BASE;
    if (evidence.deviation && evidence.deviation.durationHours >= ANALYTICS_THRESHOLDS.CONFIDENCE_SUSTAINED_HOURS) {
      confidence += ANALYTICS_THRESHOLDS.CONFIDENCE_SUSTAINED_BONUS;
    }
    if (evidence.consistency.noisy || evidence.consistency.shifted) {
      confidence += ANALYTICS_THRESHOLDS.CONFIDENCE_ELECTRICAL_BONUS;
    }
    if (type === 'REAL_ANOMALY' && evidence.noOperationalExplanation) {
      confidence += ANALYTICS_THRESHOLDS.CONFIDENCE_NO_EVENT_BONUS;
    }
    if (evidence.baseline.sampleSize >= ANALYTICS_THRESHOLDS.CONFIDENCE_LARGE_SAMPLE_SIZE) {
      confidence += ANALYTICS_THRESHOLDS.CONFIDENCE_LARGE_SAMPLE_BONUS;
    }
    return clamp(confidence, 0, 1);
  }
}

export class PriorityCalculator {
  /**
   * Priority = severity, with a confidence boost that locks MEDIUM/HIGH
   * at HIGH when evidence is overwhelming.
   */
  compute(severity: Severity, confidence: number): Priority {
    if (
      (severity === 'HIGH' || severity === 'MEDIUM') &&
      confidence >= ANALYTICS_THRESHOLDS.CONFIDENCE_HIGH_THRESHOLD
    ) {
      return 'HIGH';
    }
    return severity;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
