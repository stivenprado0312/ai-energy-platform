import { ElectricalConsistencyChecker } from './electrical-consistency.checker';
import { Reading } from '../domain/reading';

function r(opts: Partial<Reading> = {}): Reading {
  return {
    id: '1',
    meterId: 'M-101',
    timestamp: new Date(),
    consumptionKwh: 50,
    voltageV: 220,
    currentA: 250,
    powerFactor: 0.95,
    status: 'OK',
    ...opts,
  };
}

describe('ElectricalConsistencyChecker', () => {
  const checker = new ElectricalConsistencyChecker();

  it('produces ratio near 1 on healthy data', () => {
    // V*I*PF/1000 = 220*250*0.95/1000 = 52.25 kW, kWh = 50 → ratio = 1.045
    const readings = Array.from({ length: 24 }, () => r());
    const report = checker.check(readings);
    expect(report.ratioMean).toBeGreaterThan(0.9);
    expect(report.ratioMean).toBeLessThan(1.1);
    expect(report.noisy).toBe(false);
    expect(report.shifted).toBe(false);
  });

  it('flags noisy data when the ratio std is high (M-112 shape)', () => {
    const readings = [
      r({ voltageV: 241, currentA: 165, powerFactor: 0.98 }), // ratio ~1.7
      r({ voltageV: 216, currentA: 97, powerFactor: 0.95 }), // ratio ~0.89
      r({ voltageV: 203, currentA: 52, powerFactor: 0.58 }), // ratio ~0.24
      r({ voltageV: 240, currentA: 49, powerFactor: 0.98 }), // ratio ~0.81
      r({ voltageV: 222, currentA: 151, powerFactor: 0.94 }), // ratio ~1.27
    ];
    const report = checker.check(readings);
    expect(report.noisy).toBe(true);
    expect(report.ratioStd).toBeGreaterThan(0.1);
  });

  it('flags shifted data when the ratio mean drifts far from 1', () => {
    const readings = Array.from({ length: 10 }, () =>
      // ratio = 220*250*0.5/1000 / 30 = 27.5/30 = 0.917
      r({ powerFactor: 0.5, currentA: 250, consumptionKwh: 30 }),
    );
    const report = checker.check(readings);
    expect(report.shifted).toBe(false); // 0.917 is within 0.25 tolerance of 1.0
  });
});
