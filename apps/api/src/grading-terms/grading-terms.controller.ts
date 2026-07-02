import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminOnly } from '../common/admin-controller.base';
import { Authenticated } from '../common/auth-decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateGradingTermDto, UpdateGradingTermDto } from './dto/grading-term.dto';
import { GradingTermsService } from './grading-terms.service';

@Controller('grading-terms')
export class GradingTermsController {
  constructor(private gradingTerms: GradingTermsService) {}

  @Get()
  @Authenticated()
  list(@CurrentUser() user: JwtPayload) {
    return this.gradingTerms.list(user.school_id);
  }

  @Post()
  @AdminOnly()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGradingTermDto) {
    return this.gradingTerms.create(user.school_id, dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateGradingTermDto,
  ) {
    return this.gradingTerms.update(user.school_id, id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.gradingTerms.remove(user.school_id, id);
  }
}
