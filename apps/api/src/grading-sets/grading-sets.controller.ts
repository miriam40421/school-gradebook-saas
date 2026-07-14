import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import {
  CreateGradingSetDto,
  CreateGradingSetValueDto,
  UpdateGradingSetDto,
  UpdateGradingSetValueDto,
} from './dto/grading-set.dto';
import { GradingSetsService } from './grading-sets.service';

@Controller('grading-sets')
@AdminOnly()
export class GradingSetsController {
  constructor(private gradingSets: GradingSetsService) {}

  @Get()
  list(@CurrentUser() user: SchoolUserPayload) {
    return this.gradingSets.list(user.school_id);
  }

  @Post()
  create(@CurrentUser() user: SchoolUserPayload, @Body() dto: CreateGradingSetDto) {
    return this.gradingSets.create(user.school_id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGradingSetDto,
  ) {
    return this.gradingSets.update(user.school_id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.gradingSets.remove(user.school_id, id);
  }

  @Get(':id/values')
  listValues(@CurrentUser() user: SchoolUserPayload, @Param('id') id: string) {
    return this.gradingSets.listValues(user.school_id, id);
  }

  @Post(':id/values')
  addValue(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Body() dto: CreateGradingSetValueDto,
  ) {
    return this.gradingSets.addValue(user.school_id, id, dto);
  }

  @Patch(':id/values/:valueId')
  updateValue(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Body() dto: UpdateGradingSetValueDto,
  ) {
    return this.gradingSets.updateValue(user.school_id, id, valueId, dto);
  }

  @Delete(':id/values/:valueId')
  removeValue(
    @CurrentUser() user: SchoolUserPayload,
    @Param('id') id: string,
    @Param('valueId') valueId: string,
  ) {
    return this.gradingSets.removeValue(user.school_id, id, valueId);
  }
}
