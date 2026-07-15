import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Authenticated, HomeroomOnly, HomeroomOrAdmin } from '../common/auth-decorators';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import {
  CreateStudentDto,
  ImportStudentsDto,
  UpdateStudentDto,
  UpdateStudentGroupMembershipsDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

@Controller('students')
@Authenticated()
export class StudentsController {
  constructor(private students: StudentsService) {}

  @Get()
  @HomeroomOrAdmin()
  list(
    @CurrentUser() user: SchoolUserPayload,
    @Query('classId') classId?: string,
  ) {
    return this.students.list(user, classId);
  }

  @Post()
  @HomeroomOnly()
  create(@CurrentUser() user: SchoolUserPayload, @Body() dto: CreateStudentDto) {
    return this.students.create(user, dto);
  }

  @Post('import')
  @HomeroomOnly()
  importJson(@CurrentUser() user: SchoolUserPayload, @Body() dto: ImportStudentsDto) {
    return this.students.importMany(user, dto);
  }

  @Post('import-file')
  @HomeroomOnly()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  importFile(
    @CurrentUser() user: SchoolUserPayload,
    @Query('classId') classId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!classId) {
      throw new BadRequestException('classId required');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('file required');
    }
    return this.students.importFile(user, classId, file.buffer, file.originalname);
  }

  @Patch(':id')
  @HomeroomOnly()
  update(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(user, id, dto);
  }

  @Patch(':id/group-memberships')
  @HomeroomOnly()
  updateGroupMemberships(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentGroupMembershipsDto,
  ) {
    return this.students.updateGroupMemberships(user, id, dto.classGroupIds);
  }

  @Delete(':id')
  @HomeroomOnly()
  remove(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.students.remove(user, id);
  }
}
