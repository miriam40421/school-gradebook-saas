import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AcquireLockResultDto,
  LockScopeDto,
  LockStatusDto,
} from '@school/shared';
import { Role } from '@school/shared';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { TermLockedException } from '../common/term-locked.exception';
import {
  canAccessClassForGradebook,
  canEditSubjectColumn,
  type ClassAccessContext,
  type TeacherAssignmentScope,
} from '../gradebook/gradebook-rbac.util';
import { PrismaService } from '../prisma/prisma.service';
import { AcquireLockDto } from './dto/locks.dto';
import {
  computeExpiresAt,
  isLockExpired,
  resolveLockClassGroupIdForSubject,
  type LockScopeKey,
} from './lock-scope.util';

@Injectable()
export class LocksService {
  constructor(private prisma: PrismaService) {}

  private scopeWhere(scope: LockScopeKey) {
    return {
      schoolId: scope.schoolId,
      classId: scope.classId,
      subjectId: scope.subjectId,
      termId: scope.termId,
      classGroupId: scope.classGroupId,
    };
  }

  private async purgeExpiredForScope(scope: LockScopeKey) {
    await this.prisma.editLock.deleteMany({
      where: {
        ...this.scopeWhere(scope),
        expiresAt: { lt: new Date() },
      },
    });
  }

  private toStatusDto(row: {
    id: string;
    subjectId: string;
    classGroupId: string | null;
    expiresAt: Date;
    holder: { id: string; name: string };
  }): LockStatusDto {
    return {
      lockId: row.id,
      subjectId: row.subjectId,
      classGroupId: row.classGroupId,
      lockedBy: { id: row.holder.id, name: row.holder.name },
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  private throwLockConflict(holder: { id: string; name: string }, expiresAt: Date) {
    throw new ConflictException({
      message: 'Lock held by another teacher',
      lockedBy: { id: holder.id, name: holder.name },
      expiresAt: expiresAt.toISOString(),
    });
  }

  private async assertEditScope(
    user: JwtPayload,
    classRow: ClassAccessContext,
    assignments: TeacherAssignmentScope[],
    subjectId: string,
  ) {
    if (user.role === Role.Admin) {
      throw new ForbiddenException('Admin cannot acquire locks');
    }
    if (
      !canEditSubjectColumn(
        user.role,
        user.sub,
        classRow,
        subjectId,
        assignments,
      )
    ) {
      throw new ForbiddenException('Not allowed to edit this subject column');
    }
  }

  async resolveAcquireScope(
    user: JwtPayload,
    classRow: ClassAccessContext,
    assignments: TeacherAssignmentScope[],
    body: AcquireLockDto,
  ): Promise<LockScopeKey> {
    await this.assertEditScope(user, classRow, assignments, body.subjectId);
    const resolvedGroupId = resolveLockClassGroupIdForSubject(
      user.role,
      body.classId,
      body.subjectId,
      assignments,
    );
    if (
      body.classGroupId != null &&
      body.classGroupId !== resolvedGroupId
    ) {
      throw new ForbiddenException('classGroupId does not match assignment scope');
    }
    return {
      schoolId: user.school_id,
      classId: body.classId,
      subjectId: body.subjectId,
      termId: body.termId,
      classGroupId: resolvedGroupId,
    };
  }

  async acquire(
    user: JwtPayload,
    body: AcquireLockDto,
  ): Promise<AcquireLockResultDto> {
    const classRow = await this.prisma.class.findFirst({
      where: { id: body.classId, schoolId: user.school_id, deletedAt: null },
    });
    if (!classRow) throw new NotFoundException();

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: body.termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();
    if (term.isLocked) {
      throw new TermLockedException();
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: body.subjectId, schoolId: user.school_id, deletedAt: null },
    });
    if (!subject) throw new NotFoundException();

    const assignmentClassIds =
      user.role === Role.SubjectTeacher
        ? (
            await this.prisma.teacherAssignment.findMany({
              where: { schoolId: user.school_id, userId: user.sub },
              select: { classId: true },
              distinct: ['classId'],
            })
          ).map((r) => r.classId)
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

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { schoolId: user.school_id, userId: user.sub },
      select: { id: true, subjectId: true, classId: true, classGroupId: true },
    });

    const scope = await this.resolveAcquireScope(
      user,
      classRow,
      assignments,
      body,
    );

    await this.purgeExpiredForScope(scope);

    const existing = await this.prisma.editLock.findFirst({
      where: this.scopeWhere(scope),
      include: { holder: { select: { id: true, name: true } } },
    });

    const expiresAt = computeExpiresAt();

    if (existing) {
      if (isLockExpired(existing.expiresAt)) {
        await this.prisma.editLock.delete({ where: { id: existing.id } });
      } else if (existing.lockedBy === user.sub) {
        const updated = await this.prisma.editLock.update({
          where: { id: existing.id },
          data: { expiresAt },
        });
        return {
          lockId: updated.id,
          expiresAt: updated.expiresAt.toISOString(),
          scope: this.scopeToDto(scope),
        };
      } else {
        this.throwLockConflict(existing.holder, existing.expiresAt);
      }
    }

    const created = await this.prisma.editLock.create({
      data: {
        schoolId: scope.schoolId,
        classId: scope.classId,
        subjectId: scope.subjectId,
        termId: scope.termId,
        classGroupId: scope.classGroupId,
        lockedBy: user.sub,
        expiresAt,
      },
    });

    return {
      lockId: created.id,
      expiresAt: created.expiresAt.toISOString(),
      scope: this.scopeToDto(scope),
    };
  }

  private scopeToDto(scope: LockScopeKey): LockScopeDto {
    return {
      classId: scope.classId,
      termId: scope.termId,
      subjectId: scope.subjectId,
      classGroupId: scope.classGroupId,
    };
  }

  private async getLockForUser(lockId: string, user: JwtPayload) {
    const row = await this.prisma.editLock.findFirst({
      where: { id: lockId, schoolId: user.school_id },
      include: { holder: { select: { id: true, name: true } } },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async release(user: JwtPayload, lockId: string): Promise<void> {
    const row = await this.getLockForUser(lockId, user);
    if (isLockExpired(row.expiresAt)) {
      await this.prisma.editLock.delete({ where: { id: row.id } });
      throw new NotFoundException();
    }
    if (row.lockedBy !== user.sub) {
      throw new ForbiddenException('Not lock holder');
    }
    await this.prisma.editLock.delete({ where: { id: row.id } });
  }

  async heartbeat(
    user: JwtPayload,
    lockId: string,
  ): Promise<{ lockId: string; expiresAt: string }> {
    const row = await this.getLockForUser(lockId, user);
    if (isLockExpired(row.expiresAt)) {
      await this.prisma.editLock.delete({ where: { id: row.id } });
      throw new NotFoundException();
    }
    if (row.lockedBy !== user.sub) {
      throw new ForbiddenException('Not lock holder');
    }
    const updated = await this.prisma.editLock.update({
      where: { id: row.id },
      data: { expiresAt: computeExpiresAt() },
    });
    return {
      lockId: updated.id,
      expiresAt: updated.expiresAt.toISOString(),
    };
  }

  async listForClassTerm(
    user: JwtPayload,
    classId: string,
    termId: string,
  ): Promise<LockStatusDto[]> {
    const classRow = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: user.school_id, deletedAt: null },
    });
    if (!classRow) throw new NotFoundException();

    const term = await this.prisma.gradingTerm.findFirst({
      where: { id: termId, schoolId: user.school_id },
    });
    if (!term) throw new NotFoundException();

    const assignmentClassIds =
      user.role === Role.SubjectTeacher
        ? (
            await this.prisma.teacherAssignment.findMany({
              where: { schoolId: user.school_id, userId: user.sub },
              select: { classId: true },
              distinct: ['classId'],
            })
          ).map((r) => r.classId)
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

    return this.activeLocksForMatrix(user.school_id, classId, termId);
  }

  async activeLocksForMatrix(
    schoolId: string,
    classId: string,
    termId: string,
  ): Promise<LockStatusDto[]> {
    const rows = await this.prisma.editLock.findMany({
      where: {
        schoolId,
        classId,
        termId,
        expiresAt: { gte: new Date() },
      },
      include: { holder: { select: { id: true, name: true } } },
    });
    return rows.map((r) => this.toStatusDto(r));
  }

  async assertLocksForBulkUpdate(
    user: JwtPayload,
    classId: string,
    termId: string,
    classRow: ClassAccessContext,
    assignments: TeacherAssignmentScope[],
    subjectIds: string[],
  ) {
    if (user.role === Role.Admin) {
      return;
    }

    const distinctSubjects = [...new Set(subjectIds)];
    for (const subjectId of distinctSubjects) {
      const scope: LockScopeKey = {
        schoolId: user.school_id,
        classId,
        termId,
        subjectId,
        classGroupId: resolveLockClassGroupIdForSubject(
          user.role,
          classId,
          subjectId,
          assignments,
        ),
      };

      await this.purgeExpiredForScope(scope);

      const lock = await this.prisma.editLock.findFirst({
        where: this.scopeWhere(scope),
        include: { holder: { select: { id: true, name: true } } },
      });

      if (!lock || isLockExpired(lock.expiresAt)) {
        throw new ConflictException({
          message: 'Lock required before saving grades',
        });
      }

      if (lock.lockedBy !== user.sub) {
        this.throwLockConflict(lock.holder, lock.expiresAt);
      }
    }
  }
}
