import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import {
  AiExplanationResponse,
  GenerateForMeterResponse,
} from './dto/ai-explanation-response.dto';
import { IsBoolean, IsOptional } from 'class-validator';

class GenerateExplanationBody {
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

@Controller()
export class AiAnalysisController {
  constructor(private readonly service: AiAnalysisService) {}

  @Post('anomalies/:id/explanation')
  async explainAnomaly(
    @Param('id') id: string,
    @Body() _body: GenerateExplanationBody,
  ): Promise<AiExplanationResponse> {
    return this.service.explainAnomaly(id);
  }

  @Post('meters/:meterId/anomalies/explanations')
  async explainForMeter(
    @Param('meterId') meterId: string,
    @Body() _body: GenerateExplanationBody,
  ): Promise<GenerateForMeterResponse> {
    return this.service.explainAllForMeter(meterId);
  }
}
