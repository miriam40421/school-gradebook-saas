import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateGradingSetTypeDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'key must be lowercase letters, digits, underscore; start with a letter',
  })
  key?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateGradingSetTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
