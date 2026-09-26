import { PersistentDeviationDetector } from './persistent-deviation.detector';
import { Reading } from '../domain/reading';

function r(consumption: number, day: number, hour: number): Reading {
  return {
    id: `${day}-${hour}`,
    meterId: 'M-104',
    timestamp: new Date(Date.UTC(2026, 8, day, hour)),
    consumptionKwh: consumption,
    voltageV: 220,
    currentA: 100,
    powerFactor: 0.95,
    status: 'OK',
  };
}

const baseline = { meanKwh: 50, stdKwh: 5, sampleSize: 24, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: new Array(24).fill(50) };

describe('PersistentDeviationDetector', () => {
  const detector = new PersistentDeviationDetector();

  it('finds a sustained 12h outage with -85% deviation', () => {
    const candidateStart = new Date(Date.UTC(2026, 8, 8, 0));
    const readings: Reading[] = [
      ...Array.from({ length: 12 }, (_, h) => r(8, 8, h)), // 12h outage
      ...Array.from({ length: 12 }, (_, h) => r(50, 8, h + 12)), // recovery to baseline
    ];
    const result = detector.detect({ readings, candidateStart, baseline, spikes: [] });
    expect(result).not.toBeNull();
    expect(result!.durationHours).toBe(12);
    expect(result!.deviationPct).toBeLessThan(-50);
  });

  it('finds a 96h sustained +47% deviation (M-104 shape)', () => {
    const candidateStart = new Date(Date.UTC(2026, 8, 11, 0));
    const readings: Reading[] = [];
    for (let h = 0; h < 96; h++) {
      const day = 11 + Math.floor(h / 24);
      const hour = h % 24;
      readings.push(r(73, day, hour));
    }
    const result = detector.detect({ readings, candidateStart, baseline, spikes: [] });
    expect(result).not.toBeNull();
    expect(result!.durationHours).toBe(96);
    expect(result!.deviationPct).toBeGreaterThan(40);
    expect(result!.deviationPct).toBeLessThan(55);
  });

  it('finds a 58h sustained +112% deviation (M-109 shape)', () => {
    const candidateStart = new Date(Date.UTC(2026, 8, 12, 14));
    const readings: Reading[] = [];
    for (let i = 0; i < 58; i++) {
      const hour = 14 + i;
      const day = 12 + Math.floor(hour / 24);
      const hh = hour % 24;
      readings.push(r(105, day, hh));
    }
    const result = detector.detect({ readings, candidateStart, baseline, spikes: [] });
    expect(result).not.toBeNull();
    expect(result!.durationHours).toBe(58);
    expect(result!.deviationPct).toBeGreaterThan(100);
  });

  it('returns null when the candidate window is too small', () => {
    const candidateStart = new Date(Date.UTC(2026, 8, 8, 0));
    const readings: Reading[] = [
      r(50, 8, 0),
      r(50, 8, 1),
      r(50, 8, 2),
    ];
    expect(
      detector.detect({ readings, candidateStart, baseline, spikes: [] }),
    ).toBeNull();
  });

  it('returns null when the candidate window has no significant deviation', () => {
    const candidateStart = new Date(Date.UTC(2026, 8, 8, 0));
    const readings: Reading[] = Array.from({ length: 24 }, (_, h) => r(52, 8, h));
    expect(
      detector.detect({ readings, candidateStart, baseline, spikes: [] }),
    ).toBeNull();
  });
});
