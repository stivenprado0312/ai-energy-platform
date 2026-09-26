import { AnomalyType, Severity } from '../../../shared/constants/domain.constants';
import { AnalyticsEvidence, MatchedEvent } from '../../analytics/domain/evidence.types';

/**
 * Input to the AI explanation provider. Carries the structured evidence
 * produced by the deterministic analytics engine (Phase 2) and never
 * the raw readings.
 */
export interface AiExplanationInput {
  meterId: string;
  anomalyType: AnomalyType;
  severity: Severity;
  priority: string;
  confidence: number;
  evidence: AnalyticsEvidence;
  relatedEvent?: MatchedEvent;
}

/**
 * Output of the AI explanation provider. Always deterministic given
 * the input. Never includes numbers that are not present in the input.
 */
export interface AiExplanationOutput {
  summary: string;
  whyItMatters: string;
  evidence: string[];
  recommendation: string;
}

/**
 * Port for the AI explanation layer. The application layer depends on
 * this interface only; concrete providers (StubDeterministicProvider,
 * future OpenAIProvider) are bound in the DI module.
 */
export interface IAiExplanationProvider {
  explain(input: AiExplanationInput): Promise<AiExplanationOutput>;
}
