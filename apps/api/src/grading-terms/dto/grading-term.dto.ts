import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGradingTermDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateGradingTermDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
