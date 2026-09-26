import { Module } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';
import { CsvParser } from './csv-parser';

@Module({
  providers: [CsvImportService, CsvParser],
  exports: [CsvImportService, CsvParser],
})
export class ImportModule {}
