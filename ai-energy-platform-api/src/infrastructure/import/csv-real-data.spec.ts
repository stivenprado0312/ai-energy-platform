import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CsvParser } from './csv-parser';
import { ImportError } from '../../shared/errors/import.error';

const dataDir = path.resolve(__dirname, '..', '..', '..', '..', 'data');
const readingsPath = path.join(dataDir, 'readings.csv');
const eventsPath = path.join(dataDir, 'events.csv');

describe('CSV → seed round trip against real data', () => {
  const parser = new CsvParser();

  it('parses the real readings.csv into 4032 readings from 12 meters', async () => {
    const readings = await parser.parseReadings(readingsPath);
    expect(readings).toHaveLength(4032);
    expect(new Set(readings.map((r) => r.meterId)).size).toBe(12);
    for (const r of readings) {
      expect(typeof r.meterId).toBe('string');
      expect(r.timestamp).toBeInstanceOf(Date);
      expect(Number.isFinite(r.consumptionKwh)).toBe(true);
      expect(Number.isFinite(r.voltageV)).toBe(true);
      expect(Number.isFinite(r.currentA)).toBe(true);
      expect(Number.isFinite(r.powerFactor)).toBe(true);
    }
  });

  it('parses the real events.csv into the 4 critical-meter events', async () => {
    const events = await parser.parseEvents(eventsPath);
    expect(events).toHaveLength(4);
    expect(events.map((e) => e.meterId).sort()).toEqual(['M-104', 'M-106', 'M-109', 'M-112']);
  });

  it('builds the 12 meters from the real dataset', async () => {
    const readings = await parser.parseReadings(readingsPath);
    const events = await parser.parseEvents(eventsPath);
    const meters = await parser.parseMeters(readings, events);
    expect(meters).toHaveLength(12);
  });

  it('rejects an invalid timestamp written to a temporary file', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-real-bad-'));
    const bad = path.join(tmp, 'bad.csv');
    fs.writeFileSync(
      bad,
      'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status\nM-101,oops,1,220,100,0.9,OK',
      'utf-8',
    );
    try {
      await expect(parser.parseReadings(bad)).rejects.toBeInstanceOf(ImportError);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
