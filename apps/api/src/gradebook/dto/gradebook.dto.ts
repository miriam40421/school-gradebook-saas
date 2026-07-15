import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BulkGradeUpdateItemDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  value!: string | null;
}

export class BulkGradeUpdateDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  termId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkGradeUpdateItemDto)
  updates!: BulkGradeUpdateItemDto[];
}
