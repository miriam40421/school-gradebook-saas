import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@school/shared';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertHomeroomClassAccess,
  assertHomeroomStudentAccess,
  assertHomeroomWrite,
} from './student-access';
import {
  CreateStudentDto,
  ImportStudentsDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { parseNamesFromBuffer } from './import-names.util';
import { normalizeStudentFullName } from '@school/shared';
import { sortStudentsByFamilyName } from './student-sort.util';
import { assertValidGroupMemberships } from './student-groups.util';

const studentIncludeFull = {
  class: true,
  classGroup: true,
  groupMemberships: {
    include: {
      classGroup: {
        include: { subject: { select: { id: true, name: true } } },
      },
    },
  },
};

const studentIncludeBasic = {
  class: true,
  classGroup: true,
};

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private async assertClassInSchool(schoolId: string, classId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, deletedAt: null },
    });
    if (!cls) {
      throw new BadRequestException('Class not found in school');
    }
    return cls;
  }

  private async assertGroupInClass(
    schoolId: string,
    classId: string,
    classGroupId: string | null | undefined,
  ) {
    if (!classGroupId) {
      return;
    }
    const group = await this.prisma.classGroup.findFirst({
      where: { id: classGroupId, schoolId, classId },
    });
    if (!group) {
      throw new BadRequestException('Group not found in class');
    }
  }

  private homeroomClassFilter(user: SchoolUserPayload) {
    if (user.role === Role.Admin) {
      return {};
    }
    if (user.role === Role.HomeroomTeacher) {
      return { homeroomTeacherId: user.sub };
    }
    throw new ForbiddenException();
  }

  async list(user: SchoolUserPayload, classId?: string) {
    if (user.role === Role.SubjectTeacher) {
      throw new ForbiddenException();
    }
    const classFilter = this.homeroomClassFilter(user);
    const classes = await this.prisma.class.findMany({
      where: { schoolId: user.school_id, deletedAt: null, ...classFilter, ...(classId ? { id: classId } : {}) },
      select: { id: true },
    });
    const classIds = classes.map((c) => c.id);
    if (classId && classIds.length === 0) {
      throw new ForbiddenException();
    }
    const where = {
      schoolId: user.school_id,
      deletedAt: null,
      classId: classId ? classId : { in: classIds },
    };
    let rows;
    try {
      rows = await this.prisma.student.findMany({
        where,
        include: studentIncludeFull,
      });
    } catch {
      rows = await this.prisma.student.findMany({
        where,
        include: studentIncludeBasic,
      });
    }
    return sortStudentsByFamilyName(rows);
  }

  async create(user: SchoolUserPayload, dto: CreateStudentDto) {
    assertHomeroomWrite(user);
    await assertHomeroomClassAccess(this.prisma, user, dto.classId);
    await this.assertClassInSchool(user.school_id, dto.classId);
    return this.prisma.student.create({
      data: {
        schoolId: user.school_id,
        classId: dto.classId,
        fullName: normalizeStudentFullName(dto.fullName),
      },
      include: studentIncludeBasic,
    });
  }

  async updateGroupMemberships(
    user: SchoolUserPayload,
    studentId: string,
    classGroupIds: string[],
  ) {
    assertHomeroomWrite(user);
    const existing = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: user.school_id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    await assertHomeroomStudentAccess(this.prisma, user, studentId);
    const classGroups = await this.prisma.classGroup.findMany({
      where: { schoolId: user.school_id, classId: existing.classId },
      select: { id: true, classId: true, subjectId: true },
    });
    assertValidGroupMemberships(existing.classId, classGroups, classGroupIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.studentClassGroup.deleteMany({ where: { studentId } });
      if (classGroupIds.length > 0) {
        await tx.studentClassGroup.createMany({
          data: classGroupIds.map((classGroupId) => ({
            schoolId: user.school_id,
            studentId,
            classGroupId,
          })),
        });
      }
      await tx.student.update({
        where: { id: studentId },
        data: { classGroupId: classGroupIds[0] ?? null },
      });
    });
    return this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      include: studentIncludeBasic,
    });
  }

  async importMany(user: SchoolUserPayload, dto: ImportStudentsDto) {
    assertHomeroomWrite(user);
    await assertHomeroomClassAccess(this.prisma, user, dto.classId);
    const names = dto.names.map((n) => normalizeStudentFullName(n)).filter(Boolean);
    if (names.length === 0) {
      throw new BadRequestException('No student names found');
    }
    const created = await this.prisma.$transaction(
      names.map((fullName) =>
        this.prisma.student.create({
          data: {
            schoolId: user.school_id,
            classId: dto.classId,
            fullName,
          },
        }),
      ),
    );
    return { imported: created.length, students: created };
  }

  async importFile(
    user: SchoolUserPayload,
    classId: string,
    buffer: Buffer,
    filename: string,
  ) {
    const names = await parseNamesFromBuffer(buffer, filename);
    if (names.length === 0) {
      throw new BadRequestException('No student names found in file');
    }
    return this.importMany(user, { classId, names });
  }

  async update(user: SchoolUserPayload, id: string, dto: UpdateStudentDto) {
    assertHomeroomWrite(user);
    const existing = await this.prisma.student.findFirst({
      where: { id, schoolId: user.school_id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    await assertHomeroomStudentAccess(this.prisma, user, id);
    if (dto.classId) {
      await assertHomeroomClassAccess(this.prisma, user, dto.classId);
      await this.assertClassInSchool(user.school_id, dto.classId);
    }
    if (dto.classGroupId !== undefined) {
      await this.updateGroupMemberships(
        user,
        id,
        dto.classGroupId ? [dto.classGroupId] : [],
      );
    }
    return this.prisma.student.update({
      where: { id },
      data: {
        fullName: dto.fullName
          ? normalizeStudentFullName(dto.fullName)
          : undefined,
        classId: dto.classId,
      },
      include: studentIncludeBasic,
    });
  }

  async remove(user: SchoolUserPayload, id: string) {
    assertHomeroomWrite(user);
    const existing = await this.prisma.student.findFirst({
      where: { id, schoolId: user.school_id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    await assertHomeroomStudentAccess(this.prisma, user, id);
    await this.prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
