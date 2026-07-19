import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditParams {
  action: string;
  actorId: string;
  targetType: string;
  targetId?: string;
  schoolId?: string | null;
  ip?: string;
  outcome?: 'success' | 'denied';
  meta?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  emit(params: AuditParams): void {
    this.prisma.auditEvent.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
        schoolId: params.schoolId ?? null,
        ip: params.ip ?? null,
        outcome: params.outcome ?? null,
        meta: params.meta ?? undefined,
      },
    }).catch((err: Error) => {
      console.error('[AuditService] emit failed:', err.message);
    });
  }
}
