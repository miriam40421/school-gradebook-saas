import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';
import { EmailService } from '../super-admin/email.service';
import { MfaService } from './mfa.service';
import { AuditService } from '../common/audit.service';

const UNKNOWN_ACTOR = 'UNKNOWN';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private mfa: MfaService,
    private audit: AuditService,
  ) {}

  private async issueTokens(user: { id: string; email: string; schoolId: string | null; role: string; name: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      school_id: user.schoolId ?? null,
      role: user.role as Role,
    };
    const accessToken = this.jwt.sign(payload, { jwtid: randomUUID() });
    const rawRefresh = randomBytes(40).toString('hex');
    const refreshHash = createHash('sha256').update(rawRefresh).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, schoolId: user.schoolId },
    };
  }

  async login(dto: LoginDto & { deviceToken?: string }, ip?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId: dto.schoolId, email } },
      include: { school: { select: { isBlocked: true, deletedAt: true } } },
    });
    if (!user) {
      this.audit.emit({ action: 'auth.login', actorId: UNKNOWN_ACTOR, targetType: 'auth', schoolId: dto.schoolId, ip, outcome: 'denied', meta: { reason: 'user_not_found' } });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.school) {
      this.audit.emit({ action: 'auth.login', actorId: user.id, targetType: 'auth', schoolId: dto.schoolId, ip, outcome: 'denied', meta: { reason: 'school_not_found' } });
      throw new ForbiddenException('SCHOOL_DELETED');
    }
    if (user.school.deletedAt) {
      this.audit.emit({ action: 'auth.login', actorId: user.id, targetType: 'auth', schoolId: dto.schoolId, ip, outcome: 'denied', meta: { reason: 'school_deleted' } });
      throw new ForbiddenException('SCHOOL_DELETED');
    }
    if (user.school.isBlocked) {
      this.audit.emit({ action: 'auth.login', actorId: user.id, targetType: 'auth', schoolId: dto.schoolId, ip, outcome: 'denied', meta: { reason: 'school_blocked' } });
      throw new ForbiddenException('SCHOOL_BLOCKED');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.audit.emit({ action: 'auth.login', actorId: user.id, targetType: 'auth', schoolId: user.schoolId, ip, outcome: 'denied', meta: { reason: 'wrong_password' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (dto.deviceToken && await this.mfa.isTrustedDevice(user.id, dto.deviceToken)) {
      this.audit.emit({ action: 'auth.login', actorId: user.id, targetType: 'auth', schoolId: user.schoolId, ip, outcome: 'success', meta: { mfa: 'trusted_device' } });
      return this.issueTokens(user);
    }

    const mfaToken = await this.mfa.sendOtpAndGetToken({ id: user.id, email: user.email, name: user.name, schoolId: user.schoolId });
    return { requiresMfa: true, mfaToken };
  }

  async platformLogin(email: string, password: string, ip?: string, deviceToken?: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, role: 'super_admin', deletedAt: null },
    });
    if (!user) {
      this.audit.emit({ action: 'auth.platform_login', actorId: UNKNOWN_ACTOR, targetType: 'auth', ip, outcome: 'denied', meta: { reason: 'user_not_found' } });
      throw new UnauthorizedException('NOT_PLATFORM_USER');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.audit.emit({ action: 'auth.platform_login', actorId: user.id, targetType: 'auth', ip, outcome: 'denied', meta: { reason: 'wrong_password' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (deviceToken && await this.mfa.isTrustedDevice(user.id, deviceToken)) {
      this.audit.emit({ action: 'auth.platform_login', actorId: user.id, targetType: 'auth', ip, outcome: 'success', meta: { mfa: 'trusted_device' } });
      return this.issueTokens({ ...user, schoolId: null });
    }

    const mfaToken = await this.mfa.sendOtpAndGetToken({ id: user.id, email: user.email, name: user.name, schoolId: null });
    return { requiresMfa: true, mfaToken };
  }

  async verifyMfa(mfaToken: string, code: string, rememberDevice: boolean, ip?: string) {
    const payload = this.mfa.validateMfaToken(mfaToken);
    if (!payload) throw new UnauthorizedException('קוד אימות לא תקף');

    const valid = await this.mfa.verifyOtp(payload.sub, code);
    if (!valid) {
      this.audit.emit({ action: 'auth.mfa_verify', actorId: payload.sub, targetType: 'auth', schoolId: payload.schoolId, ip, outcome: 'denied', meta: { reason: 'invalid_otp' } });
      throw new UnauthorizedException('MFA_INVALID');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { school: { select: { isBlocked: true, deletedAt: true } } },
    });
    if (!user) throw new UnauthorizedException();

    const tokenIat = (payload as unknown as { iat?: number }).iat;
    if (user.tokensValidAfter && tokenIat && user.tokensValidAfter > new Date(tokenIat * 1000)) {
      throw new UnauthorizedException();
    }

    if (user.schoolId) {
      if (!user.school || user.school.deletedAt || user.school.isBlocked) {
        throw new ForbiddenException('SCHOOL_BLOCKED');
      }
    }

    this.audit.emit({ action: 'auth.mfa_verify', actorId: user.id, targetType: 'auth', schoolId: user.schoolId, ip, outcome: 'success' });
    const tokens = await this.issueTokens(user);

    if (rememberDevice) {
      const deviceToken = await this.mfa.createTrustedDevice(user.id);
      return { ...tokens, deviceToken };
    }
    return tokens;
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, schoolId: true, role: true, name: true, deletedAt: true } },
      },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    if (record.user.deletedAt) throw new UnauthorizedException();
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(record.user);
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async platformForgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, role: 'super_admin', schoolId: null, deletedAt: null },
    });
    // Always return success — don't reveal if account exists
    if (!user) return { success: true };

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    void this.email.sendPasswordReset({ to: user.email, resetUrl, userName: user.name });

    return { success: true };
  }

  async forgotPassword(schoolId: string, email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId, email: normalizedEmail } },
    });
    // Always return success — don't reveal if user exists
    if (!user || user.deletedAt) return { success: true };

    // Invalidate all prior unused tokens before creating a new one
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    void this.email.sendPasswordReset({ to: user.email, resetUrl, userName: user.name });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { token: tokenHash },
        include: { user: { select: { deletedAt: true, schoolId: true } } },
      });
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new BadRequestException('הקישור אינו תקף או שפג תוקפו');
      }
      if (record.user.deletedAt) {
        throw new BadRequestException('הקישור אינו תקף או שפג תוקפו');
      }
      if (record.user.schoolId) {
        const school = await tx.school.findUnique({
          where: { id: record.user.schoolId },
          select: { deletedAt: true, isBlocked: true },
        });
        if (!school || school.deletedAt || school.isBlocked) {
          throw new BadRequestException('הקישור אינו תקף או שפג תוקפו');
        }
      }
      const now = new Date();
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, tokensValidAfter: now } });
      await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } });
    });
    return { success: true };
  }

  async me(userId: string, schoolId: string | null) {
    if (!schoolId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, role: 'super_admin', deletedAt: null },
      });
      if (!user) throw new UnauthorizedException();
      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, schoolId: null },
        school: null,
      };
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, deletedAt: null },
      include: { school: { select: { id: true, name: true, isBlocked: true, deletedAt: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!user.school || user.school.deletedAt || user.school.isBlocked) {
      throw new UnauthorizedException();
    }
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      school: { id: user.school.id, name: user.school.name },
    };
  }
}
