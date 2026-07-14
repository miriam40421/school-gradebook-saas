import { Role } from '@school/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  school_id: string | null;
  role: Role;
  jti?: string;
  exp?: number;
}

/** Payload guaranteed by school-scoped guards — school_id is always a string */
export type SchoolUserPayload = JwtPayload & { school_id: string };
