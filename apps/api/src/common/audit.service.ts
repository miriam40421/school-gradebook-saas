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
  meta?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  emit(params: AuditParams): void {
    void this.prisma.auditEvent.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
        schoolId: params.schoolId ?? null,
        ip: params.ip ?? null,
        meta: params.meta ?? undefined,
      },
    });
  }
}
