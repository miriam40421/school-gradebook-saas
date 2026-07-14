import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
@AdminOnly()
export class SubjectsController {
  constructor(private subjects: SubjectsService) {}

  @Get()
  list(@CurrentUser() user: SchoolUserPayload) {
    return this.subjects.list(user.school_id);
  }

  @Post()
  create(@CurrentUser() user: SchoolUserPayload, @Body() dto: CreateSubjectDto) {
    return this.subjects.create(user.school_id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjects.update(user.school_id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.subjects.remove(user.school_id, id);
  }
}
