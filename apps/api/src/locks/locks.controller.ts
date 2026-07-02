import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@school/shared';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AcquireLockDto, LockIdDto } from './dto/locks.dto';
import { LocksService } from './locks.service';

@Controller('locks')
@Authenticated()
export class LocksController {
  constructor(private locks: LocksService) {}

  @Post('acquire')
  @UseGuards(RolesGuard)
  @Roles(Role.HomeroomTeacher, Role.SubjectTeacher)
  acquire(@CurrentUser() user: JwtPayload, @Body() dto: AcquireLockDto) {
    return this.locks.acquire(user, dto);
  }

  @Post('release')
  @UseGuards(RolesGuard)
  @Roles(Role.HomeroomTeacher, Role.SubjectTeacher)
  release(@CurrentUser() user: JwtPayload, @Body() dto: LockIdDto) {
    return this.locks.release(user, dto.lockId);
  }

  @Post('heartbeat')
  @UseGuards(RolesGuard)
  @Roles(Role.HomeroomTeacher, Role.SubjectTeacher)
  heartbeat(@CurrentUser() user: JwtPayload, @Body() dto: LockIdDto) {
    return this.locks.heartbeat(user, dto.lockId);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.locks.listForClassTerm(user, classId, termId);
  }
}
