import { Controller, Get, Param } from '@nestjs/common';
import { MetersService } from './meters.service';
import { MeterDetailResponse, MeterListItem } from './dto/meter-response.dto';

@Controller('meters')
export class MetersController {
  constructor(private readonly service: MetersService) {}

  @Get()
  async list(): Promise<MeterListItem[]> {
    return this.service.listAll();
  }

  @Get(':meterId')
  async detail(@Param('meterId') meterId: string): Promise<MeterDetailResponse> {
    return this.service.getDetail(meterId);
  }
}
