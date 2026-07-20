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
import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { CertificatesService } from './certificates.service';
import { GenerateCertificatesBodyDto } from './dto/certificates.dto';
import { UpsertCertificateSupplementsBodyDto } from './dto/certificate-supplements.dto';

class NikudTextBodyDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

class ClassOverridesDto {
  @IsUUID()
  classId!: string;

  @IsObject()
  overrides!: Record<string, string>;
}

class GradeNikudMapDto {
  @IsUUID()
  classId!: string;

  @IsObject()
  map!: Record<string, string>;
}

@Controller('certificates')
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}

  @Get('supplement-context')
  @Authenticated()
  supplementContext(
    @CurrentUser() user: SchoolUserPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.certificates.getSupplementContext(user, classId, termId);
  }

  @Put('supplements')
  @Authenticated()
  upsertSupplements(
    @CurrentUser() user: SchoolUserPayload,
    @Body() dto: UpsertCertificateSupplementsBodyDto,
  ) {
    return this.certificates.upsertSupplements(user, dto);
  }

  @Post('generate')
  @Authenticated()
  generate(
    @CurrentUser() user: SchoolUserPayload,
    @Body() dto: GenerateCertificatesBodyDto,
  ) {
    return this.certificates.generate(user, dto);
  }

  @Get('snapshots')
  @Authenticated()
  list(
    @CurrentUser() user: SchoolUserPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.certificates.listSnapshots(user, classId, termId);
  }

  @Get('snapshots/:id')
  @Authenticated()
  detail(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.certificates.getSnapshot(user, id);
  }

  @Put('label-overrides')
  @Authenticated()
  @HttpCode(204)
  async upsertLabelOverrides(
    @CurrentUser() user: SchoolUserPayload,
    @Body() body: ClassOverridesDto,
  ) {
    await this.certificates.upsertLabelOverrides(user, body.classId, body.overrides);
  }

  @Put('nikud-class-overrides')
  @Authenticated()
  @HttpCode(204)
  async upsertNikudClassOverrides(
    @CurrentUser() user: SchoolUserPayload,
    @Body() body: ClassOverridesDto,
  ) {
    await this.certificates.upsertNikudClassOverrides(user, body.classId, body.overrides);
  }

  @Put('grade-nikud-map')
  @Authenticated()
  @HttpCode(204)
  async upsertGradeNikudMap(
    @CurrentUser() user: SchoolUserPayload,
    @Body() body: GradeNikudMapDto,
  ) {
    await this.certificates.upsertGradeNikudMap(user, body.classId, body.map);
  }

  @Post('nikud-text')
  @Authenticated()
  @HttpCode(200)
  async nikudText(
    @CurrentUser() user: SchoolUserPayload,
    @Body() body: NikudTextBodyDto,
  ) {
    const result = await this.certificates.nikudText(user, body.text);
    return { result };
  }

  @Get('snapshots/:id/preview-html')
  @Authenticated()
  async previewHtml(
    @CurrentUser() user: SchoolUserPayload,
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
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.certificates.getPdfBuffer(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${id}.pdf"`);
    res.send(buffer);
  }
}
