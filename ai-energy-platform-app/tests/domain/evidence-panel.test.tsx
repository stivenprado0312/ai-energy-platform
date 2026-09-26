import { render, screen } from '@testing-library/react';
import { EvidencePanel } from '@/components/domain/evidence-panel';
import type { AnalyticsEvidence } from '@/lib/types';

const evidence: AnalyticsEvidence = {
  meterId: 'M-109',
  baseline: { meanKwh: 43.7, stdKwh: 7.6, sampleSize: 278, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: [] },
  deviation: {
    start: '2026-09-12T14:00:00Z',
    end: '2026-09-14T23:00:00Z',
    durationHours: 58,
    baselineMean: 43.7,
    observedMean: 92.8,
    deviationPct: 112.4,
    maxZScore: 8,
    spikeCount: 0,
  },
  spikes: [],
  outliers: { voltage: 0, powerFactor: 0, current: 0, total: 0 },
  consistency: { ratioMean: 0.72, ratioStd: 0.04, ratioMin: 0.7, ratioMax: 0.75, noisy: false, shifted: true },
  dataQuality: { score: 0.05, voltageOutlierRate: 0, pfOutlierRate: 0, currentOutlierRate: 0, ratioNoise: 0.04 },
  matchedEvent: undefined,
  candidateWindowSize: 58,
  noOperationalExplanation: true,
};

describe('EvidencePanel', () => {
  it('renders baseline, deviation, electrical consistency, outliers and data quality sections', () => {
    render(<EvidencePanel evidence={evidence} />);
    expect(screen.getByText('Baseline')).toBeInTheDocument();
    expect(screen.getByText('Persistent deviation')).toBeInTheDocument();
    expect(screen.getByText('Electrical consistency')).toBeInTheDocument();
    expect(screen.getByText('Outliers')).toBeInTheDocument();
    expect(screen.getByText('Data quality')).toBeInTheDocument();
    expect(screen.getByText('+112.4%')).toBeInTheDocument();
  });

  it('shows the no-event message when matchedEvent is missing', () => {
    render(<EvidencePanel evidence={evidence} />);
    expect(
      screen.getByText(/No operational event from the dataset coincides/),
    ).toBeInTheDocument();
  });
});
