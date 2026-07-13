import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  imports: [MulterModule.register({ limits: { fileSize: 2 * 1024 * 1024 } })],
  controllers: [SchoolController],
  providers: [SchoolService],
})
export class SchoolModule {}
