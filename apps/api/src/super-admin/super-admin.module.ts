import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { EmailService } from './email.service';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService, EmailService],
})
export class SuperAdminModule {}
