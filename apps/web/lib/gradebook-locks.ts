import type { GradebookMatrixDto, LockStatusDto } from '@school/shared';
import { LOCK_HEARTBEAT_INTERVAL_SEC } from '@school/shared';

export function lockScopeKey(subjectId: string, classGroupId: string | null): string {
  return `${subjectId}:${classGroupId ?? ''}`;
}

export function findMatrixLock(
  locks: LockStatusDto[] | undefined,
  subjectId: string,
  classGroupId: string | null,
): LockStatusDto | undefined {
  return locks?.find(
    (l) =>
      l.subjectId === subjectId && (l.classGroupId ?? null) === classGroupId,
  );
}

export type ColumnLockState = 'available' | 'editing' | 'locked';

export function columnLockState(
  userId: string,
  subjectId: string,
  classGroupId: string | null,
  matrix: GradebookMatrixDto,
  heldLockIds: Map<string, string>,
): ColumnLockState {
  const key = lockScopeKey(subjectId, classGroupId);
  if (heldLockIds.has(key)) return 'editing';
  const row = findMatrixLock(matrix.locks, subjectId, classGroupId);
  if (!row) return 'available';
  if (row.lockedBy.id === userId) return 'editing';
  return 'locked';
}

export function lockBadgeLabel(
  state: ColumnLockState,
  labels: {
    available: string;
    editing: string;
    lockedBy: (name: string) => string;
  },
  holderName?: string,
): string {
  if (state === 'editing') return labels.editing;
  if (state === 'locked' && holderName) return labels.lockedBy(holderName);
  return labels.available;
}

export const HEARTBEAT_MS = LOCK_HEARTBEAT_INTERVAL_SEC * 1000;
