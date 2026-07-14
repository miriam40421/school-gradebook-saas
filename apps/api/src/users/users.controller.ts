import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
@AdminOnly()
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  list(@CurrentUser() user: SchoolUserPayload) {
    return this.users.list(user.school_id);
  }

  @Post()
  create(@CurrentUser() user: SchoolUserPayload, @Body() dto: CreateUserDto) {
    return this.users.create(user.school_id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user.school_id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.users.remove(user.school_id, id);
  }
}
