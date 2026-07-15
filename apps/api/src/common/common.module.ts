import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DataRetentionService } from './data-retention.service';

@Global()
@Module({
  providers: [AuditService, DataRetentionService],
  exports: [AuditService],
})
export class CommonModule {}
