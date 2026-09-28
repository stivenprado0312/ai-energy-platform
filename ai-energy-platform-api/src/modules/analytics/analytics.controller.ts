import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnomaliesService } from './anomalies.service';
import { AnalyzeBodyDto } from './dto/analyze.dto';
import {
  AnomaliesSummaryResponse,
  AnalyzeResponse,
  AnomalyDetailResponse,
  AnomalyListItem,
} from './dto/anomaly-response.dto';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly anomalies: AnomaliesService,
    private readonly ai: AiAnalysisService,
  ) {}

  @Get('anomalies/summary')
  async summary(): Promise<AnomaliesSummaryResponse> {
    return this.anomalies.getSummary();
  }

  @Get('anomalies')
  async list(
    @Query('meterId') meterId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('priority') priority?: string,
  ): Promise<AnomalyListItem[]> {
    const results = await this.anomalies.list({ meterId, type, severity, priority });
    return results.map(toListItem);
  }

  @Get('anomalies/:id')
  async detail(@Param('id') id: string): Promise<AnomalyDetailResponse> {
    const r = await this.anomalies.getById(id);
    return {
      ...toListItem(r),
      evidence: r.evidence,
      aiExplanation: r.aiExplanation ?? null,
      recommendedAction: r.recommendedAction ?? null,
    };
  }

  @Get('meters/:meterId/anomalies')
  async listByMeter(@Param('meterId') meterId: string): Promise<AnomalyListItem[]> {
    const results = await this.anomalies.listByMeter(meterId);
    return results.map(toListItem);
  }

  @Post('ai/analyze')
  async analyze(@Body() body: AnalyzeBodyDto): Promise<AnalyzeResponse> {
    const persist = body?.persist !== false;
    const explain = body?.explain === true;

    let results: ReturnType<typeof toListItem>[] = [];
    let metersAnalyzed = 0;
    let skippedMeters = 0;

    if (body?.meterId) {
      const result = await this.analytics.analyzeMeter(body.meterId, { persist });
      metersAnalyzed = 1;
      if (!result) {
        skippedMeters = 1;
      } else {
        results = [toListItem(result)];
        if (explain) {
          await this.ai.explainBatch([result.id]);
        }
      }
    } else {
      const out = await this.analytics.analyzeAll({ persist });
      metersAnalyzed = out.metersAnalyzed;
      skippedMeters = Math.max(0, metersAnalyzed - out.results.length);
      results = out.results.map(toListItem);
      if (explain && out.results.length > 0) {
        await this.ai.explainBatch(out.results.map((r) => r.id));
      }
    }

    return {
      status: 'DONE',
      anomalies: results,
      skippedMeters,
      analyzedMeters: metersAnalyzed,
      explanationsGenerated: explain ? results.length : 0,
      requiringAttention: results.filter(
        (a) => a.severity === 'HIGH' || a.priority === 'HIGH',
      ).length,
    };
  }
}

interface ListItemSource {
  id?: string;
  meterId: string;
  type: string;
  severity: string;
  confidence: number;
  priority: string;
  detectedAt: string;
  windowStart: string;
  windowEnd: string;
  baselineKwh: number;
  observedKwh: number;
  deviationPercent: number;
  relatedEventId: string | null;
}

function toListItem(r: ListItemSource): AnomalyListItem {
  return {
    id: r.id ?? '',
    meterId: r.meterId,
    type: r.type,
    severity: r.severity,
    confidence: r.confidence,
    priority: r.priority,
    detectedAt: r.detectedAt,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    baselineKwh: r.baselineKwh,
    observedKwh: r.observedKwh,
    deviationPercent: r.deviationPercent,
    relatedEventId: r.relatedEventId,
  };
}
