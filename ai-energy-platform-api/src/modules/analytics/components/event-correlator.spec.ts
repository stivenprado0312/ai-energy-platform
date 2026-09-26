import { EventCorrelator } from './event-correlator';
import { MeterEvent } from '../domain/reading';

function ev(type: string, ts: string): MeterEvent {
  return {
    id: `id-${ts}`,
    meterId: 'M-104',
    timestamp: new Date(ts),
    type,
    description: '',
  };
}

describe('EventCorrelator', () => {
  const correlator = new EventCorrelator();

  it('matches an event inside the deviation window', () => {
    const events = [
      ev('OPERATIONAL_CHANGE', '2026-09-11T00:00:00Z'),
      ev('UNKNOWN', '2026-09-15T00:00:00Z'),
    ];
    const matched = correlator.correlate(events, '2026-09-11T00:00:00Z', '2026-09-14T23:59:59Z');
    expect(matched).not.toBeNull();
    expect(matched!.type).toBe('OPERATIONAL_CHANGE');
  });

  it('returns null when no event falls inside the window', () => {
    const events = [ev('OPERATIONAL_CHANGE', '2026-09-11T00:00:00Z')];
    expect(
      correlator.correlate(events, '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z'),
    ).toBeNull();
  });

  it('picks the earliest event when multiple match', () => {
    const events = [
      ev('A', '2026-09-12T01:00:00Z'),
      ev('B', '2026-09-12T00:00:00Z'),
      ev('C', '2026-09-12T02:00:00Z'),
    ];
    const matched = correlator.correlate(events, '2026-09-12T00:00:00Z', '2026-09-12T23:00:00Z');
    expect(matched!.type).toBe('B');
  });
});
