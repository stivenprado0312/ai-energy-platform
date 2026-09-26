import { OutlierDetector } from './outlier.detector';
import { Reading } from '../domain/reading';

function makeReading(over: Partial<Reading> = {}): Reading {
  return {
    id: '1',
    meterId: 'M-112',
    timestamp: new Date(),
    consumptionKwh: 30,
    voltageV: 220,
    currentA: 140,
    powerFactor: 0.95,
    status: 'OK',
    ...over,
  };
}

describe('OutlierDetector', () => {
  const detector = new OutlierDetector();

  it('returns zero counters on nominal data', () => {
    const readings = Array.from({ length: 24 }, () => makeReading());
    const out = detector.detect(readings);
    expect(out.voltage).toBe(0);
    expect(out.powerFactor).toBe(0);
    expect(out.current).toBe(0);
    expect(out.total).toBe(0);
  });

  it('counts voltage outliers outside the nominal band', () => {
    const readings = [
      makeReading({ voltageV: 240 }),
      makeReading({ voltageV: 200 }),
      makeReading(),
    ];
    const out = detector.detect(readings);
    expect(out.voltage).toBe(2);
  });

  it('counts power-factor outliers below the configured minimum', () => {
    const readings = [
      makeReading({ powerFactor: 0.7 }),
      makeReading({ powerFactor: 0.5 }),
      makeReading(),
    ];
    const out = detector.detect(readings);
    expect(out.powerFactor).toBe(2);
  });

  it('counts current outliers outside the configured band', () => {
    const readings = [
      makeReading({ currentA: 0.5 }),
      makeReading({ currentA: 700 }),
      makeReading(),
    ];
    const out = detector.detect(readings);
    expect(out.current).toBe(2);
  });

  it('detects the M-112 pattern: 16/48 voltage + 12/48 pf outliers', () => {
    const normal: Reading[] = Array.from({ length: 32 }, () => makeReading());
    const badV: Reading[] = Array.from({ length: 16 }, () =>
      makeReading({ voltageV: 240, powerFactor: 0.95 }),
    );
    const badPF: Reading[] = Array.from({ length: 12 }, () =>
      makeReading({ voltageV: 220, powerFactor: 0.58 }),
    );
    const out = detector.detect([...normal, ...badV, ...badPF]);
    expect(out.voltage).toBe(16);
    expect(out.powerFactor).toBe(12);
  });
});
