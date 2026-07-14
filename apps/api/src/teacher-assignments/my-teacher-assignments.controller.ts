import { Controller, Get } from '@nestjs/common';
import { Role } from '@school/shared';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { TeacherAssignmentsService } from './teacher-assignments.service';

@Controller('my/teacher-assignments')
@Authenticated()
export class MyTeacherAssignmentsController {
  constructor(private assignments: TeacherAssignmentsService) {}

  @Get()
  list(@CurrentUser() user: SchoolUserPayload) {
    if (user.role !== Role.SubjectTeacher) {
      return [];
    }
    return this.assignments.listForUser(user.school_id, user.sub);
  }
}
