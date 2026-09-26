import * as path from 'node:path';
import { CsvImportService } from '../src/infrastructure/import/csv-import.service';
import { CsvParser } from '../src/infrastructure/import/csv-parser';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const readingsPath = path.join(repoRoot, 'data', 'readings.csv');
  const eventsPath = path.join(repoRoot, 'data', 'events.csv');

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const parser = new CsvParser();
    const importer = new CsvImportService(prisma, parser);
    const report = await importer.import(readingsPath, eventsPath);
    // eslint-disable-next-line no-console
    console.log(
      `Seed complete: ${report.meters} meters, ${report.readings} readings, ${report.events} events`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
