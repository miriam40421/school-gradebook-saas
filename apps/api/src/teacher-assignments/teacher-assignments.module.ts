import { Module } from '@nestjs/common';
import { MyTeacherAssignmentsController } from './my-teacher-assignments.controller';
import { TeacherAssignmentsController } from './teacher-assignments.controller';
import { TeacherAssignmentsService } from './teacher-assignments.service';

@Module({
  controllers: [TeacherAssignmentsController, MyTeacherAssignmentsController],
  providers: [TeacherAssignmentsService],
})
export class TeacherAssignmentsModule {}
