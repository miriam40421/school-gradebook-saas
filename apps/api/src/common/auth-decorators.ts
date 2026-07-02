import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@school/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

export function Authenticated() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

export function HomeroomOrAdmin() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.Admin, Role.HomeroomTeacher),
  );
}
