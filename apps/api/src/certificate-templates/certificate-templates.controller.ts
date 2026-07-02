import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CertificateTemplatesService } from './certificate-templates.service';
import {
  CreateCertificateTemplateDto,
  UpdateCertificateTemplateDto,
} from './dto/certificate-templates.dto';
import { PreviewCertificateTemplateDto } from './dto/preview-certificate-template.dto';

@Controller('certificate-templates')
@AdminOnly()
export class CertificateTemplatesController {
  constructor(private templates: CertificateTemplatesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.templates.list(user.school_id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCertificateTemplateDto,
  ) {
    return this.templates.create(user.school_id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templates.getById(user.school_id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCertificateTemplateDto,
  ) {
    return this.templates.update(user.school_id, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.templates.remove(user.school_id, id);
    return { ok: true };
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file required');
    }
    return this.templates.uploadLogo(user.school_id, id, file);
  }

  @Post(':id/background')
  @UseInterceptors(FileInterceptor('file'))
  uploadBackground(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file required');
    }
    return this.templates.uploadBackground(user.school_id, id, file);
  }

  @Get(':id/asset')
  async getAsset(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException('key required');
    }
    const { buffer, mime } = await this.templates.getTemplateAsset(
      user.school_id,
      id,
      key,
    );
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  @Post(':id/preview')
  @HttpCode(200)
  async preview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: PreviewCertificateTemplateDto,
    @Res() res: Response,
  ) {
    const pdf = await this.templates.previewPdf(
      user.school_id,
      id,
      body?.certificateProfileId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  }
}
