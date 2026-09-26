import { render, screen } from '@testing-library/react';
import { SeverityBadge, TypeBadge } from '@/components/ui/badges';

describe('badges', () => {
  it('renders severity text and color classes for HIGH', () => {
    render(<SeverityBadge value="HIGH" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the type label for EXPLAINABLE', () => {
    render(<TypeBadge value="EXPLAINABLE" />);
    expect(screen.getByText('Explainable')).toBeInTheDocument();
  });

  it('falls back to LOW styling for unknown values', () => {
    render(<SeverityBadge value="WEIRD" />);
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
  });
});
