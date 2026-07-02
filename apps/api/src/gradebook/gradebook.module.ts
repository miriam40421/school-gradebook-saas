import { Module } from '@nestjs/common';
import { LocksModule } from '../locks/locks.module';
import { GradebookController } from './gradebook.controller';
import { GradebookService } from './gradebook.service';

@Module({
  imports: [LocksModule],
  controllers: [GradebookController],
  providers: [GradebookService],
})
export class GradebookModule {}
