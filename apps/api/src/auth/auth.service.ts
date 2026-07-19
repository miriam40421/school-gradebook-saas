import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';
import { EmailService } from '../super-admin/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
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

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId: dto.schoolId, email } },
      include: { school: { select: { isBlocked: true, deletedAt: true } } },
    });
    if (!user) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'user_not_found' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.school) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'school_not_found' }));
      throw new ForbiddenException('SCHOOL_DELETED');
    }
    if (user.school.deletedAt) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'school_deleted' }));
      throw new ForbiddenException('SCHOOL_DELETED');
    }
    if (user.school.isBlocked) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'school_blocked' }));
      throw new ForbiddenException('SCHOOL_BLOCKED');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'wrong_password' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(JSON.stringify({ event: 'login_success', userId: user.id, email, schoolId: user.schoolId, ip }));
    return this.issueTokens(user);
  }

  async platformLogin(email: string, password: string, ip?: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, role: 'super_admin', deletedAt: null },
    });
    if (!user) {
      this.logger.warn(JSON.stringify({ event: 'platform_login_failure', email: normalizedEmail, ip, reason: 'user_not_found' }));
      throw new UnauthorizedException('NOT_PLATFORM_USER');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.logger.warn(JSON.stringify({ event: 'platform_login_failure', email: normalizedEmail, ip, reason: 'wrong_password' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(JSON.stringify({ event: 'platform_login_success', userId: user.id, email: normalizedEmail, ip }));
    return this.issueTokens({ ...user, schoolId: null });
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
