import { IsBoolean, IsOptional } from 'class-validator';

export class AnalyzeQueryDto {
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

export class AnalyzeBodyDto {
  @IsOptional()
  meterId?: string;

  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}
