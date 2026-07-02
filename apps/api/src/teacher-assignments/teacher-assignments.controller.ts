import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminOnly } from '../common/admin-controller.base';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import {
  CreateTeacherAssignmentDto,
  UpdateTeacherAssignmentDto,
} from './dto/teacher-assignment.dto';
import { TeacherAssignmentsService } from './teacher-assignments.service';

@Controller('teacher-assignments')
@AdminOnly()
export class TeacherAssignmentsController {
  constructor(private assignments: TeacherAssignmentsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.assignments.list(user.school_id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeacherAssignmentDto) {
    return this.assignments.create(user.school_id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherAssignmentDto,
  ) {
    return this.assignments.update(user.school_id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.assignments.remove(user.school_id, id);
  }
}
