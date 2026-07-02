import { Module } from '@nestjs/common';
import { GradingSetTypesController } from './grading-set-types.controller';
import { GradingSetTypesService } from './grading-set-types.service';

@Module({
  controllers: [GradingSetTypesController],
  providers: [GradingSetTypesService],
  exports: [GradingSetTypesService],
})
export class GradingSetTypesModule {}
