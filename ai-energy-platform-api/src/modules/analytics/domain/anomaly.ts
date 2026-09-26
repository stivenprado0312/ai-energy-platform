import { AnomalyType, Priority, Severity } from '../../../shared/constants/domain.constants';
import { AnalyticsEvidence } from './evidence.types';

export interface AnomalyResult {
  id: string;
  meterId: string;
  type: AnomalyType;
  severity: Severity;
  confidence: number;
  priority: Priority;
  detectedAt: string;
  windowStart: string;
  windowEnd: string;
  baselineKwh: number;
  observedKwh: number;
  deviationPercent: number;
  relatedEventId: string | null;
  evidence: AnalyticsEvidence;
  aiExplanation: string | null;
  recommendedAction: string | null;
}
