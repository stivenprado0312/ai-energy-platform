import { BaselineCalculator } from './baseline.calculator';
import { Reading } from '../domain/reading';

function r(consumption: number, day: number, hour: number): Reading {
  return {
    id: `${day}-${hour}`,
    meterId: 'M-101',
    timestamp: new Date(Date.UTC(2026, 8, day, hour)),
    consumptionKwh: consumption,
    voltageV: 220,
    currentA: 100,
    powerFactor: 0.95,
    status: 'OK',
  };
}

describe('BaselineCalculator', () => {
  const calc = new BaselineCalculator();

  describe('with an event timestamp', () => {
    it('uses only the readings strictly before the event', () => {
      const eventTs = new Date(Date.UTC(2026, 8, 11, 0));
      const readings: Reading[] = [
        ...Array.from({ length: 24 }, (_, h) => r(50, 10, h)),
        ...Array.from({ length: 6 }, (_, h) => r(80, 11, h)),
      ];
      const baseline = calc.compute(readings, eventTs);
      expect(baseline).not.toBeNull();
      expect(baseline!.meanKwh).toBe(50);
      expect(baseline!.stdKwh).toBe(0);
      expect(baseline!.sampleSize).toBe(24);
      expect(new Date(baseline!.sourceWindowStart!).getUTCDate()).toBe(10);
      expect(new Date(baseline!.sourceWindowEnd!).getUTCDate()).toBe(10);
    });

    it('returns null when there are too few pre-event samples', () => {
      const eventTs = new Date(Date.UTC(2026, 8, 11, 0));
      const readings: Reading[] = Array.from({ length: 6 }, (_, h) => r(50, 10, h));
      expect(calc.compute(readings, eventTs)).toBeNull();
    });
  });

  describe('without an event timestamp', () => {
    it('uses the first half of the readings', () => {
      const readings: Reading[] = [
        ...Array.from({ length: 24 }, (_, h) => r(40, 1, h)),
        ...Array.from({ length: 24 }, (_, h) => r(80, 2, h)),
      ];
      const baseline = calc.compute(readings, null);
      expect(baseline).not.toBeNull();
      expect(baseline!.meanKwh).toBe(40);
      expect(baseline!.sampleSize).toBe(24);
    });
  });

  describe('candidateWindowStart', () => {
    it('returns the event timestamp when present', () => {
      const eventTs = new Date(Date.UTC(2026, 8, 12, 14));
      const readings = Array.from({ length: 24 }, (_, h) => r(50, 1, h));
      expect(calc.candidateWindowStart(readings, eventTs)).toEqual(eventTs);
    });

    it('returns the median timestamp when no event exists', () => {
      const readings: Reading[] = [
        ...Array.from({ length: 12 }, (_, h) => r(50, 1, h)),
        ...Array.from({ length: 12 }, (_, h) => r(50, 2, h)),
      ];
      const start = calc.candidateWindowStart(readings, null);
      expect(start).not.toBeNull();
      // With 24 sorted readings, the midpoint is index 12, i.e. the
      // first reading of the second half (day 2, hour 0).
      expect(start!.getUTCDate()).toBe(2);
      expect(start!.getUTCHours()).toBe(0);
    });
  });
});
