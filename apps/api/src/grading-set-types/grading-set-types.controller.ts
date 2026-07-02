import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminOnly } from '../common/admin-controller.base';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateGradingSetTypeDto, UpdateGradingSetTypeDto } from './dto/grading-set-type.dto';
import { GradingSetTypesService } from './grading-set-types.service';

@Controller('grading-set-types')
@AdminOnly()
export class GradingSetTypesController {
  constructor(private types: GradingSetTypesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.types.list(user.school_id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGradingSetTypeDto) {
    return this.types.create(user.school_id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGradingSetTypeDto,
  ) {
    return this.types.update(user.school_id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.types.remove(user.school_id, id);
  }
}
