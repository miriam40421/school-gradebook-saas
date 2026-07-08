import { Body, Controller, Get, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TokenRevocationService } from './token-revocation.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private revocation: TokenRevocationService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload & { jti?: string }, @Req() req: Request) {
    if (user.jti) {
      // exp is seconds since epoch; convert to Date for storage
      const expiresAt = user.exp
        ? new Date((user as JwtPayload & { exp: number }).exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.revocation.revoke(user.jti, expiresAt);
    }
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub, user.school_id);
  }
}
