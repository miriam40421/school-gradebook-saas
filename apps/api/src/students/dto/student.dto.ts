import { IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const NO_HTML = /^[^<>]*$/;

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(NO_HTML, { message: 'fullName must not contain HTML characters' })
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
  @Matches(NO_HTML, { message: 'fullName must not contain HTML characters' })
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
  @MaxLength(255, { each: true })
  @Matches(NO_HTML, { each: true, message: 'names must not contain HTML characters' })
  names!: string[];
}

export class UpdateStudentGroupMembershipsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  classGroupIds!: string[];
}
