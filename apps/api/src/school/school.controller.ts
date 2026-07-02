import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolService } from './school.service';

@Controller('school')
@AdminOnly()
export class SchoolController {
  constructor(private school: SchoolService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.school.getProfile(user.school_id);
  }

  @Patch()
  patch(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSchoolDto) {
    return this.school.update(user.school_id, dto);
  }
}
