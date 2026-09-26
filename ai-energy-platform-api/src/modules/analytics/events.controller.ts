import { Controller, Get, Param } from '@nestjs/common';
import { PrismaEventRepository } from './infrastructure/prisma-event.repository';
import { ValidationError } from '../../shared/errors/validation.error';
import { MeterEvent } from './domain/evidence.types';

const METER_ID_PATTERN = /^M-\d{3}$/;

@Controller('meters/:meterId/events')
export class EventsController {
  constructor(private readonly events: PrismaEventRepository) {}

  @Get()
  async listForMeter(
    @Param('meterId') meterId: string,
  ): Promise<MeterEvent[]> {
    if (!METER_ID_PATTERN.test(meterId)) {
      throw new ValidationError(`Invalid meter id format: ${meterId}`);
    }
    return this.events.findByMeter(meterId);
  }
}
