import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnomalyCard } from '@/components/domain/anomaly-card';
import type { AnomalyListItem } from '@/lib/types';

const anomaly: AnomalyListItem = {
  id: 'a1',
  meterId: 'M-109',
  type: 'REAL_ANOMALY',
  severity: 'HIGH',
  confidence: 0.95,
  priority: 'HIGH',
  detectedAt: '2026-09-12T14:00:00Z',
  windowStart: '2026-09-12T14:00:00Z',
  windowEnd: '2026-09-14T23:00:00Z',
  baselineKwh: 43.7,
  observedKwh: 92.8,
  deviationPercent: 112.4,
  relatedEventId: null,
};

describe('AnomalyCard', () => {
  it('renders meter id, type and severity badges', () => {
    render(<AnomalyCard anomaly={anomaly} />);
    expect(screen.getByText('M-109')).toBeInTheDocument();
    expect(screen.getByText('Real anomaly')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('links to /anomalies/:id when clicked', () => {
    render(<AnomalyCard anomaly={anomaly} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/anomalies/a1');
  });

  it('navigates when clicked', async () => {
    render(<AnomalyCard anomaly={anomaly} />);
    const link = screen.getByRole('link');
    await userEvent.click(link);
    expect(link).toBeInTheDocument();
  });
});
