import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { NikudService } from './nikud.service';
import { pdfRenderProvider } from './pdf-render.service';
import { PDF_RENDER_SERVICE } from './pdf-render.port';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, NikudService, pdfRenderProvider],
  exports: [CertificatesService, NikudService, PDF_RENDER_SERVICE],
})
export class CertificatesModule {}
