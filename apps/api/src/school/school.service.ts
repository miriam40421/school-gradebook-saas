import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeCertificateProfiles } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PORT, type StoragePort } from '../storage/storage.port';
import { UpdateSchoolDto } from './dto/update-school.dto';

const LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class SchoolService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PORT) private storage: StoragePort,
  ) {}

  async getProfile(schoolId: string) {
    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException();
    }
    return {
      id: school.id,
      name: school.name,
      settingsJson: school.settingsJson,
      logoStorageKey: school.logoStorageKey ?? null,
    };
  }

  async uploadLogo(schoolId: string, file: Express.Multer.File): Promise<{ storageKey: string }> {
    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    if (!school) throw new NotFoundException();

    if (!LOGO_MIME.has(file.mimetype)) throw new BadRequestException('Invalid image file type');
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException('Image file exceeds 2 MB limit');

    const ext =
      file.mimetype === 'image/png' ? 'png'
      : file.mimetype === 'image/jpeg' ? 'jpg'
      : file.mimetype === 'image/webp' ? 'webp'
      : 'svg';
    const storageKey = `${schoolId}/school/logo.${ext}`;
    await this.storage.putObject(storageKey, file.buffer, file.mimetype);
    await this.prisma.school.update({ where: { id: schoolId }, data: { logoStorageKey: storageKey } });
    return { storageKey };
  }

  async getLogoAsset(schoolId: string): Promise<{ buffer: Buffer; mime: string }> {
    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    if (!school?.logoStorageKey) throw new NotFoundException();
    const key = school.logoStorageKey;
    const buffer = await this.storage.getObject(key);
    const mime =
      key.endsWith('.svg') ? 'image/svg+xml'
      : key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg'
      : key.endsWith('.webp') ? 'image/webp'
      : 'image/png';
    return { buffer, mime };
  }

  private async validateCertificateProfileTemplates(
    schoolId: string,
    settingsJson: Record<string, unknown>,
  ): Promise<void> {
    const { profiles } = normalizeCertificateProfiles(settingsJson);
    for (const profile of profiles) {
      const templateId = profile.templateId;
      if (!templateId) continue;
      const exists = await this.prisma.certificateTemplate.findFirst({
        where: { id: templateId, schoolId },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException({
          code: 'TEMPLATE_NOT_FOUND',
          message: `Certificate template not found for profile "${profile.name}"`,
        });
      }
    }
  }

  async update(schoolId: string, dto: UpdateSchoolDto) {
    const existing = await this.prisma.school.findFirst({ where: { id: schoolId } });
    if (!existing) {
      throw new NotFoundException();
    }
    const data: Prisma.SchoolUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.settingsJson !== undefined) {
      await this.validateCertificateProfileTemplates(schoolId, dto.settingsJson);
      data.settingsJson = dto.settingsJson as Prisma.InputJsonValue;
    }
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data,
    });
    return {
      id: school.id,
      name: school.name,
      settingsJson: school.settingsJson,
    };
  }
}
