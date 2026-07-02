import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../common/admin-controller.base';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateClassGroupDto, UpdateClassGroupDto } from './dto/class-group.dto';
import { ClassGroupsService } from './class-groups.service';

@Controller('classes/:classId/groups')
@AdminOnly()
export class ClassGroupsController {
  constructor(private groups: ClassGroupsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('classId') classId: string) {
    return this.groups.list(user.school_id, classId);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('classId') classId: string,
    @Body() dto: CreateClassGroupDto,
  ) {
    return this.groups.create(user.school_id, classId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClassGroupDto,
  ) {
    return this.groups.update(user.school_id, classId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('classId') classId: string,
    @Param('id') id: string,
  ) {
    return this.groups.remove(user.school_id, classId, id);
  }
}
