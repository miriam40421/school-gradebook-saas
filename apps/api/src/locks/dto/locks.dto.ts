import { IsOptional, IsUUID } from 'class-validator';

export class AcquireLockDto {
  @IsUUID()
  classId!: string;

  @IsUUID()
  termId!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  @IsUUID()
  classGroupId?: string | null;
}

export class LockIdDto {
  @IsUUID()
  lockId!: string;
}
