import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateIf } from 'class-validator';



export class CreateClassDto {

  @IsString()

  @MinLength(1)

  name!: string;



  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;



  @IsOptional()

  @IsString()

  @MinLength(1)

  yearHebrew?: string;



  @IsUUID()

  homeroomTeacherId!: string;

  @IsOptional()
  @IsString()
  certificateProfileId?: string | null;
}



export class UpdateClassDto {

  @IsOptional()

  @IsString()

  @MinLength(1)

  name?: string;



  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;



  @IsOptional()

  @IsString()

  yearHebrew?: string | null;



  @IsOptional()
  @ValidateIf((_o, value) => value != null)
  @IsUUID()
  homeroomTeacherId?: string | null;

  @IsOptional()
  @IsString()
  certificateProfileId?: string | null;
}

