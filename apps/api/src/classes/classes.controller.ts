import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminOnly } from '../common/admin-controller.base';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { ClassesService } from './classes.service';

@Controller('classes')
export class ClassesController {
  constructor(private classes: ClassesService) {}

  @Get()
  @Authenticated()
  list(@CurrentUser() user: JwtPayload) {
    return this.classes.list(user.school_id, user);
  }

  @Post()
  @AdminOnly()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.classes.create(user.school_id, dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classes.update(user.school_id, id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classes.remove(user.school_id, id);
  }
}
