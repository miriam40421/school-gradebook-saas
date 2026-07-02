import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeCertificateProfiles } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  async getProfile(schoolId: string) {
    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException();
    }
    return {
      id: school.id,
      name: school.name,
      settingsJson: school.settingsJson,
    };
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
