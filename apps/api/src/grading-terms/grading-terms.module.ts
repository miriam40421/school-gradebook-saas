import { Module } from '@nestjs/common';
import { GradingTermsController } from './grading-terms.controller';
import { GradingTermsService } from './grading-terms.service';

@Module({
  controllers: [GradingTermsController],
  providers: [GradingTermsService],
  exports: [GradingTermsService],
})
export class GradingTermsModule {}
