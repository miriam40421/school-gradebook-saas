import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsUUID()
  classId!: string;

  @IsOptional()
  @IsUUID()
  classGroupId?: string | null;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  classGroupId?: string | null;
}

export class ImportStudentsDto {
  @IsUUID()
  classId!: string;

  @IsArray()
  @IsString({ each: true })
  names!: string[];
}

export class UpdateStudentGroupMembershipsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  classGroupIds!: string[];
}
