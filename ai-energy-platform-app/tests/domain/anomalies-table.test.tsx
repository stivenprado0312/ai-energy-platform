import { render, screen } from '@testing-library/react';
import { AnomaliesTable } from '@/components/domain/anomalies-table';
import type { AnomalyListItem } from '@/lib/types';

const data: AnomalyListItem[] = [
  {
    id: 'a1',
    meterId: 'M-109',
    type: 'REAL_ANOMALY',
    severity: 'HIGH',
    confidence: 0.9,
    priority: 'HIGH',
    detectedAt: '2026-09-12T14:00:00Z',
    windowStart: '2026-09-12T14:00:00Z',
    windowEnd: '2026-09-14T23:00:00Z',
    baselineKwh: 43.7,
    observedKwh: 92.8,
    deviationPercent: 112.4,
    relatedEventId: null,
  },
];

describe('AnomaliesTable', () => {
  it('renders one row per anomaly', () => {
    render(<AnomaliesTable data={data} />);
    expect(screen.getByText('M-109')).toBeInTheDocument();
    expect(screen.getByText('Real anomaly')).toBeInTheDocument();
    expect(screen.getByText('+112.4%')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<AnomaliesTable data={[]} />);
    expect(screen.getByText(/No anomalies match/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AnomaliesTable data={[]} loading />);
    expect(screen.getByText(/Loading anomalies/)).toBeInTheDocument();
  });
});
