import { Module } from '@nestjs/common';
import { PrismaMeterRepository } from '../meters/infrastructure/prisma-meter.repository';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import { PrismaReadingRepository } from './infrastructure/prisma-reading.repository';

@Module({
  controllers: [ReadingsController],
  providers: [ReadingsService, PrismaReadingRepository, PrismaMeterRepository],
  exports: [ReadingsService],
})
export class ReadingsModule {}
