import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
      school_id: user.schoolId,
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

  async me(userId: string, schoolId: string) {
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
      school: {
        id: user.school.id,
        name: user.school.name,
      },
    };
  }
}
