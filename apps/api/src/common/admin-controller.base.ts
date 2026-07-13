import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@school/shared';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export function AdminOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(Role.Admin));
}

export function SuperAdminOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(Role.SuperAdmin));
}
