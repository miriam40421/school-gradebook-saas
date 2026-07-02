import { Role } from '@school/shared';
import type { TeacherAssignmentScope } from '../gradebook/gradebook-rbac.util';
import { LOCK_TTL_MINUTES } from './lock.constants';

export type LockScopeKey = {
  schoolId: string;
  classId: string;
  subjectId: string;
  termId: string;
  classGroupId: string | null;
};

export function buildLockScopeKey(scope: LockScopeKey): string {
  const group = scope.classGroupId ?? '';
  return `${scope.schoolId}:${scope.classId}:${scope.subjectId}:${scope.termId}:${group}`;
}

export function isLockExpired(expiresAt: Date | string, now = new Date()): boolean {
  const t = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return t.getTime() < now.getTime();
}

export function computeExpiresAt(
  ttlMinutes = LOCK_TTL_MINUTES,
  from = new Date(),
): Date {
  return new Date(from.getTime() + ttlMinutes * 60 * 1000);
}

/** Lock row scope for homeroom (whole column) or subject-teacher assignment. */
export function resolveLockClassGroupIdForSubject(
  role: Role,
  classId: string,
  subjectId: string,
  assignments: TeacherAssignmentScope[],
): string | null {
  if (role === Role.HomeroomTeacher) {
    return null;
  }
  if (role === Role.SubjectTeacher) {
    const matches = assignments.filter(
      (a) => a.classId === classId && a.subjectId === subjectId,
    );
    if (matches.length === 0) {
      return null;
    }
    const grouped = matches.find((a) => a.classGroupId != null);
    return grouped?.classGroupId ?? null;
  }
  return null;
}

export function scopeKeyFromParts(
  schoolId: string,
  classId: string,
  termId: string,
  subjectId: string,
  classGroupId: string | null,
): string {
  return buildLockScopeKey({
    schoolId,
    classId,
    termId,
    subjectId,
    classGroupId,
  });
}
