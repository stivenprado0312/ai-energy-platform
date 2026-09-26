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

@Controller()
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly anomalies: AnomaliesService,
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
      aiExplanation: null,
      recommendedAction: null,
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
    if (body?.meterId) {
      const result = await this.analytics.analyzeMeter(body.meterId, { persist });
      return {
        status: 'DONE',
        anomalies: result ? [toListItem(result)] : [],
        skippedMeters: result ? 0 : 1,
        analyzedMeters: 1,
      };
    }
    const { results, metersAnalyzed } = await this.analytics.analyzeAll({ persist });
    return {
      status: 'DONE',
      anomalies: results.map(toListItem),
      skippedMeters: Math.max(0, metersAnalyzed - results.length),
      analyzedMeters: metersAnalyzed,
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
