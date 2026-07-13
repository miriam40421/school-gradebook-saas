import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class UpsertCertificateSupplementItemDto {
  @IsUUID()
  studentId!: string;

  @IsOptional()
  @IsString()
  absences?: string | null;

  @IsOptional()
  @IsString()
  lateness?: string | null;

  @IsOptional()
  @IsString()
  hourAbsences?: string | null;

  @IsOptional()
  @IsString()
  hourLateness?: string | null;

  @IsOptional()
  @IsString()
  evaluation?: string | null;

  @IsOptional()
  @IsString()
  homeroomSignature?: string | null;

  @IsOptional()
  @IsString()
  principalSignature?: string | null;

  @IsOptional()
  @IsObject()
  gradeComments?: Record<string, string | null>;

  @IsOptional()
  @IsObject()
  nikudOverrides?: Record<string, string>;
}

export class UpsertCertificateSupplementsBodyDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  termId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCertificateSupplementItemDto)
  items!: UpsertCertificateSupplementItemDto[];
}
