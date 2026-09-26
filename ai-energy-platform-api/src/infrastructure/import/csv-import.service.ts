import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CsvParser } from './csv-parser';
import { ValidatedEvent, ValidatedMeter, ValidatedReading } from './csv-row.types';

export interface ImportReport {
  meters: number;
  readings: number;
  events: number;
  readingsSkipped: number;
}

const BATCH_SIZE = 500;

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: CsvParser,
  ) {}

  async import(readingsPath: string, eventsPath: string): Promise<ImportReport> {
    this.logger.log(`Importing readings from ${readingsPath}`);
    const readings = await this.parser.parseReadings(readingsPath);
    this.logger.log(`Importing events from ${eventsPath}`);
    const events = await this.parser.parseEvents(eventsPath);
    const meters = await this.parser.parseMeters(readings, events);

    await this.persist(meters, readings, events);

    return {
      meters: meters.length,
      readings: readings.length,
      events: events.length,
      readingsSkipped: 0,
    };
  }

  private async persist(
    meters: ValidatedMeter[],
    readings: ValidatedReading[],
    events: ValidatedEvent[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.meter.createMany({
        data: meters.map((m) => ({ code: m.code })),
        skipDuplicates: true,
      });

      for (let i = 0; i < readings.length; i += BATCH_SIZE) {
        const batch = readings.slice(i, i + BATCH_SIZE).map((r) => ({
          meterId: r.meterId,
          timestamp: r.timestamp,
          consumptionKwh: r.consumptionKwh,
          voltageV: r.voltageV,
          currentA: r.currentA,
          powerFactor: r.powerFactor,
          status: r.status,
        }));
        await tx.reading.createMany({ data: batch, skipDuplicates: true });
      }

      if (events.length > 0) {
        await tx.event.createMany({
          data: events.map((e) => ({
            meterId: e.meterId,
            timestamp: e.timestamp,
            type: e.type,
            description: e.description,
          })),
        });
      }
    });
  }
}
