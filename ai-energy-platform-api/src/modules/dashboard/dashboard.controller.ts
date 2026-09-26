import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryResponse } from './dto/dashboard-summary-response.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  async summary(): Promise<DashboardSummaryResponse> {
    return this.service.getSummary();
  }
}
