import { Injectable, Logger } from '@nestjs/common';
import {
  AiExplanationInput,
  AiExplanationOutput,
  IAiExplanationProvider,
} from '../domain/ai-explanation.types';

@Injectable()
export class StubAiExplanationProvider implements IAiExplanationProvider {
  private readonly logger = new Logger(StubAiExplanationProvider.name);

  async explain(input: AiExplanationInput): Promise<AiExplanationOutput> {
    this.logger.debug(`Stub provider generating explanation for ${input.meterId} (${input.anomalyType})`);
    const summary = this.buildSummary(input);
    const whyItMatters = this.buildWhyItMatters(input);
    const evidence = this.buildEvidenceBullets(input);
    const recommendation = this.buildRecommendation(input);
    return { summary, whyItMatters, evidence, recommendation };
  }

  private buildSummary(input: AiExplanationInput): string {
    const ev = input.evidence;
    const deviation = ev.deviation?.deviationPct;
    const devText = deviation !== undefined ? ` (deviation ${formatPct(deviation)})` : '';
    const typeLabel = labelFor(input.anomalyType);
    return `${typeLabel} on meter ${input.meterId} — severity ${input.severity}${devText}.`;
  }

  private buildWhyItMatters(input: AiExplanationInput): string {
    const ev = input.evidence;
    const dq = ev.dataQuality?.score ?? 0;
    if (input.anomalyType === 'DATA_QUALITY') {
      return (
        'Electrical readings are inconsistent, which means any consumption figure derived from this meter ' +
        'may be unreliable until the sensor and its connections are validated.'
      );
    }
    if (input.anomalyType === 'FALSE_POSITIVE') {
      return (
        'The observed deviation coincides with a known operational event. Investigation effort should focus ' +
        'on confirming the event, not on treating the deviation as an independent incident.'
      );
    }
    if (input.anomalyType === 'EXPLAINABLE') {
      return (
        'A real deviation was detected, but the matching operational event provides a plausible explanation. ' +
        'Tracking the event execution against the deviation window helps validate the cause.'
      );
    }
    if (input.anomalyType === 'REAL_ANOMALY') {
      const parts: string[] = [];
      if (ev.deviation) parts.push(`a consumption change of ${formatPct(ev.deviation.deviationPct)}`);
      if (ev.consistency?.shifted) parts.push('a measurable shift in the electrical ratios');
      if (ev.consistency?.noisy) parts.push('noise in the electrical readings');
      const joined = parts.length > 0 ? ` with ${parts.join(' and ')}` : '';
      return (
        `No operational event in the dataset accounts for the change${joined}. ` +
        'Operation and equipment should be investigated to identify the underlying cause.'
      );
    }
    if (dq > 0) {
      return 'The data quality signals add uncertainty to any conclusion drawn from this meter.';
    }
    return 'Standard monitoring is sufficient.';
  }

  private buildEvidenceBullets(input: AiExplanationInput): string[] {
    const ev = input.evidence;
    const bullets: string[] = [];

    bullets.push(
      `Baseline mean: ${formatKwh(ev.baseline.meanKwh)} kWh (sample size ${ev.baseline.sampleSize}).`,
    );

    if (ev.deviation) {
      const d = ev.deviation;
      bullets.push(
        `Deviation window: ${d.durationHours} h, observed mean ${formatKwh(d.observedMean)} kWh vs baseline ${formatKwh(d.baselineMean)} kWh (${formatPct(d.deviationPct)}).`,
      );
      if (d.spikeCount > 0) {
        bullets.push(`${d.spikeCount} spike hour(s) detected within the window (max z-score ${d.maxZScore}).`);
      }
    }

    if (ev.consistency && (ev.consistency.noisy || ev.consistency.shifted)) {
      const tags: string[] = [];
      if (ev.consistency.noisy) tags.push(`noisy (std ${ev.consistency.ratioStd})`);
      if (ev.consistency.shifted) tags.push(`shifted (mean ${ev.consistency.ratioMean})`);
      bullets.push(`Electrical ratio (V·I·PF / kWh) is ${tags.join(', ')}.`);
    }

    if (ev.outliers && (ev.outliers.voltage > 0 || ev.outliers.powerFactor > 0 || ev.outliers.current > 0)) {
      bullets.push(
        `Outlier readings: ${ev.outliers.voltage} voltage, ${ev.outliers.powerFactor} power-factor, ${ev.outliers.current} current.`,
      );
    }

    if (ev.dataQuality?.score && ev.dataQuality.score > 0) {
      bullets.push(`Data-quality score: ${formatNumber(ev.dataQuality.score, 2)}.`);
    }

    if (input.relatedEvent) {
      const e = input.relatedEvent;
      bullets.push(
        `Matched operational event: ${e.type} at ${e.timestamp} — "${e.description}".`,
      );
    } else if (input.anomalyType === 'REAL_ANOMALY') {
      bullets.push('No operational event from the dataset coincides with the deviation.');
    }

    return bullets;
  }

  private buildRecommendation(input: AiExplanationInput): string {
    switch (input.anomalyType) {
      case 'REAL_ANOMALY':
        return (
          input.severity === 'HIGH'
            ? 'Prioritise on-site inspection of the meter and the associated load. Validate electrical ' +
              'conditions (voltage, current, power factor) and compare with operational records before ' +
              'the deviation window. Treat as an active investigation.'
            : 'Schedule a focused inspection of the meter and the connected equipment. Cross-reference ' +
              'maintenance logs and shift schedules for the deviation window.'
        );
      case 'EXPLAINABLE':
        return (
          'Confirm that the matched operational event actually occurred (start time, duration, scope) and ' +
          'validate that its impact matches the magnitude of the deviation. Keep monitoring the meter; ' +
          'no escalation is required unless the post-event recovery does not behave as expected.'
        );
      case 'FALSE_POSITIVE':
        return (
          'Do not escalate as an incident. Continue normal monitoring and verify that the consumer ' +
          'returns to baseline after the known event concludes.'
        );
      case 'DATA_QUALITY':
        return (
          'Review the meter and its installation: sensor calibration, wiring, CT/PT connections, and ' +
          'data acquisition pipeline. Do not assume the reported consumption figures represent real ' +
          'consumption until the readings are validated against a reference source.'
        );
      case 'NORMAL':
        return 'No action required. Continue standard monitoring.';
    }
  }
}

function labelFor(type: string): string {
  switch (type) {
    case 'REAL_ANOMALY':
      return 'Real anomaly';
    case 'EXPLAINABLE':
      return 'Explainable anomaly';
    case 'FALSE_POSITIVE':
      return 'False positive';
    case 'DATA_QUALITY':
      return 'Data-quality issue';
    default:
      return 'Anomaly';
  }
}

function formatKwh(n: number): string {
  return n.toFixed(2);
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function formatNumber(n: number, decimals: number): string {
  return n.toFixed(decimals);
}
