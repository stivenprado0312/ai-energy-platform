import { SpikeDetector } from './spike.detector';
import { Reading } from '../domain/reading';

function r(consumption: number, hour: number): Reading {
  return {
    id: `${hour}`,
    meterId: 'M-101',
    timestamp: new Date(2026, 8, 1, hour),
    consumptionKwh: consumption,
    voltageV: 220,
    currentA: 100,
    powerFactor: 0.95,
    status: 'OK',
  };
}

describe('SpikeDetector', () => {
  const detector = new SpikeDetector();

  it('returns no spikes when consumption is constant', () => {
    const readings = Array.from({ length: 24 }, (_, h) => r(50, h));
    const baseline = { meanKwh: 50, stdKwh: 0, sampleSize: 24, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: new Array(24).fill(50) };
    expect(detector.detect(readings, baseline)).toEqual([]);
  });

  it('flags readings whose z-score exceeds the threshold', () => {
    const readings = [
      ...Array.from({ length: 23 }, (_, h) => r(50, h)),
      r(200, 23), // huge spike
    ];
    const baseline = { meanKwh: 50, stdKwh: 5, sampleSize: 24, sourceWindowStart: null, sourceWindowEnd: null, hourlyMeanKwh: new Array(24).fill(50) };
    const spikes = detector.detect(readings, baseline);
    expect(spikes).toHaveLength(1);
    expect(spikes[0].consumptionKwh).toBe(200);
    expect(spikes[0].zScore).toBeGreaterThan(3);
  });
});
