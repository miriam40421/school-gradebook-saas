import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    const users = await this.prisma.user.findMany({
      where: { email },
      include: { school: true },
    });
    if (users.length === 0) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, ip, reason: 'user_not_found' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    let matchedUser = null;
    for (const candidate of users) {
      if (await bcrypt.compare(dto.password, candidate.passwordHash)) {
        matchedUser = candidate;
        break;
      }
    }
    if (!matchedUser) {
      this.logger.warn(JSON.stringify({ event: 'login_failure', email, ip, reason: 'wrong_password' }));
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = matchedUser;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      school_id: user.schoolId,
      role: user.role as Role,
    };
    const accessToken = this.jwt.sign(payload);
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
      where: { id: userId, schoolId },
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
