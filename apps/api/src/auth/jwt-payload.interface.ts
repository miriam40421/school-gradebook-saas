import { Role } from '@school/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  school_id: string;
  role: Role;
  jti?: string;
  exp?: number;
}
