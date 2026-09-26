import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { ImportError } from '../../shared/errors/import.error';
import {
  RawReadingRow,
  ValidatedEvent,
  ValidatedMeter,
  ValidatedReading,
} from './csv-row.types';

const TIMESTAMP_FORMATS = [
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
];

function parseTimestamp(value: string): Date {
  for (const pattern of TIMESTAMP_FORMATS) {
    const m = pattern.exec(value.trim());
    if (m) {
      const [, y, mo, d, h, mi, s = '0'] = m;
      const iso = `${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi.padStart(2, '0')}:${s.padStart(2, '0')}.000Z`;
      const dt = new Date(iso);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }
  throw new ImportError(`Invalid timestamp: ${value}`);
}

function parseFloatStrict(value: string, field: string, row: number): number {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new ImportError(`Empty value for field "${field}" at row ${row}`);
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    throw new ImportError(`Invalid number for field "${field}" at row ${row}: "${value}"`);
  }
  return num;
}

function parseRow(line: string, expectedCols: number, lineNumber: number): string[] {
  const cells = line.split(',').map((c) => c.trim());
  if (cells.length !== expectedCols) {
    throw new ImportError(
      `Expected ${expectedCols} columns at row ${lineNumber}, got ${cells.length}`,
    );
  }
  return cells;
}

async function readCsvFile(path: string): Promise<string[]> {
  if (!fs.existsSync(path)) {
    throw new ImportError(`CSV file not found: ${path}`);
  }
  const stream = fs.createReadStream(path, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }
  return lines;
}

export class CsvParser {
  async parseMeters(readings: ValidatedReading[], events: ValidatedEvent[]): Promise<ValidatedMeter[]> {
    const codes = new Set<string>();
    for (const r of readings) codes.add(r.meterId);
    for (const e of events) codes.add(e.meterId);
    return Array.from(codes)
      .sort()
      .map((code) => ({ code }));
  }

  async parseReadings(path: string): Promise<ValidatedReading[]> {
    const lines = await readCsvFile(path);
    if (lines.length === 0) return [];
    const header = parseRow(lines[0], 7, 1);
    const expected = [
      'meter_id',
      'timestamp',
      'consumption_kwh',
      'voltage_v',
      'current_a',
      'power_factor',
      'status',
    ];
    if (!header.every((h, i) => h === expected[i])) {
      throw new ImportError(
        `Unexpected readings CSV header. Expected ${expected.join(',')} got ${header.join(',')}`,
      );
    }

    const rows: ValidatedReading[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      if (lines[i].trim() === '') continue;
      const cells = parseRow(lines[i], 7, lineNum);
      const row: RawReadingRow = {
        meter_id: cells[0],
        timestamp: cells[1],
        consumption_kwh: cells[2],
        voltage_v: cells[3],
        current_a: cells[4],
        power_factor: cells[5],
        status: cells[6],
      };
      const dedup = `${row.meter_id}|${row.timestamp}`;
      if (seen.has(dedup)) {
        throw new ImportError(`Duplicate reading (meter, timestamp) at row ${lineNum}`);
      }
      seen.add(dedup);

      rows.push({
        meterId: row.meter_id,
        timestamp: parseTimestamp(row.timestamp),
        consumptionKwh: parseFloatStrict(row.consumption_kwh, 'consumption_kwh', lineNum),
        voltageV: parseFloatStrict(row.voltage_v, 'voltage_v', lineNum),
        currentA: parseFloatStrict(row.current_a, 'current_a', lineNum),
        powerFactor: parseFloatStrict(row.power_factor, 'power_factor', lineNum),
        status: row.status,
      });
    }
    return rows;
  }

  async parseEvents(path: string): Promise<ValidatedEvent[]> {
    const lines = await readCsvFile(path);
    if (lines.length === 0) return [];
    const header = parseRow(lines[0], 4, 1);
    const expectedLong = ['meter_id', 'event_timestamp', 'event_type', 'description'];
    const expectedShort = ['meter_id', 'timestamp', 'type', 'description'];
    const isLong = header.every((h, i) => h === expectedLong[i]);
    const isShort = header.every((h, i) => h === expectedShort[i]);
    if (!isLong && !isShort) {
      throw new ImportError(
        `Unexpected events CSV header. Expected ${expectedShort.join(',')} got ${header.join(',')}`,
      );
    }

    const timestampIdx = isLong ? 1 : 1;
    const typeIdx = isLong ? 2 : 2;

    const rows: ValidatedEvent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      if (lines[i].trim() === '') continue;
      const cells = parseRow(lines[i], 4, lineNum);
      rows.push({
        meterId: cells[0],
        timestamp: parseTimestamp(cells[timestampIdx]),
        type: cells[typeIdx],
        description: cells[3],
      });
    }
    return rows;
  }
}
