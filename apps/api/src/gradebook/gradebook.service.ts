import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BulkGradeUpdateResultDto,
  GradebookEntryDto,
  GradebookMatrixDto,
  GradebookSubjectDto,
} from '@school/shared';
import { Role, certificateSubjectLabel, sortByFamilyName, resolveCertificateProfile, resolveCertificatePrefsForClass, buildGradingTypeMap, buildGradingTypeAncestorChain, subjectCategoryColumns } from '@school/shared';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { TermLockedException } from '../common/term-locked.exception';
import { LocksService } from '../locks/locks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BulkGradeUpdateDto } from './dto/gradebook.dto';
import {
  canAccessClassForGradebook,
  canEditStudentSubject,
  filterStudentsForSubjectAssignment,
  getEditableSubjectIds,
  getVisibleSubjectIds,
  pickFocusAssignment,
  type TeacherAssignmentScope,
} from './gradebook-rbac.util';
import {
  isValidGradeValue,
  LabelResolutionError,
  resolveAllowedLabelsForTypeHierarchy,
  type GradingSetWithValues,
} from './label-resolution.util';
import { AuditService } from '../common/audit.service';

@Injectable()
export class GradebookService {
  constructor(
    private prisma: PrismaService,
    private locks: LocksService,
    private audit: AuditService,
  ) {}

  private async loadAssignments(
    schoolId: string,
    userId: string,
  ): Promise<TeacherAssignmentScope[]> {
    const rows = await this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId },
      select: { id: true, subjectId: true, classId: true, classGroupId: true },
    });
    return rows;
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

  private async loadSetsByTypeId(
    schoolId: string,
  ): Promise<Map<string, GradingSetWithValues[]>> {
    const rows = await this.prisma.gradingSet.findMany({
      where: { schoolId },
      include: { values: true },
    });
    const map = new Map<string, GradingSetWithValues[]>();
    for (const row of rows) {
      const bucket = map.get(row.gradingSetTypeId) ?? [];
      bucket.push({
        id: row.id,
        values: row.values.map((v) => ({ label: v.label, order: v.order })),
      });
      map.set(row.gradingSetTypeId, bucket);
    }
    return map;
  }

  private resolveLabelsForSubject(
    gradingSetTypeId: string,
    typeMap: Map<string, { id: string; label: string; parentId: string | null }>,
    setsByTypeId: Map<string, GradingSetWithValues[]>,
    subjectName?: string,
  ): string[] {
    const chain = buildGradingTypeAncestorChain(gradingSetTypeId, typeMap);
    try {
      return resolveAllowedLabelsForTypeHierarchy(setsByTypeId, chain);
    } catch (e) {
      if (e instanceof LabelResolutionError) {
        const hint = subjectName
          ? ` (מקצוע «${subjectName}»: הוסיפי ציונים לקטגוריה או לתת-קטגוריה ב«הגדרת ציונים»)`
          : '';
        throw new BadRequestException(e.message + hint);
      }
      throw e;
    }
  }

  private async assertClassAccess(
    user: SchoolUserPayload,
    classRow: { id: string; homeroomTeacherId: string | null },
  ) {
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
  }

  private entryToDto(row: {
    studentId: string;
    subjectId: string;
    value: string | null;
    version: number;
    updatedAt: Date;
    teacherId: string;
  }): GradebookEntryDto {
    return {
      studentId: row.studentId,
      subjectId: row.subjectId,
      value: row.value,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      teacherId: row.teacherId,
    };
  }

  async getMatrix(
    user: SchoolUserPayload,
    classId: string,
    termId: string,
    classGroupId?: string,
    focusSubjectId?: string,
    focusAssignmentId?: string,
  ): Promise<GradebookMatrixDto> {
    const classRow = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: user.school_id },
    });
    if (!classRow) throw new NotFoundException();

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();

    await this.assertClassAccess(user, classRow);

    const assignments = await this.loadAssignments(user.school_id, user.sub);
    const classAssignments = assignments.filter((a) => a.classId === classId);

    const subjectRows = await this.prisma.subject.findMany({
      where: { schoolId: user.school_id },
      include: { gradingSetType: { select: { id: true, label: true } } },
      orderBy: [{ gradingSetType: { label: 'asc' } }, { name: 'asc' }],
    });

    let visibleSubjectIds = new Set(
      getVisibleSubjectIds(
        user.role,
        user.sub,
        classRow,
        subjectRows.map((s) => s.id),
        assignments,
      ),
    );

    const focusAssignment =
      user.role === Role.SubjectTeacher
        ? pickFocusAssignment(
            classAssignments,
            focusSubjectId,
            focusAssignmentId,
          )
        : undefined;

    if (user.role === Role.SubjectTeacher) {
      const assignedInClass = new Set(
        classAssignments.map((a) => a.subjectId),
      );
      visibleSubjectIds = new Set(
        [...visibleSubjectIds].filter((id) => assignedInClass.has(id)),
      );
      if (classAssignments.length > 1 && !focusAssignment) {
        throw new BadRequestException(
          'Select subject for gradebook (multiple assignments for this class)',
        );
      }
      if (focusAssignment) {
        visibleSubjectIds = new Set([focusAssignment.subjectId]);
      } else if (classAssignments.length === 1) {
        visibleSubjectIds = new Set([classAssignments[0]!.subjectId]);
      } else {
        visibleSubjectIds = new Set();
      }
    }

    const schoolRow = await this.prisma.school.findFirst({
      where: { id: user.school_id },
      select: { settingsJson: true },
    });
    const schoolSettings = (schoolRow?.settingsJson ?? {}) as Record<string, unknown>;

    if (
      user.role === Role.Admin ||
      (user.role === Role.HomeroomTeacher &&
        classRow.homeroomTeacherId === user.sub)
    ) {
      const profile = resolveCertificateProfile(
        schoolSettings,
        classRow.certificateProfileId,
      );
      const profileSubjectIds = profile?.subjectIds;
      if (profileSubjectIds !== undefined) {
        const allowed = new Set(profileSubjectIds);
        visibleSubjectIds = new Set(
          [...visibleSubjectIds].filter((id) => allowed.has(id)),
        );
      }
    }

    const certPrefs = resolveCertificatePrefsForClass(
      schoolSettings,
      classRow.certificateProfileId,
    );
    const showSubCategories = certPrefs.showSubCategoriesOnCertificate !== false;
    const gradingSetTypes = await this.prisma.gradingSetType.findMany({
      where: { schoolId: user.school_id },
      select: { id: true, label: true, parentId: true },
    });
    const typeMap = buildGradingTypeMap(gradingSetTypes);
    const setsByTypeId = await this.loadSetsByTypeId(user.school_id);

    const classGroups = await this.prisma.classGroup.findMany({
      where: { schoolId: user.school_id, classId },
      select: { id: true, name: true },
    });
    const groupNameById = new Map(classGroups.map((g) => [g.id, g.name]));

    const subjects: GradebookSubjectDto[] = [];
    for (const s of subjectRows) {
      if (!visibleSubjectIds.has(s.id)) {
        continue;
      }
      const allowedLabels = this.resolveLabelsForSubject(
        s.gradingSetTypeId,
        typeMap,
        setsByTypeId,
        s.name,
      );
      let columnName = s.name;
      if (focusAssignment?.subjectId === s.id && focusAssignment.classGroupId) {
        columnName = certificateSubjectLabel(
          s.name,
          groupNameById.get(focusAssignment.classGroupId),
          true,
        );
      }
      const cols = subjectCategoryColumns(
        s.gradingSetTypeId,
        s.gradingSetType.label,
        typeMap,
        showSubCategories,
      );
      subjects.push({
        id: s.id,
        name: columnName,
        gradingSetTypeId: s.gradingSetTypeId,
        gradingSetTypeLabel: s.gradingSetType.label,
        categoryGroupId: cols.categoryGroupId,
        categoryGroupLabel: cols.categoryGroupLabel,
        parentCategoryGroupId: cols.parentCategoryGroupId,
        parentCategoryGroupLabel: cols.parentCategoryGroupLabel,
        allowedLabels,
      });
    }

    subjects.sort((a, b) => {
      const byParent = a.parentCategoryGroupLabel.localeCompare(
        b.parentCategoryGroupLabel,
        'he',
      );
      if (byParent !== 0) return byParent;
      if (showSubCategories) {
        const byGroup = a.categoryGroupLabel.localeCompare(b.categoryGroupLabel, 'he');
        if (byGroup !== 0) return byGroup;
      } else {
        const bySub = a.gradingSetTypeLabel.localeCompare(b.gradingSetTypeLabel, 'he');
        if (bySub !== 0) return bySub;
      }
      return a.name.localeCompare(b.name, 'he');
    });

    const studentWhere: {
      schoolId: string;
      classId: string;
      deletedAt: null;
      groupMemberships?: { some: { classGroupId: string } };
    } = { schoolId: user.school_id, classId, deletedAt: null };
    if (classGroupId) {
      studentWhere.groupMemberships = { some: { classGroupId } };
    }

    const studentsRaw = await this.prisma.student.findMany({
      where: studentWhere,
      include: { groupMemberships: { select: { classGroupId: true } } },
    });
    const studentsFiltered =
      user.role === Role.SubjectTeacher && focusAssignment
        ? filterStudentsForSubjectAssignment(focusAssignment, studentsRaw)
        : studentsRaw;
    const students = sortByFamilyName(studentsFiltered, (s) => s.fullName);

    const studentIds = students.map((s) => s.id);
    const visibleIds = [...visibleSubjectIds];
    const entries =
      studentIds.length === 0 || visibleIds.length === 0
        ? []
        : await this.prisma.gradeEntry.findMany({
            where: {
              schoolId: user.school_id,
              termId,
              studentId: { in: studentIds },
              subjectId: { in: visibleIds },
            },
          });

    const editableSubjectIds = getEditableSubjectIds(
      user.role,
      user.sub,
      classRow,
      subjects.map((s) => s.id),
      assignments,
    );

    const activeLocks = await this.locks.activeLocksForMatrix(
      user.school_id,
      classId,
      termId,
    );

    return {
      term: { id: term.id, name: term.name, isLocked: term.isLocked },
      class: { id: classRow.id, name: classRow.name, year: classRow.year },
      classGroupId: classGroupId ?? null,
      showSubCategoriesOnCertificate: showSubCategories,
      subjects,
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroupId: s.classGroupId,
      })),
      entries: entries.map((e) => this.entryToDto(e)),
      editableSubjectIds,
      locks: activeLocks,
    };
  }

  async bulkUpdate(
    user: SchoolUserPayload,
    dto: BulkGradeUpdateDto,
  ): Promise<BulkGradeUpdateResultDto> {
    const classRow = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: user.school_id },
    });
    if (!classRow) throw new NotFoundException();

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: dto.termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();
    if (term.isLocked) {
      throw new TermLockedException();
    }

    await this.assertClassAccess(user, classRow);

    if (dto.updates.length === 0) {
      return { entries: [] };
    }

    const assignments = await this.loadAssignments(user.school_id, user.sub);

    const subjectIds = [...new Set(dto.updates.map((u) => u.subjectId))];
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId: user.school_id, id: { in: subjectIds } },
    });
    if (subjects.length !== subjectIds.length) throw new NotFoundException();

    const labelsBySubject = new Map<string, string[]>();
    const gradingSetTypes = await this.prisma.gradingSetType.findMany({
      where: { schoolId: user.school_id },
      select: { id: true, label: true, parentId: true },
    });
    const typeMap = buildGradingTypeMap(gradingSetTypes);
    const setsByTypeId = await this.loadSetsByTypeId(user.school_id);
    for (const s of subjects) {
      labelsBySubject.set(
        s.id,
        this.resolveLabelsForSubject(
          s.gradingSetTypeId,
          typeMap,
          setsByTypeId,
          s.name,
        ),
      );
    }

    const studentIds = [...new Set(dto.updates.map((u) => u.studentId))];
    const students = await this.prisma.student.findMany({
      where: { schoolId: user.school_id, deletedAt: null, id: { in: studentIds } },
      include: { groupMemberships: { select: { classGroupId: true } } },
    });
    if (students.length !== studentIds.length) throw new NotFoundException();

    for (const st of students) {
      if (st.classId !== dto.classId) {
        throw new BadRequestException('Student does not belong to class');
      }
    }

    const studentById = new Map(students.map((s) => [s.id, s]));

    for (const update of dto.updates) {
      const labels = labelsBySubject.get(update.subjectId)!;
      if (!isValidGradeValue(update.value, labels)) {
        throw new BadRequestException('Invalid grade label');
      }
      const st = studentById.get(update.studentId)!;
      const studentGroupIds = st.groupMemberships.map((m) => m.classGroupId);
      if (
        !canEditStudentSubject(
          user.role,
          user.sub,
          classRow,
          update.subjectId,
          studentGroupIds,
          assignments,
        )
      ) {
        throw new ForbiddenException('Not allowed to edit this subject column');
      }
    }

    await this.locks.assertLocksForBulkUpdate(
      user,
      dto.classId,
      dto.termId,
      classRow,
      assignments,
      dto.updates.map((u) => u.subjectId),
    );

    const results = await this.prisma.$transaction(async (tx) => {
      const out: GradebookEntryDto[] = [];
      for (const update of dto.updates) {
        const row = await tx.gradeEntry.upsert({
          where: {
            schoolId_studentId_subjectId_termId: {
              schoolId: user.school_id,
              studentId: update.studentId,
              subjectId: update.subjectId,
              termId: dto.termId,
            },
          },
          create: {
            schoolId: user.school_id,
            studentId: update.studentId,
            classId: dto.classId,
            subjectId: update.subjectId,
            termId: dto.termId,
            teacherId: user.sub,
            value: update.value,
          },
          update: {
            value: update.value,
            teacherId: user.sub,
            version: { increment: 1 },
          },
        });
        out.push(this.entryToDto(row));
      }
      return out;
    });

    this.audit.emit({
      action: 'grade.bulk_update',
      actorId: user.sub,
      targetType: 'GradeEntry',
      targetId: dto.classId,
      schoolId: user.school_id,
      meta: { termId: dto.termId, count: dto.updates.length },
    });

    return { entries: results };
  }
}
