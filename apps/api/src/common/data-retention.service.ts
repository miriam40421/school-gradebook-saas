import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PORT, StoragePort } from '../storage/storage.port';

// Israeli educational records retention: 7 years from soft-delete
const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS ?? '2555', 10);
// תקנה 10(ג): audit logs minimum 24 months, capped at 36 months
const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS ?? '1095', 10);

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_PORT) private storage: StoragePort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredRecords(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Collect PDF storage keys before DB cascade removes snapshot records
    const expiredStudents = await this.prisma.student.findMany({
      where: { deletedAt: { lt: cutoff } },
      select: {
        id: true,
        certificateSnapshots: { select: { pdfStorageKey: true } },
      },
    });

    const pdfKeys = expiredStudents
      .flatMap((s) => s.certificateSnapshots)
      .map((snap) => snap.pdfStorageKey)
      .filter((key): key is string => !!key);

    if (pdfKeys.length > 0 && this.storage.deleteObject) {
      const results = await Promise.allSettled(
        pdfKeys.map((key) => this.storage.deleteObject!(key)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        this.logger.warn(JSON.stringify({ event: 'storage_delete_partial_failure', failed, total: pdfKeys.length }));
      }
    }

    const [students, users] = await Promise.all([
      this.prisma.student.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
      this.prisma.user.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
    ]);

    const auditCutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const auditEvents = await this.prisma.auditEvent.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    });

    if (students.count > 0 || users.count > 0 || auditEvents.count > 0) {
      this.logger.log(
        JSON.stringify({
          event: 'data_retention_purge',
          students: students.count,
          users: users.count,
          pdfKeysDeleted: pdfKeys.length,
          auditEvents: auditEvents.count,
          cutoff,
          auditCutoff,
        }),
      );
    }
  }
}
