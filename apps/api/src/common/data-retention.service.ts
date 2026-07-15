import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Israeli educational records retention: 7 years from soft-delete
const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS ?? '2555', 10);

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredRecords(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [students, users] = await Promise.all([
      this.prisma.student.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
      this.prisma.user.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      }),
    ]);

    if (students.count > 0 || users.count > 0) {
      this.logger.log(
        JSON.stringify({ event: 'data_retention_purge', students: students.count, users: users.count, cutoff }),
      );
    }
  }
}
