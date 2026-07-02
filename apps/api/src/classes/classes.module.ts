import { Module } from '@nestjs/common';
import { ClassGroupsModule } from '../class-groups/class-groups.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [ClassGroupsModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
