import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  schoolName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  adminName?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  adminPassword?: string;
}
