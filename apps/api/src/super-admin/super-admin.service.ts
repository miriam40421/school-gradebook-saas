import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { EmailService } from './email.service';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  async listSchools() {
    const schools = await this.prisma.school.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
    });
    return schools.map((s) => ({
      id: s.id,
      name: s.name,
      userCount: s._count.users,
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
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return {
      id: school.id,
      name: school.name,
      admin: school.users[0] ?? null,
    };
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    if (dto.schoolName) {
      await this.prisma.school.update({ where: { id }, data: { name: dto.schoolName.trim() } });
    }

    const admin = await this.prisma.user.findFirst({
      where: { schoolId: id, role: 'admin', deletedAt: null },
      orderBy: { name: 'asc' },
    });

    if (dto.adminName || dto.adminEmail || dto.adminPassword) {
      if (!admin) throw new NotFoundException('Admin user not found');

      if (dto.adminEmail) {
        const conflict = await this.prisma.user.findFirst({
          where: { schoolId: id, email: dto.adminEmail.toLowerCase(), deletedAt: null, id: { not: admin.id } },
        });
        if (conflict) throw new ConflictException('Email already exists in school');
      }

      const data: { name?: string; email?: string; passwordHash?: string } = {};
      if (dto.adminName) data.name = dto.adminName.trim();
      if (dto.adminEmail) data.email = dto.adminEmail.toLowerCase();
      if (dto.adminPassword) data.passwordHash = await bcrypt.hash(dto.adminPassword, 12);
      await this.prisma.user.update({ where: { id: admin.id }, data });
    }

    if (dto.schoolName || dto.adminEmail || dto.adminPassword) {
      const schoolNameAfter = dto.schoolName ? dto.schoolName.trim() : school.name;
      const emailAfter = dto.adminEmail ? dto.adminEmail.toLowerCase() : (admin?.email ?? '');
      void this.email.sendSchoolUpdate({
        to: emailAfter,
        schoolName: schoolNameAfter,
        schoolId: id,
        adminEmail: emailAfter,
        changedPassword: dto.adminPassword,
        schoolNameChanged: !!dto.schoolName,
      });
    }

    return this.getSchool(id);
  }

  async createSchool(dto: CreateSchoolDto) {
    const hash = await bcrypt.hash(dto.adminPassword, 12);
    return this.prisma.$transaction(async (tx) => {
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
      const result = {
        school: { id: school.id, name: school.name },
        admin: { id: admin.id, email: admin.email },
      };

      void this.email.sendSchoolWelcome({
        to: admin.email,
        schoolName: school.name,
        schoolId: school.id,
        adminEmail: admin.email,
        adminPassword: dto.adminPassword,
      });

      return result;
    });
  }
}
