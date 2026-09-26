import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnomalyResult } from './domain/anomaly';
import { AnalyticsEvidence, MeterEventRepository, MeterReadingRepository } from './domain/evidence.types';
import { METER_EVENT_REPOSITORY, METER_READING_REPOSITORY } from './analytics.tokens';
import { Reading } from './domain/reading';
import { BaselineCalculator } from './components/baseline.calculator';
import { SpikeDetector } from './components/spike.detector';
import { PersistentDeviationDetector } from './components/persistent-deviation.detector';
import { OutlierDetector } from './components/outlier.detector';
import { ElectricalConsistencyChecker } from './components/electrical-consistency.checker';
import { DataQualityAnalyzer } from './components/data-quality.analyzer';
import { EventCorrelator } from './components/event-correlator';
import {
  AnomalyClassifier,
  ConfidenceCalculator,
  PriorityCalculator,
  SeverityCalculator,
} from './components/anomaly-classifier';
import { PrismaAnomalyRepository } from './infrastructure/prisma-anomaly.repository';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';

export interface AnalyzeOptions {
  persist?: boolean;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private readonly baseline = new BaselineCalculator();
  private readonly spikes = new SpikeDetector();
  private readonly deviation = new PersistentDeviationDetector();
  private readonly outliers = new OutlierDetector();
  private readonly consistency = new ElectricalConsistencyChecker();
  private readonly dataQuality = new DataQualityAnalyzer();
  private readonly correlator = new EventCorrelator();
  private readonly classifier = new AnomalyClassifier();
  private readonly severityCalc = new SeverityCalculator();
  private readonly confidenceCalc = new ConfidenceCalculator();
  private readonly priorityCalc = new PriorityCalculator();

  constructor(
    @Inject(METER_READING_REPOSITORY) private readonly readings: MeterReadingRepository,
    @Inject(METER_EVENT_REPOSITORY) private readonly events: MeterEventRepository,
    private readonly anomalies: PrismaAnomalyRepository,
    private readonly meters: PrismaMeterRepository,
  ) {}

  async analyzeMeter(meterId: string, options: AnalyzeOptions = {}): Promise<AnomalyResult | null> {
    const allReadings = await this.readings.findByMeter(meterId);
    const allEvents = await this.events.findByMeter(meterId);
    if (allReadings.length === 0) return null;

    const eventTs = allEvents[0]?.timestamp ?? null;
    const baseline = this.baseline.compute(allReadings, eventTs);
    if (!baseline) return null;

    const candidateStart = this.baseline.candidateWindowStart(allReadings, eventTs);
    if (!candidateStart) return null;

    const candidateReadings = allReadings.filter(
      (r) => r.timestamp.getTime() >= candidateStart.getTime(),
    );

    const spikes = this.spikes.detect(candidateReadings, baseline);
    const deviation = this.deviation.detect({
      readings: allReadings,
      candidateStart,
      baseline,
      spikes,
    });
    const outliers = this.outliers.detect(candidateReadings);
    const consistency = this.consistency.check(candidateReadings);
    const dataQuality = this.dataQuality.analyze({
      readingsCount: candidateReadings.length,
      outliers,
      consistency,
    });

    // Event matching uses the candidate window (i.e. from event-start
    // to end of data), not just the tightest deviation sub-window.
    // This is necessary because for some meters (e.g. M-104) the
    // production line takes a few hours to ramp up, so the longest
    // deviation run can start AFTER the event timestamp.
    const matchedEvent = this.correlator.correlate(
      allEvents,
      candidateStart.toISOString(),
      new Date().toISOString(),
    );

    const evidence: AnalyticsEvidence = {
      meterId,
      baseline,
      deviation: deviation ?? undefined,
      spikes,
      outliers,
      consistency,
      dataQuality,
      matchedEvent: matchedEvent ?? undefined,
      candidateWindowSize: candidateReadings.length,
      noOperationalExplanation:
        !matchedEvent ||
        matchedEvent.type === 'UNKNOWN' ||
        matchedEvent.type === 'DATA_QUALITY',
    };

    const type = this.classifier.classify(evidence);
    const severity = this.severityCalc.compute(type, evidence);
    const confidence = this.confidenceCalc.compute(evidence, type);
    const priority = this.priorityCalc.compute(severity, confidence);

    // Skip creating anomaly records for NORMAL meters so the dashboards
    // reflect only actionable findings. Every classified-NORMAL meter
    // has no meaningful deviation, no operational explanation, and no
    // data-quality issue — keeping those rows would just be noise.
    if (type === 'NORMAL') {
      return null;
    }

    const now = new Date();
    const windowStart = (deviation?.start ?? candidateStart.toISOString());
    const windowEnd = (deviation?.end ?? candidateReadings[candidateReadings.length - 1].timestamp.toISOString());
    const baselineMean = baseline.meanKwh;
    const observedMean =
      deviation?.observedMean ?? mean(candidateReadings.map((r) => r.consumptionKwh));
    const deviationPercent = ((observedMean - baselineMean) / baselineMean) * 100;

    const result: AnomalyResult = {
      id: '',
      meterId,
      type,
      severity,
      confidence: round(confidence, 4),
      priority,
      detectedAt: now.toISOString(),
      windowStart,
      windowEnd,
      baselineKwh: round(baselineMean, 4),
      observedKwh: round(observedMean, 4),
      deviationPercent: round(deviationPercent, 3),
      relatedEventId: matchedEvent?.id ?? null,
      evidence,
    };

    if (options.persist !== false) {
      await this.anomalies.deleteAllForMeter(meterId);
      const persisted = await this.anomalies.create(result);
      this.logger.log(
        `Anomaly persisted for ${meterId}: ${persisted.type}/${persisted.severity}/${persisted.priority}`,
      );
      return persisted;
    }
    return result;
  }

  async analyzeAll(
    options: AnalyzeOptions = {},
  ): Promise<{ results: AnomalyResult[]; metersAnalyzed: number }> {
    const meters = await this.meters.findAll();
    const results: AnomalyResult[] = [];
    for (const m of meters) {
      const r = await this.analyzeMeter(m.code, options);
      if (r) results.push(r);
    }
    return { results, metersAnalyzed: meters.length };
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Re-exported for type narrowing; intentionally not exported above.
export type { Reading };
