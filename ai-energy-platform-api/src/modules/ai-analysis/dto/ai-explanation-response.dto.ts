import { AiExplanationOutput } from '../domain/ai-explanation.types';

export interface AiExplanationResponse extends AiExplanationOutput {
  anomalyId: string;
  meterId: string;
  anomalyType: string;
  severity: string;
  priority: string;
  confidence: number;
  /** The moment when this explanation was (re)generated. */
  generatedAt: string;
}

export interface GenerateForMeterResponse {
  meterId: string;
  generated: number;
  failed: number;
  results: AiExplanationResponse[];
}
