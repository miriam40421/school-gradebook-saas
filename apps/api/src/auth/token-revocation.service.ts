import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenRevocationService {
  constructor(private prisma: PrismaService) {}

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.prisma.revokedToken.upsert({
      where: { jti },
      update: {},
      create: { jti, expiresAt },
    });
  }

  async isRevoked(jti: string): Promise<boolean> {
    const token = await this.prisma.revokedToken.findUnique({ where: { jti } });
    return token !== null;
  }

  async purgeExpired(): Promise<void> {
    await this.prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
