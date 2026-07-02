import { Module } from '@nestjs/common';
import { GradingSetsController } from './grading-sets.controller';
import { GradingSetsService } from './grading-sets.service';

@Module({
  controllers: [GradingSetsController],
  providers: [GradingSetsService],
})
export class GradingSetsModule {}
