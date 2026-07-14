import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SuperAdminOnly } from '../common/admin-controller.base';
import { SuperAdminService } from './super-admin.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Controller('super-admin')
@SuperAdminOnly()
export class SuperAdminController {
  constructor(private superAdmin: SuperAdminService) {}

  @Get('schools')
  listSchools(@Query('includeDeleted') includeDeleted?: string) {
    return this.superAdmin.listSchools(includeDeleted === 'true');
  }

  @Get('schools/:id')
  getSchool(@Param('id') id: string) {
    return this.superAdmin.getSchool(id);
  }

  @Post('schools')
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.superAdmin.createSchool(dto);
  }

  @Patch('schools/:id')
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.superAdmin.updateSchool(id, dto);
  }

  @Patch('schools/:id/block')
  blockSchool(@Param('id') id: string) {
    return this.superAdmin.blockSchool(id, true);
  }

  @Patch('schools/:id/unblock')
  unblockSchool(@Param('id') id: string) {
    return this.superAdmin.blockSchool(id, false);
  }

  @Delete('schools/:id')
  deleteSchool(@Param('id') id: string) {
    return this.superAdmin.deleteSchool(id);
  }

  @Patch('schools/:id/restore')
  restoreSchool(@Param('id') id: string) {
    return this.superAdmin.restoreSchool(id);
  }
}
