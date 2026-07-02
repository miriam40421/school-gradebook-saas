export const LOCK_TTL_MINUTES = 15;
export const LOCK_HEARTBEAT_INTERVAL_SEC = 60;

export type LockHolderDto = {
  id: string;
  name: string;
};

export type LockScopeDto = {
  classId: string;
  termId: string;
  subjectId: string;
  classGroupId?: string | null;
};

export type LockStatusDto = {
  subjectId: string;
  classGroupId: string | null;
  lockedBy: LockHolderDto;
  expiresAt: string;
  lockId?: string;
};

export type AcquireLockRequestDto = LockScopeDto;

export type AcquireLockResultDto = {
  lockId: string;
  expiresAt: string;
  scope: LockScopeDto;
};

export type LockConflictDto = {
  lockedBy: LockHolderDto;
  expiresAt: string;
  message?: string;
};

export type ReleaseLockRequestDto = {
  lockId: string;
};

export type HeartbeatLockRequestDto = {
  lockId: string;
};
