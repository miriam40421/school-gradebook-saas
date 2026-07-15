import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SuperAdminOnly } from '../common/admin-controller.base';
import { AuditService } from '../common/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SuperAdminService } from './super-admin.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminController {
  constructor(
    private superAdmin: SuperAdminService,
    private audit: AuditService,
  ) {}

  @Get('schools')
  listSchools(@Query('includeDeleted') includeDeleted?: string) {
    return this.superAdmin.listSchools(includeDeleted === 'true');
  }

  @Get('schools/:id')
  getSchool(@Param('id') id: string) {
    return this.superAdmin.getSchool(id);
  }

  @Post('schools')
  async createSchool(@CurrentUser() actor: JwtPayload, @Body() dto: CreateSchoolDto) {
    const result = await this.superAdmin.createSchool(dto);
    this.audit.emit({ action: 'school.create', actorId: actor.sub, targetType: 'School', targetId: result.school.id });
    return result;
  }

  @Patch('schools/:id')
  async updateSchool(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    const result = await this.superAdmin.updateSchool(id, dto);
    this.audit.emit({ action: 'school.update', actorId: actor.sub, targetType: 'School', targetId: id });
    return result;
  }

  @Patch('schools/:id/block')
  async blockSchool(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    const result = await this.superAdmin.blockSchool(id, true);
    this.audit.emit({ action: 'school.block', actorId: actor.sub, targetType: 'School', targetId: id });
    return result;
  }

  @Patch('schools/:id/unblock')
  async unblockSchool(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    const result = await this.superAdmin.blockSchool(id, false);
    this.audit.emit({ action: 'school.unblock', actorId: actor.sub, targetType: 'School', targetId: id });
    return result;
  }

  @Delete('schools/:id')
  async deleteSchool(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    const result = await this.superAdmin.deleteSchool(id);
    this.audit.emit({ action: 'school.delete', actorId: actor.sub, targetType: 'School', targetId: id });
    return result;
  }

  @Patch('schools/:id/restore')
  async restoreSchool(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    const result = await this.superAdmin.restoreSchool(id);
    this.audit.emit({ action: 'school.restore', actorId: actor.sub, targetType: 'School', targetId: id });
    return result;
  }
}
