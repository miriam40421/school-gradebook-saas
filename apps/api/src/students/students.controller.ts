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
import { Authenticated, HomeroomOrAdmin } from '../common/auth-decorators';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { assertHomeroomWrite } from './student-access';
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
  create(@CurrentUser() user: SchoolUserPayload, @Body() dto: CreateStudentDto) {
    assertHomeroomWrite(user);
    return this.students.create(user, dto);
  }

  @Post('import')
  importJson(@CurrentUser() user: SchoolUserPayload, @Body() dto: ImportStudentsDto) {
    assertHomeroomWrite(user);
    return this.students.importMany(user, dto);
  }

  @Post('import-file')
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
    assertHomeroomWrite(user);
    if (!classId) {
      throw new BadRequestException('classId required');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('file required');
    }
    return this.students.importFile(user, classId, file.buffer, file.originalname);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    assertHomeroomWrite(user);
    return this.students.update(user, id, dto);
  }

  @Patch(':id/group-memberships')
  updateGroupMemberships(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentGroupMembershipsDto,
  ) {
    assertHomeroomWrite(user);
    return this.students.updateGroupMemberships(user, id, dto.classGroupIds);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    assertHomeroomWrite(user);
    return this.students.remove(user, id);
  }
}
