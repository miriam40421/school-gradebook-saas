import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class BulkGradeUpdateItemDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsString()
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
