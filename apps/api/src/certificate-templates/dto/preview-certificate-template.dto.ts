import { IsOptional, IsString } from 'class-validator';

export class PreviewCertificateTemplateDto {
  @IsOptional()
  @IsString()
  certificateProfileId?: string;
}
