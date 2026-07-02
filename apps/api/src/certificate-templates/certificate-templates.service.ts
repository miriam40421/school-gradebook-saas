import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Express } from 'express';
import type {
  CertificateTemplateDetailDto,
  CertificateTemplateLayoutV1,
  CertificateTemplateSummaryDto,
  SchoolCertificateSettingsJson,
} from '@school/shared';
import {
  normalizeCertificateProfiles,
  resolveCertificatePrefsForClass,
  resolveCertificateProfile,
  resolveProfileSubjects,
  type CertificateProfileDto,
} from '@school/shared';
import {
  layoutSerializedSize,
  LayoutValidationError,
  validateLayoutJson,
  clampLayoutToPrintableArea,
} from '@school/certificate-layout';
import { renderTemplatePdf } from './template-render.util';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PORT, type StoragePort } from '../storage/storage.port';
import { PDF_RENDER_SERVICE, type PdfRenderService } from '../certificates/pdf-render.port';
import { buildDemoCertificateSnapshot } from './demo-snapshot.fixture';
import { createDefaultLayoutScaffold } from './layout-scaffold.util';
import {
  CreateCertificateTemplateDto,
  UpdateCertificateTemplateDto,
} from './dto/certificate-templates.dto';

const LOGO_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class CertificateTemplatesService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PORT) private storage: StoragePort,
    @Inject(PDF_RENDER_SERVICE) private pdfRender: PdfRenderService,
  ) {}

  private mapSummary(row: {
    id: string;
    name: string;
    orientation: string;
    layoutVersion: number;
    updatedAt: Date;
  }): CertificateTemplateSummaryDto {
    return {
      id: row.id,
      name: row.name,
      orientation: row.orientation as CertificateTemplateSummaryDto['orientation'],
      layoutVersion: row.layoutVersion,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapDetail(row: {
    id: string;
    name: string;
    orientation: string;
    layoutJson: unknown;
    layoutSchemaVersion: number;
    layoutVersion: number;
    logoStorageKey: string | null;
    updatedAt: Date;
  }): CertificateTemplateDetailDto {
    return {
      ...this.mapSummary(row),
      layoutJson: row.layoutJson as CertificateTemplateLayoutV1,
      layoutSchemaVersion: row.layoutSchemaVersion,
      logoStorageKey: row.logoStorageKey,
    };
  }

  async list(schoolId: string): Promise<CertificateTemplateSummaryDto[]> {
    const rows = await this.prisma.certificateTemplate.findMany({
      where: { schoolId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.mapSummary(r));
  }

  async create(
    schoolId: string,
    dto: CreateCertificateTemplateDto,
  ): Promise<CertificateTemplateDetailDto> {
    const layoutJson = createDefaultLayoutScaffold(dto.orientation);
    const row = await this.prisma.certificateTemplate.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        orientation: dto.orientation,
        layoutJson,
        layoutSchemaVersion: 1,
        layoutVersion: 1,
      },
    });
    return this.mapDetail(row);
  }

  async getById(schoolId: string, id: string): Promise<CertificateTemplateDetailDto> {
    const row = await this.prisma.certificateTemplate.findFirst({
      where: { id, schoolId },
    });
    if (!row) throw new NotFoundException();
    return this.mapDetail(row);
  }

  private validateLayout(layoutJson: unknown): CertificateTemplateLayoutV1 {
    const size = layoutSerializedSize(layoutJson);
    try {
      return validateLayoutJson(layoutJson, size);
    } catch (err) {
      const msg = err instanceof LayoutValidationError ? err.message : 'Invalid layout';
      throw new BadRequestException(msg);
    }
  }

  async update(
    schoolId: string,
    id: string,
    dto: UpdateCertificateTemplateDto,
  ): Promise<CertificateTemplateDetailDto> {
    const existing = await this.prisma.certificateTemplate.findFirst({
      where: { id, schoolId },
    });
    if (!existing) throw new NotFoundException();

    const data: {
      name?: string;
      layoutJson?: CertificateTemplateLayoutV1;
      layoutVersion?: number;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.layoutJson !== undefined) {
      const clamped = clampLayoutToPrintableArea(dto.layoutJson);
      const validated = this.validateLayout(clamped);
      if (validated.page.orientation !== existing.orientation) {
        throw new BadRequestException('Cannot change orientation via layout save');
      }
      data.layoutJson = validated;
      data.layoutVersion = existing.layoutVersion + 1;
    }

    const row = await this.prisma.certificateTemplate.update({
      where: { id },
      data,
    });
    return this.mapDetail(row);
  }

  findProfilesReferencingTemplate(
    settingsJson: unknown,
    templateId: string,
  ): CertificateProfileDto[] {
    const { profiles } = normalizeCertificateProfiles(
      settingsJson as SchoolCertificateSettingsJson,
    );
    return profiles.filter((p) => p.templateId === templateId);
  }

  async remove(schoolId: string, id: string): Promise<void> {
    const existing = await this.prisma.certificateTemplate.findFirst({
      where: { id, schoolId },
    });
    if (!existing) throw new NotFoundException();

    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    const linked = school
      ? this.findProfilesReferencingTemplate(school.settingsJson, id)
      : [];
    if (linked.length > 0) {
      throw new ConflictException({
        message: 'Template is linked from certificate profiles',
        code: 'TEMPLATE_LINKED',
        profileNames: linked.map((p) => p.name),
      });
    }

    if (existing.logoStorageKey) {
      try {
        if (this.storage.deleteObject) {
          await this.storage.deleteObject(existing.logoStorageKey);
        }
      } catch {
        // Best-effort logo cleanup.
      }
    }

    await this.prisma.certificateTemplate.delete({ where: { id } });
  }

  async uploadLogo(
    schoolId: string,
    templateId: string,
    file: Express.Multer.File,
  ): Promise<{ storageKey: string }> {
    return this.uploadTemplateImage(schoolId, templateId, file, 'logo');
  }

  async uploadBackground(
    schoolId: string,
    templateId: string,
    file: Express.Multer.File,
  ): Promise<{ storageKey: string }> {
    return this.uploadTemplateImage(schoolId, templateId, file, 'background');
  }

  private async uploadTemplateImage(
    schoolId: string,
    templateId: string,
    file: Express.Multer.File,
    kind: 'logo' | 'background',
  ): Promise<{ storageKey: string }> {
    const existing = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!existing) throw new NotFoundException();

    if (!LOGO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Invalid image file type');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('Image file exceeds 2 MB limit');
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/jpeg'
          ? 'jpg'
          : file.mimetype === 'image/webp'
            ? 'webp'
            : 'svg';
    const storageKey = `${schoolId}/certificate-templates/${templateId}/${kind}.${ext}`;

    await this.storage.putObject(storageKey, file.buffer, file.mimetype);
    if (kind === 'logo') {
      await this.prisma.certificateTemplate.update({
        where: { id: templateId },
        data: { logoStorageKey: storageKey },
      });
    }

    return { storageKey };
  }

  async getTemplateAsset(
    schoolId: string,
    templateId: string,
    storageKey: string,
  ): Promise<{ buffer: Buffer; mime: string }> {
    const existing = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!existing) throw new NotFoundException();

    const key = storageKey.trim();
    if (!key.startsWith(`${schoolId}/certificate-templates/${templateId}/`)) {
      throw new BadRequestException('Invalid asset key');
    }

    const buffer = await this.storage.getObject(key);
    const mime =
      key.endsWith('.svg')
        ? 'image/svg+xml'
        : key.endsWith('.jpg') || key.endsWith('.jpeg')
          ? 'image/jpeg'
          : key.endsWith('.webp')
            ? 'image/webp'
            : 'image/png';
    return { buffer, mime };
  }

  async previewPdf(
    schoolId: string,
    templateId: string,
    certificateProfileId?: string | null,
  ): Promise<Buffer> {
    const template = await this.getById(schoolId, templateId);
    const school = await this.prisma.school.findFirst({ where: { id: schoolId } });
    const settings = (school?.settingsJson ?? {}) as Record<string, unknown>;
    const { defaultProfileId } = normalizeCertificateProfiles(settings);
    const profileId = certificateProfileId ?? defaultProfileId;
    const profile = resolveCertificateProfile(settings, profileId);
    const prefs = resolveCertificatePrefsForClass(settings, profileId);

    const [gradingSetTypes, subjectRows] = await Promise.all([
      this.prisma.gradingSetType.findMany({
        where: { schoolId },
        select: { id: true, label: true, parentId: true },
        orderBy: { label: 'asc' },
      }),
      this.prisma.subject.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          gradingSetTypeId: true,
          gradingSetType: { select: { label: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const profileSubjects = resolveProfileSubjects(profile, subjectRows);
    const snapshot = buildDemoCertificateSnapshot(prefs, {
      schoolName: school?.name,
      profileName: profile?.name,
      gradingSetTypes,
      subjects: profileSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        gradingSetTypeId: s.gradingSetTypeId,
        gradingSetTypeLabel: s.gradingSetType.label,
      })),
    });
    return renderTemplatePdf(template, snapshot, this.storage, this.pdfRender);
  }

  async loadTemplateForGenerate(schoolId: string, templateId: string) {
    const row = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!row) return null;
    return this.mapDetail(row);
  }
}
