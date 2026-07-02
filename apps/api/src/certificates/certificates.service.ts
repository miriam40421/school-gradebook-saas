import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CertificatePrefs,
  CertificateSnapshotDetailDto,
  CertificateSnapshotJsonV1,
  CertificateSnapshotSummaryDto,
  CertificateSupplementContextDto,
  CertificateSupplementDto,
  CertificateSupplementInput,
  GenerateCertificatesResultDto,
} from '@school/shared';
import {
  Role,
  resolveCertificatePrefsForClass,
  resolveCertificateProfile,
  resolveCertificateTemplateForProfile,
  resolveCertificateTemplateKeyForClass,
  resolveProfileSubjects,
  type CertificateTemplateDetailDto,
} from '@school/shared';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { canAccessClassForGradebook } from '../gradebook/gradebook-rbac.util';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PORT, type StoragePort } from '../storage/storage.port';
import { PDF_RENDER_SERVICE, type PdfRenderService } from './pdf-render.port';
import {
  buildSnapshotJson,
  enrichSnapshotProfileName,
  mergeSupplementIntoSnapshot,
} from './snapshot-builder.util';
import { nikudSnapshot } from './nikud-snapshot.util';
import { NikudService } from './nikud.service';
import { renderTemplatePdf, renderTemplateHtmlString } from '../certificate-templates/template-render.util';
import { GenerateCertificatesBodyDto } from './dto/certificates.dto';
import { UpsertCertificateSupplementsBodyDto } from './dto/certificate-supplements.dto';

const MAX_STUDENTS_PER_BATCH = 50;

@Injectable()
export class CertificatesService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PORT) private storage: StoragePort,
    @Inject(PDF_RENDER_SERVICE) private pdfRender: PdfRenderService,
    private nikudService: NikudService,
  ) {}

  private certificatePrefsForClass(
    settingsJson: unknown,
    certificateProfileId: string | null | undefined,
  ): CertificatePrefs {
    return resolveCertificatePrefsForClass(
      (settingsJson ?? {}) as Record<string, unknown>,
      certificateProfileId,
    );
  }

  private templateKeyForClass(
    settingsJson: unknown,
    certificateProfileId: string | null | undefined,
  ): string {
    return resolveCertificateTemplateKeyForClass(
      (settingsJson ?? {}) as Record<string, unknown>,
      certificateProfileId,
    );
  }

  private subjectsForClassProfile<T extends { id: string }>(
    settingsJson: unknown,
    certificateProfileId: string | null | undefined,
    allSubjects: T[],
  ): T[] {
    const profile = resolveCertificateProfile(
      (settingsJson ?? {}) as Record<string, unknown>,
      certificateProfileId,
    );
    return resolveProfileSubjects(profile, allSubjects);
  }

  private async loadGradingSetTypes(schoolId: string) {
    return this.prisma.gradingSetType.findMany({
      where: { schoolId },
      select: { id: true, label: true, parentId: true },
    });
  }

  private async assignmentClassIds(
    schoolId: string,
    userId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId },
      select: { classId: true },
      distinct: ['classId'],
    });
    return rows.map((r) => r.classId);
  }

  private async assertClassViewAccess(user: JwtPayload, classId: string) {
    const classRow = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: user.school_id },
    });
    if (!classRow) throw new NotFoundException();

    const assignmentClassIds =
      user.role === Role.SubjectTeacher
        ? await this.assignmentClassIds(user.school_id, user.sub)
        : [];

    if (
      !canAccessClassForGradebook(
        user.role,
        user.sub,
        classRow,
        assignmentClassIds,
      )
    ) {
      throw new NotFoundException();
    }
    return classRow;
  }

  private assertCanGenerate(user: JwtPayload, classRow: { homeroomTeacherId: string | null }) {
    if (user.role === Role.Admin) {
      throw new ForbiddenException(
        'Certificate editing and generation are for homeroom teachers only',
      );
    }
    if (user.role === Role.SubjectTeacher) {
      throw new ForbiddenException('Subject teachers cannot generate certificates');
    }
    if (user.role === Role.HomeroomTeacher) {
      if (classRow.homeroomTeacherId !== user.sub) {
        throw new ForbiddenException('Homeroom teacher can only generate for own class');
      }
    }
  }

  private async loadCustomTemplate(
    schoolId: string,
    templateId: string,
  ): Promise<CertificateTemplateDetailDto | null> {
    const row = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      orientation: row.orientation as CertificateTemplateDetailDto['orientation'],
      layoutVersion: row.layoutVersion,
      updatedAt: row.updatedAt.toISOString(),
      layoutJson: row.layoutJson as CertificateTemplateDetailDto['layoutJson'],
      layoutSchemaVersion: row.layoutSchemaVersion,
      logoStorageKey: row.logoStorageKey,
    };
  }

  private pdfKey(
    schoolId: string,
    termId: string,
    studentId: string,
    snapshotId: string,
  ): string {
    return `${schoolId}/certificates/${termId}/${studentId}/${snapshotId}.pdf`;
  }

  private mapSupplementRow(
    row: {
      studentId: string;
      absences: string | null;
      lateness: string | null;
      hourAbsences: string | null;
      hourLateness: string | null;
      evaluation: string | null;
      homeroomSignature: string | null;
      principalSignature: string | null;
      gradeComments: unknown;
      updatedAt: Date;
    },
    studentName?: string,
  ): CertificateSupplementDto {
    const gradeComments =
      row.gradeComments &&
      typeof row.gradeComments === 'object' &&
      !Array.isArray(row.gradeComments)
        ? (row.gradeComments as Record<string, string | null>)
        : undefined;
    return {
      studentId: row.studentId,
      studentName,
      absences: row.absences,
      lateness: row.lateness,
      hourAbsences: row.hourAbsences,
      hourLateness: row.hourLateness,
      evaluation: row.evaluation,
      homeroomSignature: row.homeroomSignature,
      principalSignature: row.principalSignature,
      gradeComments,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private supplementInputFromRow(
    row: CertificateSupplementDto | undefined,
  ): CertificateSupplementInput | undefined {
    if (!row) return undefined;
    return {
      absences: row.absences,
      lateness: row.lateness,
      hourAbsences: row.hourAbsences,
      hourLateness: row.hourLateness,
      evaluation: row.evaluation,
      homeroomSignature: row.homeroomSignature,
      principalSignature: row.principalSignature,
      gradeComments: row.gradeComments,
    };
  }

  async getSupplementContext(
    user: JwtPayload,
    classId: string,
    termId: string,
  ): Promise<CertificateSupplementContextDto> {
    const classRow = await this.assertClassViewAccess(user, classId);

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();

    const school = await this.prisma.school.findFirst({
      where: { id: user.school_id },
    });
    if (!school) throw new NotFoundException();

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId: user.school_id },
      include: { gradingSetType: { select: { label: true } } },
      orderBy: [{ gradingSetType: { label: 'asc' } }, { name: 'asc' }],
    });

    const students = await this.prisma.student.findMany({
      where: { schoolId: user.school_id, classId },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
    });

    const supplementRows = await this.prisma.certificateSupplement.findMany({
      where: { schoolId: user.school_id, classId, termId },
    });
    const supplementByStudent = new Map(
      supplementRows.map((r) => [r.studentId, r]),
    );

    const supplements: CertificateSupplementDto[] = students.map((s) => {
      const row = supplementByStudent.get(s.id);
      if (row) {
        return this.mapSupplementRow(row, s.fullName);
      }
      return { studentId: s.id, studentName: s.fullName };
    });

    const settings = (school.settingsJson ?? {}) as Record<string, unknown>;

    const profile = resolveCertificateProfile(
      settings,
      classRow.certificateProfileId,
    );
    const profileSubjects = this.subjectsForClassProfile(
      settings,
      classRow.certificateProfileId,
      subjects,
    );

    return {
      certificatePrefs: this.certificatePrefsForClass(
        settings,
        classRow.certificateProfileId,
      ),
      certificateProfileId: profile?.id ?? classRow.certificateProfileId ?? null,
      certificateProfileName: profile?.name ?? null,
      class: {
        id: classRow.id,
        name: classRow.name,
        year: classRow.year,
        yearHebrew: classRow.yearHebrew,
      },
      subjects: profileSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        gradingSetTypeLabel: s.gradingSetType.label,
      })),
      supplements,
    };
  }

  async upsertSupplements(
    user: JwtPayload,
    dto: UpsertCertificateSupplementsBodyDto,
  ): Promise<CertificateSupplementDto[]> {
    const classRow = await this.assertClassViewAccess(user, dto.classId);
    this.assertCanGenerate(user, classRow);

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: dto.termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();

    const studentIds = dto.items.map((i) => i.studentId);
    const students = await this.prisma.student.findMany({
      where: {
        schoolId: user.school_id,
        classId: dto.classId,
        id: { in: studentIds },
      },
      select: { id: true, fullName: true },
    });
    if (students.length !== studentIds.length) {
      throw new NotFoundException('One or more students not found in class');
    }
    const nameById = new Map(students.map((s) => [s.id, s.fullName]));

    const results: CertificateSupplementDto[] = [];
    for (const item of dto.items) {
      const row = await this.prisma.certificateSupplement.upsert({
        where: {
          schoolId_studentId_termId: {
            schoolId: user.school_id,
            studentId: item.studentId,
            termId: dto.termId,
          },
        },
        create: {
          schoolId: user.school_id,
          studentId: item.studentId,
          classId: dto.classId,
          termId: dto.termId,
          absences: item.absences ?? null,
          lateness: item.lateness ?? null,
          hourAbsences: item.hourAbsences ?? null,
          hourLateness: item.hourLateness ?? null,
          evaluation: item.evaluation ?? null,
          homeroomSignature: item.homeroomSignature ?? null,
          principalSignature: item.principalSignature ?? null,
          gradeComments: item.gradeComments ?? undefined,
        },
        update: {
          classId: dto.classId,
          absences: item.absences ?? null,
          lateness: item.lateness ?? null,
          hourAbsences: item.hourAbsences ?? null,
          hourLateness: item.hourLateness ?? null,
          evaluation: item.evaluation ?? null,
          homeroomSignature: item.homeroomSignature ?? null,
          principalSignature: item.principalSignature ?? null,
          gradeComments: item.gradeComments ?? undefined,
        },
      });
      results.push(
        this.mapSupplementRow(row, nameById.get(item.studentId)),
      );
    }
    return results;
  }

  async generate(
    user: JwtPayload,
    dto: GenerateCertificatesBodyDto,
  ): Promise<GenerateCertificatesResultDto> {
    const classRow = await this.assertClassViewAccess(user, dto.classId);
    this.assertCanGenerate(user, classRow);

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: dto.termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();
    if (!term.isLocked) {
      throw new BadRequestException('Term must be locked before generating certificates');
    }

    const school = await this.prisma.school.findFirst({
      where: { id: user.school_id },
    });
    if (!school) throw new NotFoundException();

    const studentWhere = {
      schoolId: user.school_id,
      classId: dto.classId,
      ...(dto.studentIds?.length ? { id: { in: dto.studentIds } } : {}),
    };

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      include: { groupMemberships: { select: { classGroupId: true } } },
      orderBy: { fullName: 'asc' },
    });

    if (dto.studentIds?.length && students.length !== dto.studentIds.length) {
      throw new NotFoundException('One or more students not found in class');
    }

    if (students.length > MAX_STUDENTS_PER_BATCH) {
      throw new BadRequestException(
        `Cannot generate more than ${MAX_STUDENTS_PER_BATCH} certificates per request`,
      );
    }

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId: user.school_id },
      include: { gradingSetType: { select: { id: true, label: true } } },
      orderBy: [{ gradingSetType: { label: 'asc' } }, { name: 'asc' }],
    });
    const profileSubjects = this.subjectsForClassProfile(
      school.settingsJson,
      classRow.certificateProfileId,
      subjects,
    );

    const classGroups = await this.prisma.classGroup.findMany({
      where: { schoolId: user.school_id, classId: dto.classId },
      select: { id: true, name: true, subjectId: true },
    });

    const prefs = this.certificatePrefsForClass(
      school.settingsJson,
      classRow.certificateProfileId,
    );
    const templateResolution = resolveCertificateTemplateForProfile(
      school.settingsJson as Record<string, unknown>,
      classRow.certificateProfileId,
    );
    const templateKey = templateResolution.useBuiltIn
      ? this.templateKeyForClass(school.settingsJson, classRow.certificateProfileId)
      : 'custom';

    let customTemplate: CertificateTemplateDetailDto | null = null;
    if (templateResolution.templateId) {
      customTemplate = await this.loadCustomTemplate(
        user.school_id,
        templateResolution.templateId,
      );
      if (!customTemplate) {
        throw new BadRequestException({
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Certificate template not found for profile',
        });
      }
    }

    const gradingSetTypes = await this.loadGradingSetTypes(user.school_id);

    const profile = resolveCertificateProfile(
      school.settingsJson as Record<string, unknown>,
      classRow.certificateProfileId,
    );

    const supplementRows = await this.prisma.certificateSupplement.findMany({
      where: {
        schoolId: user.school_id,
        classId: dto.classId,
        termId: dto.termId,
        studentId: { in: students.map((s) => s.id) },
      },
    });
    const supplementByStudent = new Map(
      supplementRows.map((r) => [
        r.studentId,
        this.mapSupplementRow(r),
      ]),
    );

    const results: GenerateCertificatesResultDto['results'] = [];

    for (const student of students) {
      try {
        const supplementDto = supplementByStudent.get(student.id);
        const supplement = this.supplementInputFromRow(supplementDto);
        const entries = await this.prisma.gradeEntry.findMany({
          where: {
            schoolId: user.school_id,
            studentId: student.id,
            termId: dto.termId,
          },
        });
        const entryMap = new Map(
          entries.map((e) => [e.subjectId, e.value]),
        );
        const studentGroupIds = [
          ...student.groupMemberships.map((m) => m.classGroupId),
          ...(student.classGroupId ? [student.classGroupId] : []),
        ];

        const snapshotJson = buildSnapshotJson({
          templateKey,
          school: { id: school.id, name: school.name },
          class: {
            id: classRow.id,
            name: classRow.name,
            year: classRow.year,
            yearHebrew: classRow.yearHebrew,
          },
          term: { id: term.id, name: term.name },
          student: { id: student.id, fullName: student.fullName },
          subjects: profileSubjects.map((s) => ({
            id: s.id,
            name: s.name,
            gradingSetTypeId: s.gradingSetTypeId,
            gradingSetTypeLabel: s.gradingSetType.label,
          })),
          entries: entryMap,
          classGroups,
          studentGroupIds,
          certificatePrefs: prefs,
          certificateProfileName: profile?.name ?? null,
          supplement,
          gradingSetTypes,
        });

        if (customTemplate) {
          snapshotJson.templateId = customTemplate.id;
          snapshotJson.templateLayoutVersion = customTemplate.layoutVersion;
          snapshotJson.pageOrientation = customTemplate.orientation;
        }

        if (prefs.nikud) {
          Object.assign(
            snapshotJson,
            await nikudSnapshot(snapshotJson, (t) => this.nikudService.nikud(t)),
          );
        }

        const snapshotId = randomUUID();
        const pdfBuffer = customTemplate
          ? await renderTemplatePdf(
              customTemplate,
              snapshotJson,
              this.storage,
              this.pdfRender,
              (t) => this.nikudService.nikud(t),
            )
          : await this.pdfRender.renderCertificateHtml(snapshotJson);
        const storageKey = this.pdfKey(
          user.school_id,
          dto.termId,
          student.id,
          snapshotId,
        );
        await this.storage.putObject(storageKey, pdfBuffer, 'application/pdf');

        await this.prisma.certificateSnapshot.create({
          data: {
            id: snapshotId,
            schoolId: user.school_id,
            studentId: student.id,
            classId: dto.classId,
            termId: dto.termId,
            snapshotJson,
            pdfStorageKey: storageKey,
            generatedBy: user.sub,
          },
        });

        results.push({ studentId: student.id, snapshotId, ok: true });
      } catch (err) {
        results.push({
          studentId: student.id,
          ok: false,
          error: err instanceof Error ? err.message : 'Generation failed',
        });
      }
    }

    return { results };
  }

  async nikudText(user: JwtPayload, text: string): Promise<string> {
    void user;
    return this.nikudService.nikud(text);
  }

  async getPreviewHtml(user: JwtPayload, id: string): Promise<string> {
    const row = await this.prisma.certificateSnapshot.findFirst({
      where: { id, schoolId: user.school_id },
    });
    if (!row) throw new NotFoundException();

    await this.assertClassViewAccess(user, row.classId);

    const [supplementRow, school, classRow] = await Promise.all([
      this.prisma.certificateSupplement.findUnique({
        where: {
          schoolId_studentId_termId: {
            schoolId: user.school_id,
            studentId: row.studentId,
            termId: row.termId,
          },
        },
      }),
      this.prisma.school.findFirst({ where: { id: user.school_id } }),
      this.prisma.class.findFirst({
        where: { id: row.classId, schoolId: user.school_id },
        select: { certificateProfileId: true },
      }),
    ]);

    const supplement = supplementRow
      ? this.supplementInputFromRow(this.mapSupplementRow(supplementRow))
      : undefined;
    const currentPrefs = school
      ? this.certificatePrefsForClass(school.settingsJson, classRow?.certificateProfileId)
      : undefined;

    const snapshotJson = enrichSnapshotProfileName(
      mergeSupplementIntoSnapshot(
        row.snapshotJson as CertificateSnapshotJsonV1,
        supplement,
        currentPrefs,
      ),
      resolveCertificateProfile(
        school?.settingsJson as Record<string, unknown> | undefined,
        classRow?.certificateProfileId,
      )?.name,
    );

    if (snapshotJson.certificatePrefs?.nikud) {
      Object.assign(
        snapshotJson,
        await nikudSnapshot(snapshotJson, (t) => this.nikudService.nikud(t)),
      );
    }

    if (snapshotJson.templateId) {
      const customTemplate = await this.loadCustomTemplate(user.school_id, snapshotJson.templateId);
      if (!customTemplate) throw new NotFoundException();
      return renderTemplateHtmlString(
        customTemplate,
        snapshotJson,
        this.storage,
        (t) => this.nikudService.nikud(t),
      );
    }

    return this.pdfRender.renderCertificateHtmlString(snapshotJson);
  }

  async listSnapshots(
    user: JwtPayload,
    classId: string,
    termId: string,
  ): Promise<CertificateSnapshotSummaryDto[]> {
    await this.assertClassViewAccess(user, classId);

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();

    const rows = await this.prisma.certificateSnapshot.findMany({
      where: { schoolId: user.school_id, classId, termId },
      include: { student: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.fullName,
      createdAt: r.createdAt.toISOString(),
      hasPdf: Boolean(r.pdfStorageKey),
    }));
  }

  async getSnapshot(
    user: JwtPayload,
    id: string,
  ): Promise<CertificateSnapshotDetailDto> {
    const row = await this.prisma.certificateSnapshot.findFirst({
      where: { id, schoolId: user.school_id },
      include: { student: { select: { fullName: true } } },
    });
    if (!row) throw new NotFoundException();

    await this.assertClassViewAccess(user, row.classId);

    return {
      id: row.id,
      studentId: row.studentId,
      studentName: row.student.fullName,
      createdAt: row.createdAt.toISOString(),
      hasPdf: Boolean(row.pdfStorageKey),
      classId: row.classId,
      termId: row.termId,
      snapshotJson: row.snapshotJson as CertificateSnapshotDetailDto['snapshotJson'],
    };
  }

  async getPdfBuffer(user: JwtPayload, id: string): Promise<Buffer> {
    const row = await this.prisma.certificateSnapshot.findFirst({
      where: { id, schoolId: user.school_id },
    });
    if (!row) throw new NotFoundException();

    await this.assertClassViewAccess(user, row.classId);

    const [supplementRow, school, classRow] = await Promise.all([
      this.prisma.certificateSupplement.findUnique({
        where: {
          schoolId_studentId_termId: {
            schoolId: user.school_id,
            studentId: row.studentId,
            termId: row.termId,
          },
        },
      }),
      this.prisma.school.findFirst({ where: { id: user.school_id } }),
      this.prisma.class.findFirst({
        where: { id: row.classId, schoolId: user.school_id },
        select: { certificateProfileId: true },
      }),
    ]);

    const supplement = supplementRow
      ? this.supplementInputFromRow(this.mapSupplementRow(supplementRow))
      : undefined;
    const currentPrefs = school
      ? this.certificatePrefsForClass(
          school.settingsJson,
          classRow?.certificateProfileId,
        )
      : undefined;

    const snapshotJson = enrichSnapshotProfileName(
      mergeSupplementIntoSnapshot(
        row.snapshotJson as CertificateSnapshotJsonV1,
        supplement,
        currentPrefs,
      ),
      resolveCertificateProfile(
        school?.settingsJson as Record<string, unknown> | undefined,
        classRow?.certificateProfileId,
      )?.name,
    );

    if (snapshotJson.certificatePrefs?.nikud) {
      Object.assign(
        snapshotJson,
        await nikudSnapshot(snapshotJson, (t) => this.nikudService.nikud(t)),
      );
    }

    if (snapshotJson.templateId) {
      const customTemplate = await this.loadCustomTemplate(
        user.school_id,
        snapshotJson.templateId,
      );
      if (!customTemplate) {
        throw new BadRequestException({
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Certificate template not found for snapshot',
        });
      }
      return renderTemplatePdf(
        customTemplate,
        snapshotJson,
        this.storage,
        this.pdfRender,
        (t) => this.nikudService.nikud(t),
      );
    }

    const buffer = await this.pdfRender.renderCertificateHtml(snapshotJson);

    if (row.pdfStorageKey) {
      try {
        await this.storage.putObject(
          row.pdfStorageKey,
          buffer,
          'application/pdf',
        );
      } catch {
        // Best-effort cache refresh.
      }
    }

    return buffer;
  }
}
