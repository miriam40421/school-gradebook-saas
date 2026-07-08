import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTeacherAssignmentDto,
  UpdateTeacherAssignmentDto,
} from './dto/teacher-assignment.dto';

@Injectable()
export class TeacherAssignmentsService {
  constructor(private prisma: PrismaService) {}

  private assignmentInclude = {
    user: { select: { id: true, name: true, role: true } },
    subject: { select: { id: true, name: true } },
    class: { select: { id: true, name: true, year: true, yearHebrew: true } },
    classGroup: { select: { id: true, name: true } },
  };

  list(schoolId: string) {
    return this.prisma.teacherAssignment.findMany({
      where: { schoolId },
      include: this.assignmentInclude,
      orderBy: [{ subject: { name: 'asc' } }, { class: { name: 'asc' } }],
    });
  }

  listForUser(schoolId: string, userId: string) {
    return this.prisma.teacherAssignment.findMany({
      where: { schoolId, userId },
      include: this.assignmentInclude,
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  async create(schoolId: string, dto: CreateTeacherAssignmentDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, schoolId, deletedAt: null },
      include: { subjects: true },
    });
    if (!user || user.role !== Role.SubjectTeacher) {
      throw new BadRequestException('User must be a subject teacher');
    }
    const allowedSubjectIds = new Set(user.subjects.map((s) => s.subjectId));
    if (allowedSubjectIds.size === 0) {
      throw new BadRequestException('Teacher has no subjects assigned');
    }

    const workItems =
      dto.items ??
      (dto.subjectIds ?? []).map((subjectId) => ({
        subjectId,
        classGroupId: dto.classGroupId ?? null,
      }));

    if (workItems.length === 0) {
      throw new BadRequestException('At least one subject is required');
    }

    for (const item of workItems) {
      if (!allowedSubjectIds.has(item.subjectId)) {
        throw new BadRequestException('Subject is not assigned to this teacher');
      }
    }

    const subjectIds = workItems.map((i) => i.subjectId);
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds }, deletedAt: null },
    });
    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException('One or more subjects not found');
    }

    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId, deletedAt: null },
    });
    if (!cls) {
      throw new BadRequestException('Class not found');
    }

    const created = [];
    for (const item of workItems) {
      const groupId = item.classGroupId ?? null;
      if (groupId) {
        const group = await this.prisma.classGroup.findFirst({
          where: { id: groupId, schoolId, classId: dto.classId },
        });
        if (!group) {
          throw new BadRequestException('Group not found in class');
        }
      }
      const existing = await this.prisma.teacherAssignment.findFirst({
        where: {
          schoolId,
          userId: dto.userId,
          subjectId: item.subjectId,
          classId: dto.classId,
          classGroupId: groupId,
        },
      });
      if (existing) {
        continue;
      }
      const row = await this.prisma.teacherAssignment.create({
        data: {
          schoolId,
          userId: dto.userId,
          subjectId: item.subjectId,
          classId: dto.classId,
          classGroupId: groupId,
        },
        include: this.assignmentInclude,
      });
      created.push(row);
    }

    if (created.length === 0) {
      throw new BadRequestException('Assignment already exists');
    }

    return created.length === 1 ? created[0] : { created: created.length, assignments: created };
  }

  async update(schoolId: string, id: string, dto: UpdateTeacherAssignmentDto) {
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    const classId = dto.classId ?? existing.classId;
    const classGroupId =
      dto.classGroupId !== undefined ? dto.classGroupId : existing.classGroupId;

    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, deletedAt: null },
    });
    if (!cls) {
      throw new BadRequestException('Class not found');
    }
    if (classGroupId) {
      const group = await this.prisma.classGroup.findFirst({
        where: { id: classGroupId, schoolId, classId },
      });
      if (!group) {
        throw new BadRequestException('Group not found in class');
      }
    }

    const duplicate = await this.prisma.teacherAssignment.findFirst({
      where: {
        schoolId,
        userId: existing.userId,
        subjectId: existing.subjectId,
        classId,
        classGroupId: classGroupId ?? null,
        NOT: { id },
      },
    });
    if (duplicate) {
      throw new BadRequestException('Assignment already exists');
    }

    return this.prisma.teacherAssignment.update({
      where: { id },
      data: { classId, classGroupId: classGroupId ?? null },
      include: this.assignmentInclude,
    });
  }

  async remove(schoolId: string, id: string) {
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    await this.prisma.teacherAssignment.delete({ where: { id } });
    return { success: true };
  }
}
