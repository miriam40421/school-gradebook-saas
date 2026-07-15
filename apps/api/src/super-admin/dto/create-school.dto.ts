import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(1)
  schoolName!: string;

  @IsString()
  @MinLength(1)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

}
