import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CertificatesService } from './certificates.service';
import { GenerateCertificatesBodyDto } from './dto/certificates.dto';
import { UpsertCertificateSupplementsBodyDto } from './dto/certificate-supplements.dto';

@Controller('certificates')
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}

  @Get('supplement-context')
  @Authenticated()
  supplementContext(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.certificates.getSupplementContext(user, classId, termId);
  }

  @Put('supplements')
  @Authenticated()
  upsertSupplements(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertCertificateSupplementsBodyDto,
  ) {
    return this.certificates.upsertSupplements(user, dto);
  }

  @Post('generate')
  @Authenticated()
  generate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateCertificatesBodyDto,
  ) {
    return this.certificates.generate(user, dto);
  }

  @Get('snapshots')
  @Authenticated()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.certificates.listSnapshots(user, classId, termId);
  }

  @Get('snapshots/:id')
  @Authenticated()
  detail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.certificates.getSnapshot(user, id);
  }

  @Post('nikud-text')
  @Authenticated()
  @HttpCode(200)
  async nikudText(
    @CurrentUser() user: JwtPayload,
    @Body() body: { text: string },
  ) {
    const result = await this.certificates.nikudText(user, body.text);
    return { result };
  }

  @Get('snapshots/:id/preview-html')
  @Authenticated()
  async previewHtml(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.certificates.getPreviewHtml(user, id);
    (res as unknown as import('express').Response)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .send(html);
  }

  @Get('snapshots/:id/pdf')
  @Authenticated()
  async pdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.certificates.getPdfBuffer(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${id}.pdf"`);
    res.send(buffer);
  }
}
