import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
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

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId: dto.schoolId, email } },
    });
    if (!user) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'user_not_found' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, schoolId: dto.schoolId, ip, reason: 'wrong_password' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      school_id: user.schoolId ?? null,
      role: user.role as Role,
    };
    const accessToken = this.jwt.sign(payload, { jwtid: randomUUID() });
    this.logger.log(JSON.stringify({ event: 'login_success', userId: user.id, email, schoolId: user.schoolId, ip }));
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    };
  }

  async platformLogin(email: string, password: string, ip?: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, role: 'super_admin', deletedAt: null },
    });
    if (!user) {
      this.logger.warn(JSON.stringify({ event: 'platform_login_failure', email: normalizedEmail, ip, reason: 'user_not_found' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      this.logger.warn(JSON.stringify({ event: 'platform_login_failure', email: normalizedEmail, ip, reason: 'wrong_password' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      school_id: null,
      role: user.role as Role,
    };
    const accessToken = this.jwt.sign(payload, { jwtid: randomUUID() });
    this.logger.log(JSON.stringify({ event: 'platform_login_success', userId: user.id, email: normalizedEmail, ip }));
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: null,
      },
    };
  }

  async forgotPassword(schoolId: string, email: string, origin?: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId, email: normalizedEmail } },
    });
    // Always return success — don't reveal if user exists
    if (!user || user.deletedAt) return { success: true };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const appUrl = origin ?? process.env.APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    void this.email.sendPasswordReset({ to: user.email, resetUrl, userName: user.name });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('הקישור אינו תקף או שפג תוקפו');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
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
      include: { school: true },
    });
    if (!user) {
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
      school: user.school ? { id: user.school.id, name: user.school.name } : null,
    };
  }
}
