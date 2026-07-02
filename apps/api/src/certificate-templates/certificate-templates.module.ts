import { Module } from '@nestjs/common';
import { CertificatesModule } from '../certificates/certificates.module';
import { CertificateTemplatesController } from './certificate-templates.controller';
import { CertificateTemplatesService } from './certificate-templates.service';

@Module({
  imports: [CertificatesModule],
  controllers: [CertificateTemplatesController],
  providers: [CertificateTemplatesService],
  exports: [CertificateTemplatesService],
})
export class CertificateTemplatesModule {}
