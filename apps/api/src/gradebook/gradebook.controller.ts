import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { BulkGradeUpdateDto } from './dto/gradebook.dto';
import { GradebookService } from './gradebook.service';

@Controller('gradebook')
@Authenticated()
export class GradebookController {
  constructor(private gradebook: GradebookService) {}

  @Get()
  getMatrix(
    @CurrentUser() user: SchoolUserPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('assignmentId') assignmentId?: string,
  ) {
    return this.gradebook.getMatrix(
      user,
      classId,
      termId,
      classGroupId,
      subjectId,
      assignmentId,
    );
  }

  @Post('bulk-update')
  bulkUpdate(@CurrentUser() user: SchoolUserPayload, @Body() dto: BulkGradeUpdateDto) {
    return this.gradebook.bulkUpdate(user, dto);
  }
}
