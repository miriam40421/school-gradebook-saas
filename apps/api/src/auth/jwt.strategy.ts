import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';
import { TokenRevocationService } from './token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private revocation: TokenRevocationService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload & { jti?: string }): Promise<JwtPayload> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException();
    }
    if (!payload.school_id && payload.role !== Role.SuperAdmin) {
      throw new UnauthorizedException();
    }
    if (payload.jti && await this.revocation.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    const [user, school] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { deletedAt: true },
      }),
      payload.school_id
        ? this.prisma.school.findUnique({
            where: { id: payload.school_id },
            select: { isBlocked: true, deletedAt: true },
          })
        : Promise.resolve(null),
    ]);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User is deleted');
    }
    if (payload.school_id) {
      if (!school || school.isBlocked || school.deletedAt) {
        throw new UnauthorizedException('School is blocked or deleted');
      }
    }
    return payload;
  }
}
