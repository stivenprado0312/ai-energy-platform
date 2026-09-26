import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnomalyResult } from '../analytics/domain/anomaly';
import { PrismaAnomalyRepository } from '../analytics/infrastructure/prisma-anomaly.repository';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { ValidationError } from '../../shared/errors/validation.error';
import {
  AiExplanationInput,
  AiExplanationOutput,
  IAiExplanationProvider,
} from './domain/ai-explanation.types';
import { AI_EXPLANATION_PROVIDER } from './ai-analysis.tokens';
import { AiExplanationResponse, GenerateForMeterResponse } from './dto/ai-explanation-response.dto';

const METER_ID_PATTERN = /^M-\d{3}$/;

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    @Inject(AI_EXPLANATION_PROVIDER) private readonly provider: IAiExplanationProvider,
    private readonly anomalies: PrismaAnomalyRepository,
    private readonly meters: PrismaMeterRepository,
  ) {}

  async explainAnomaly(id: string): Promise<AiExplanationResponse> {
    const anomaly = await this.anomalies.findById(id);
    if (!anomaly) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Anomaly not found: ${id}`,
      });
    }
    return this.explainAndPersist(anomaly);
  }

  async explainAllForMeter(meterId: string): Promise<GenerateForMeterResponse> {
    if (!METER_ID_PATTERN.test(meterId)) {
      throw new ValidationError(`Invalid meter id format: ${meterId}`);
    }
    const meter = await this.meters.findByCode(meterId);
    if (!meter) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Meter not found: ${meterId}`,
      });
    }
    const anomalies = await this.anomalies.findMany({ meterId });
    let generated = 0;
    let failed = 0;
    const results: AiExplanationResponse[] = [];
    for (const a of anomalies) {
      try {
        results.push(await this.explainAndPersist(a));
        generated++;
      } catch (err) {
        this.logger.error(`Failed to generate explanation for ${a.id}`, err as Error);
        failed++;
      }
    }
    return { meterId, generated, failed, results };
  }

  async explainBatch(anomalyIds: string[]): Promise<AiExplanationResponse[]> {
    const out: AiExplanationResponse[] = [];
    for (const id of anomalyIds) {
      const anomaly = await this.anomalies.findById(id);
      if (!anomaly) continue;
      out.push(await this.explainAndPersist(anomaly));
    }
    return out;
  }

  private async explainAndPersist(anomaly: AnomalyResult): Promise<AiExplanationResponse> {
    const input = this.toInput(anomaly);
    const output = await this.provider.explain(input);
    const persisted = await this.anomalies.updateAiExplanation(
      anomaly.id,
      this.flatten(output),
      output.recommendation,
    );
    if (!persisted) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Anomaly vanished during explanation: ${anomaly.id}`,
      });
    }
    return this.toResponse(persisted, output);
  }

  private toInput(anomaly: AnomalyResult): AiExplanationInput {
    return {
      meterId: anomaly.meterId,
      anomalyType: anomaly.type,
      severity: anomaly.severity,
      priority: anomaly.priority,
      confidence: anomaly.confidence,
      evidence: anomaly.evidence,
      relatedEvent: anomaly.evidence.matchedEvent,
    };
  }

  private flatten(output: AiExplanationOutput): string {
    const lines: string[] = [];
    lines.push(`SUMMARY: ${output.summary}`);
    lines.push('');
    lines.push(`WHY IT MATTERS: ${output.whyItMatters}`);
    lines.push('');
    lines.push('EVIDENCE:');
    for (const b of output.evidence) {
      lines.push(`- ${b}`);
    }
    lines.push('');
    lines.push(`RECOMMENDATION: ${output.recommendation}`);
    return lines.join('\n');
  }

  private toResponse(
    persisted: AnomalyResult,
    output: AiExplanationOutput,
  ): AiExplanationResponse {
    return {
      anomalyId: persisted.id,
      meterId: persisted.meterId,
      anomalyType: persisted.type,
      severity: persisted.severity,
      priority: persisted.priority,
      confidence: persisted.confidence,
      summary: output.summary,
      whyItMatters: output.whyItMatters,
      evidence: output.evidence,
      recommendation: output.recommendation,
      generatedAt: persisted.detectedAt,
    };
  }
}
