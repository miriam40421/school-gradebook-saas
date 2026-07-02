import { Role } from '@school/shared';
import {
  buildLockScopeKey,
  computeExpiresAt,
  isLockExpired,
  resolveLockClassGroupIdForSubject,
} from '../../src/locks/lock-scope.util';
import { LOCK_TTL_MINUTES } from '../../src/locks/lock.constants';

describe('lock-scope.util', () => {
  it('buildLockScopeKey canonicalizes null classGroupId', () => {
    expect(
      buildLockScopeKey({
        schoolId: 's1',
        classId: 'c1',
        subjectId: 'sub1',
        termId: 't1',
        classGroupId: null,
      }),
    ).toBe('s1:c1:sub1:t1:');
  });

  it('isLockExpired returns true for past dates', () => {
    const past = new Date(Date.now() - 1000);
    expect(isLockExpired(past)).toBe(true);
    expect(isLockExpired(new Date(Date.now() + 60_000))).toBe(false);
  });

  it('computeExpiresAt adds TTL minutes', () => {
    const from = new Date('2026-06-04T10:00:00.000Z');
    const exp = computeExpiresAt(LOCK_TTL_MINUTES, from);
    expect(exp.getTime() - from.getTime()).toBe(LOCK_TTL_MINUTES * 60 * 1000);
  });

  it('resolveLockClassGroupIdForSubject homeroom uses null', () => {
    expect(
      resolveLockClassGroupIdForSubject(Role.HomeroomTeacher, 'c1', 'sub1', []),
    ).toBeNull();
  });

  it('resolveLockClassGroupIdForSubject subject teacher uses assignment group', () => {
    expect(
      resolveLockClassGroupIdForSubject(Role.SubjectTeacher, 'c1', 'sub1', [
        { subjectId: 'sub1', classId: 'c1', classGroupId: 'g1' },
      ]),
    ).toBe('g1');
  });

  it('resolveLockClassGroupIdForSubject whole-class assignment is null', () => {
    expect(
      resolveLockClassGroupIdForSubject(Role.SubjectTeacher, 'c1', 'sub1', [
        { subjectId: 'sub1', classId: 'c1', classGroupId: null },
      ]),
    ).toBeNull();
  });
});
