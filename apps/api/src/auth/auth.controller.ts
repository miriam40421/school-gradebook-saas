import { Body, Controller, Get, Headers, Ip, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TokenRevocationService } from './token-revocation.service';
import { PrismaService } from '../prisma/prisma.service';

class PlatformLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class ForgotPasswordDto {
  @IsUUID()
  schoolId!: string;

  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private revocation: TokenRevocationService,
    private prisma: PrismaService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 30, ttl: 900000 } })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip);
  }

  @Post('platform/login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  platformLogin(@Body() dto: PlatformLoginDto, @Ip() ip: string) {
    return this.auth.platformLogin(dto.email, dto.password, ip);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Headers('x-app-url') appUrl?: string,
    @Headers('referer') referer?: string,
  ) {
    let origin = appUrl;
    if (!origin && referer) {
      try { origin = new URL(referer).origin; } catch {}
    }
    return this.auth.forgotPassword(dto.schoolId, dto.email, origin);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtPayload & { jti?: string }, @Req() req: Request) {
    await Promise.all([
      user.jti
        ? this.revocation.revoke(
            user.jti,
            user.exp
              ? new Date((user as JwtPayload & { exp: number }).exp * 1000)
              : new Date(Date.now() + 24 * 60 * 60 * 1000),
          )
        : Promise.resolve(),
      this.prisma.editLock.deleteMany({ where: { lockedBy: user.sub } }),
    ]);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub, user.school_id);
  }
}
