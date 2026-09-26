import { ImportError } from '../../shared/errors/import.error';
import { CsvParser } from './csv-parser';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

function tmpFile(name: string, contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-parser-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, contents, 'utf-8');
  return file;
}

describe('CsvParser', () => {
  const parser = new CsvParser();

  describe('parseReadings', () => {
    it('parses a valid readings CSV', async () => {
      const file = tmpFile(
        'readings.csv',
        [
          'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status',
          'M-101,2026-09-01 00:00,23.5,221.9,101.28,0.954,OK',
          'M-101,2026-09-01 01:00,20.11,221.15,100.49,0.935,OK',
        ].join('\n'),
      );

      const result = await parser.parseReadings(file);

      expect(result).toHaveLength(2);
      expect(result[0].meterId).toBe('M-101');
      expect(result[0].timestamp.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(result[0].consumptionKwh).toBeCloseTo(23.5);
      expect(result[0].voltageV).toBeCloseTo(221.9);
      expect(result[0].currentA).toBeCloseTo(101.28);
      expect(result[0].powerFactor).toBeCloseTo(0.954);
      expect(result[0].status).toBe('OK');
    });

    it('rejects an invalid timestamp', async () => {
      const file = tmpFile(
        'bad.csv',
        'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status\nM-101,not-a-date,1,220,100,0.9,OK',
      );

      await expect(parser.parseReadings(file)).rejects.toBeInstanceOf(ImportError);
    });

    it('rejects a non-numeric numeric field', async () => {
      const file = tmpFile(
        'bad.csv',
        'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status\nM-101,2026-09-01 00:00,abc,220,100,0.9,OK',
      );

      await expect(parser.parseReadings(file)).rejects.toBeInstanceOf(ImportError);
    });

    it('rejects a wrong column count', async () => {
      const file = tmpFile(
        'bad.csv',
        'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status\nM-101,2026-09-01 00:00,23.5,220',
      );

      await expect(parser.parseReadings(file)).rejects.toBeInstanceOf(ImportError);
    });

    it('rejects duplicate (meter, timestamp) within the CSV', async () => {
      const file = tmpFile(
        'dup.csv',
        [
          'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status',
          'M-101,2026-09-01 00:00,1,220,100,0.9,OK',
          'M-101,2026-09-01 00:00,2,220,100,0.9,OK',
        ].join('\n'),
      );

      await expect(parser.parseReadings(file)).rejects.toBeInstanceOf(ImportError);
    });

    it('rejects a wrong header', async () => {
      const file = tmpFile(
        'bad.csv',
        'foo,bar,baz\n1,2,3',
      );

      await expect(parser.parseReadings(file)).rejects.toBeInstanceOf(ImportError);
    });

    it('returns empty when only the header is present', async () => {
      const file = tmpFile(
        'empty.csv',
        'meter_id,timestamp,consumption_kwh,voltage_v,current_a,power_factor,status',
      );

      const result = await parser.parseReadings(file);

      expect(result).toEqual([]);
    });

    it('rejects a missing file', async () => {
      await expect(parser.parseReadings('/no/such/file.csv')).rejects.toBeInstanceOf(
        ImportError,
      );
    });
  });

  describe('parseEvents', () => {
    it('parses a valid events CSV', async () => {
      const file = tmpFile(
        'events.csv',
        'meter_id,timestamp,type,description\nM-104,2026-09-11 00:00,OPERATIONAL_CHANGE,New production line',
      );

      const result = await parser.parseEvents(file);

      expect(result).toHaveLength(1);
      expect(result[0].meterId).toBe('M-104');
      expect(result[0].type).toBe('OPERATIONAL_CHANGE');
      expect(result[0].timestamp.toISOString()).toBe('2026-09-11T00:00:00.000Z');
    });

    it('rejects a wrong events header', async () => {
      const file = tmpFile('bad.csv', 'foo,bar,baz,qux\n1,2,3,4');
      await expect(parser.parseEvents(file)).rejects.toBeInstanceOf(ImportError);
    });
  });

  describe('parseMeters', () => {
    it('returns the union of meter codes from readings and events, sorted', async () => {
      const result = await parser.parseMeters(
        [
          {
            meterId: 'M-102',
            timestamp: new Date(),
            consumptionKwh: 1,
            voltageV: 220,
            currentA: 100,
            powerFactor: 0.9,
            status: 'OK',
          },
          {
            meterId: 'M-101',
            timestamp: new Date(),
            consumptionKwh: 1,
            voltageV: 220,
            currentA: 100,
            powerFactor: 0.9,
            status: 'OK',
          },
        ],
        [
          {
            meterId: 'M-103',
            timestamp: new Date(),
            type: 'OPERATIONAL_CHANGE',
            description: '',
          },
        ],
      );

      expect(result.map((m) => m.code)).toEqual(['M-101', 'M-102', 'M-103']);
    });
  });
});
