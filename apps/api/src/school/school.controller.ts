import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Express } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolService } from './school.service';

@Controller('school')
@AdminOnly()
export class SchoolController {
  constructor(private school: SchoolService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.school.getProfile(user.school_id);
  }

  @Patch()
  patch(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSchoolDto) {
    return this.school.update(user.school_id, dto);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.school.uploadLogo(user.school_id, file);
  }

  @Get('logo-asset')
  async getLogoAsset(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const { buffer, mime } = await this.school.getLogoAsset(user.school_id);
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.end(buffer);
  }
}
