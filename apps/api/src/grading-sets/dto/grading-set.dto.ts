import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';



export class CreateGradingSetDto {

  @IsString()

  @MinLength(1)

  name!: string;



  @IsUUID()

  gradingSetTypeId!: string;

}



export class UpdateGradingSetDto {

  @IsOptional()

  @IsString()

  @MinLength(1)

  name?: string;



  @IsOptional()

  @IsUUID()

  gradingSetTypeId?: string;

}



export class CreateGradingSetValueDto {

  @IsString()

  @MinLength(1)

  label!: string;



  @IsOptional()

  @IsInt()

  @Min(0)

  order?: number;

}



export class UpdateGradingSetValueDto {

  @IsOptional()

  @IsString()

  @MinLength(1)

  label?: string;



  @IsOptional()

  @IsInt()

  @Min(0)

  order?: number;

}

