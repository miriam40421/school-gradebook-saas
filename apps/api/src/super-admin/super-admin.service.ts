import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { EmailService } from './email.service';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(private prisma: PrismaService, private email: EmailService) {}

  async listSchools(includeDeleted = false) {
    const schools = await this.prisma.school.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: [{ deletedAt: 'asc' }, { name: 'asc' }],
    });
    return schools.map((s) => ({
      id: s.id,
      name: s.name,
      isBlocked: s.isBlocked,
      isDeleted: s.deletedAt !== null,
    }));
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: 'admin', deletedAt: null },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            students: { where: { deletedAt: null } },
            certificateSnapshots: true,
          },
        },
      },
    });
    if (!school || school.deletedAt) throw new NotFoundException('School not found');
    return {
      id: school.id,
      name: school.name,
      isBlocked: school.isBlocked,
      studentCount: school._count.students,
      certificateCount: school._count.certificateSnapshots,
      admin: school.users[0] ?? null,
    };
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    const passwordHash = dto.adminPassword ? await bcrypt.hash(dto.adminPassword, 12) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { id } });
      if (!school || school.deletedAt) throw new NotFoundException('School not found');

      if (dto.schoolName) {
        await tx.school.update({ where: { id }, data: { name: dto.schoolName.trim() } });
      }

      const admin = await tx.user.findFirst({
        where: { schoolId: id, role: 'admin', deletedAt: null },
        orderBy: { name: 'asc' },
      });

      if (dto.adminName || dto.adminEmail || dto.adminPassword) {
        if (!admin) throw new NotFoundException('Admin user not found');

        if (dto.adminEmail) {
          const conflict = await tx.user.findFirst({
            where: { schoolId: id, email: dto.adminEmail.toLowerCase(), deletedAt: null, id: { not: admin.id } },
          });
          if (conflict) throw new ConflictException('Email already exists in school');
        }

        const data: { name?: string; email?: string; passwordHash?: string } = {};
        if (dto.adminName) data.name = dto.adminName.trim();
        if (dto.adminEmail) data.email = dto.adminEmail.toLowerCase();
        if (passwordHash) data.passwordHash = passwordHash;
        await tx.user.update({ where: { id: admin.id }, data });
      }

      return {
        schoolNameAfter: dto.schoolName ? dto.schoolName.trim() : school.name,
        adminEmail: dto.adminEmail ? dto.adminEmail.toLowerCase() : (admin?.email ?? ''),
      };
    });

    if (dto.schoolName || dto.adminEmail || dto.adminPassword) {
      if (result.adminEmail) {
        this.email.sendSchoolUpdate({
          to: result.adminEmail,
          schoolName: result.schoolNameAfter,
          schoolId: id,
          adminEmail: result.adminEmail,
          changedPassword: dto.adminPassword,
          schoolNameChanged: !!dto.schoolName,
        }).catch((err: unknown) => this.logger.error('sendSchoolUpdate failed', err));
      }
    }

    return this.getSchool(id);
  }

  async blockSchool(id: string, block: boolean) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school || school.deletedAt) throw new NotFoundException('School not found');
    await this.prisma.school.update({ where: { id }, data: { isBlocked: block } });
    return { id, isBlocked: block };
  }

  async deleteSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school || school.deletedAt) throw new NotFoundException('School not found');
    await this.prisma.school.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  async restoreSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    if (!school.deletedAt) throw new NotFoundException('School is not deleted');
    await this.prisma.school.update({ where: { id }, data: { deletedAt: null, isBlocked: false } });
    return { success: true };
  }

  async createSchool(dto: CreateSchoolDto) {
    const hash = await bcrypt.hash(dto.adminPassword, 12);
    const result = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name: dto.schoolName.trim() },
      });
      const admin = await tx.user.create({
        data: {
          schoolId: school.id,
          role: 'admin',
          name: dto.adminName.trim(),
          email: dto.adminEmail.toLowerCase(),
          passwordHash: hash,
        },
      });
      return {
        school: { id: school.id, name: school.name },
        admin: { id: admin.id, email: admin.email },
      };
    });

    // Send email only after transaction commits successfully
    this.email.sendSchoolWelcome({
      to: result.admin.email,
      schoolName: result.school.name,
      schoolId: result.school.id,
      adminEmail: result.admin.email,
      adminPassword: dto.adminPassword,
    }).catch((err: unknown) => this.logger.error('sendSchoolWelcome failed', err));

    return result;
  }
}
