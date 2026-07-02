import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type {
  CertificateTemplateLayoutV1,
  CertificateTemplateOrientation,
} from '@school/shared';

export class CreateCertificateTemplateDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['portrait', 'landscape'])
  orientation!: CertificateTemplateOrientation;
}

export class UpdateCertificateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsObject()
  layoutJson?: CertificateTemplateLayoutV1;
}
