import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../super-admin/email.service';

export interface MfaTokenPayload {
  sub: string;
  type: 'mfa-pending';
  email: string;
  schoolId: string | null;
  userName: string;
}

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async sendOtpAndGetToken(user: {
    id: string;
    email: string;
    name: string;
    schoolId: string | null;
  }): Promise<string> {
    await this.prisma.emailOtpCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = randomInt(100000, 1000000).toString();
    const codeHash = createHash('sha256').update(code).digest('hex');
    await this.prisma.emailOtpCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    void this.email.sendOtpCode({ to: user.email, code, userName: user.name });

    const payload: MfaTokenPayload = {
      sub: user.id,
      type: 'mfa-pending',
      email: user.email,
      schoolId: user.schoolId,
      userName: user.name,
    };
    return this.jwt.sign(payload, { expiresIn: '10m' });
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    const now = new Date();
    const codeHash = createHash('sha256').update(code).digest('hex');
    const activeWhere = { userId, usedAt: null, expiresAt: { gt: now } };

    const locked = await this.prisma.emailOtpCode.findFirst({
      where: { ...activeWhere, failedAttempts: { gte: 5 } },
      select: { id: true },
    });
    if (locked) return false;

    const result = await this.prisma.emailOtpCode.updateMany({
      where: { ...activeWhere, codeHash },
      data: { usedAt: now },
    });
    if (result.count > 0) return true;

    await this.prisma.emailOtpCode.updateMany({
      where: activeWhere,
      data: { failedAttempts: { increment: 1 } },
    });
    return false;
  }

  async isTrustedDevice(userId: string, deviceToken: string): Promise<boolean> {
    if (!deviceToken) return false;
    const tokenHash = createHash('sha256').update(deviceToken).digest('hex');
    const record = await this.prisma.trustedDevice.findFirst({
      where: { userId, tokenHash, expiresAt: { gt: new Date() } },
    });
    return !!record;
  }

  async createTrustedDevice(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return rawToken;
  }

  validateMfaToken(token: string): MfaTokenPayload | null {
    try {
      const payload = this.jwt.verify<MfaTokenPayload>(token);
      if (payload.type !== 'mfa-pending') return null;
      return payload;
    } catch {
      return null;
    }
  }
}
