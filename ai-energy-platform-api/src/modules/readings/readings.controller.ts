import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListReadingsQueryDto } from './dto/list-readings-query.dto';
import { ReadingResponse } from './dto/reading-response.dto';
import { ReadingsService } from './readings.service';

@Controller('meters/:meterId/readings')
export class ReadingsController {
  constructor(private readonly service: ReadingsService) {}

  @Get()
  async list(
    @Param('meterId') meterId: string,
    @Query() query: ListReadingsQueryDto,
  ): Promise<ReadingResponse[]> {
    return this.service.listByMeter(meterId, query);
  }
}
