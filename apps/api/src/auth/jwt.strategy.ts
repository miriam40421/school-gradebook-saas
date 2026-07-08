import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { TokenRevocationService } from './token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private revocation: TokenRevocationService,
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
    if (!payload.sub || !payload.school_id || !payload.role) {
      throw new UnauthorizedException();
    }
    if (payload.jti && await this.revocation.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return payload;
  }
}
