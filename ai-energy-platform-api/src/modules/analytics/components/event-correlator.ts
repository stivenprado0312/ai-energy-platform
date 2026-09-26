import { MatchedEvent } from '../domain/evidence.types';
import { MeterEvent } from '../domain/reading';

export class EventCorrelator {
  /**
   * Finds an operational event for the meter whose timestamp falls
   * inside `[windowStart, windowEnd]`. If multiple match, the earliest
   * wins.
   */
  correlate(
    events: MeterEvent[],
    windowStart: string,
    windowEnd: string,
  ): MatchedEvent | null {
    const startMs = new Date(windowStart).getTime();
    const endMs = new Date(windowEnd).getTime();
    const candidates = events
      .filter((e) => {
        const t = e.timestamp.getTime();
        return t >= startMs && t <= endMs;
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const picked = candidates[0];
    if (!picked) return null;
    return {
      id: picked.id,
      meterId: picked.meterId,
      timestamp: picked.timestamp.toISOString(),
      type: picked.type,
      description: picked.description,
    };
  }
}
