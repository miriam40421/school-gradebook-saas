import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class GenerateCertificatesBodyDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  termId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
