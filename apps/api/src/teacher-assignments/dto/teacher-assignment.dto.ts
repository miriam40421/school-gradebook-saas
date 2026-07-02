import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeacherAssignmentItemDto {
  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  classGroupId?: string | null;
}

export class CreateTeacherAssignmentDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  classId!: string;

  /** @deprecated Use `items` for per-subject group. Kept for compatibility. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsUUID()
  classGroupId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentItemDto)
  items?: TeacherAssignmentItemDto[];
}
export class UpdateTeacherAssignmentDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  classGroupId?: string | null;
}
