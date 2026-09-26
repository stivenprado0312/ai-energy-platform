import { Module } from '@nestjs/common';
import { PrismaMeterRepository } from './infrastructure/prisma-meter.repository';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';

@Module({
  controllers: [MetersController],
  providers: [MetersService, PrismaMeterRepository],
  exports: [MetersService],
})
export class MetersModule {}
