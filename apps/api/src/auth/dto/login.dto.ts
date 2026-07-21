import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsUUID()
  schoolId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;
}

export class VerifyMfaDto {
  @IsString()
  @MinLength(1)
  mfaToken!: string;

  @IsString()
  @MinLength(6)
  code!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  rememberDevice?: boolean;
}
