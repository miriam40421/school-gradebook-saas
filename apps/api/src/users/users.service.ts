import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private userInclude = {
    homeroomClasses: {
      select: { id: true, name: true, year: true, yearHebrew: true },
      orderBy: [{ year: 'desc' as const }, { name: 'asc' as const }],
    },
    subjects: {
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            gradingSetType: { select: { id: true, label: true } },
          },
        },
      },
    },
  };

  private formatClassLabel(c: {
    name: string;
    year: number;
    yearHebrew: string | null;
  }) {
    return `${c.name} · ${c.year}${c.yearHebrew ? ` (${c.yearHebrew})` : ''}`;
  }

  private sanitize(user: {
    id: string;
    schoolId: string;
    role: string;
    name: string;
    email: string;
    homeroomClasses?: {
      id: string;
      name: string;
      year: number;
      yearHebrew: string | null;
    }[];
    subjects?: {
      subject: {
        id: string;
        name: string;
        gradingSetType: { id: string; label: string };
      };
    }[];
  }) {
    const subjects =
      user.subjects
        ?.map((s) => s.subject)
        .sort((a, b) => a.name.localeCompare(b.name, 'he')) ?? [];
    const homeroomClasses =
      user.homeroomClasses
        ?.slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'he'))
        .map((c) => ({
          id: c.id,
          name: c.name,
          year: c.year,
          yearHebrew: c.yearHebrew,
          label: this.formatClassLabel(c),
        })) ?? [];
    return {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      name: user.name,
      email: user.email,
      subjects,
      homeroomClasses,
      homeroomClassLabels: homeroomClasses.map((c) => c.label),
    };
  }

  private async assertSubjectsInSchool(schoolId: string, subjectIds: string[]) {
    if (subjectIds.length === 0) {
      return;
    }
    const count = await this.prisma.subject.count({
      where: { schoolId, id: { in: subjectIds } },
    });
    if (count !== subjectIds.length) {
      throw new BadRequestException('One or more subjects not found in school');
    }
  }

  private async syncSubjects(userId: string, subjectIds: string[] | undefined) {
    if (subjectIds === undefined) {
      return;
    }
    await this.prisma.userSubject.deleteMany({ where: { userId } });
    if (subjectIds.length > 0) {
      await this.prisma.userSubject.createMany({
        data: subjectIds.map((subjectId) => ({ userId, subjectId })),
      });
    }
  }

  list(schoolId: string) {
    return this.prisma.user
      .findMany({
        where: { schoolId },
        include: this.userInclude,
        orderBy: { name: 'asc' },
      })
      .then((users) => users.map((u) => this.sanitize(u)));
  }

  async create(schoolId: string, dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { schoolId, email },
    });
    if (existing) {
      throw new ConflictException('Email already exists in school');
    }
    if (dto.role === Role.SubjectTeacher) {
      if (!dto.subjectIds?.length) {
        throw new BadRequestException(
          'Subject teacher requires at least one subject',
        );
      }
      await this.assertSubjectsInSchool(schoolId, dto.subjectIds);
    } else if (dto.subjectIds?.length) {
      throw new BadRequestException('Only subject teachers can have subjects');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        schoolId,
        name: dto.name,
        email,
        role: dto.role,
        passwordHash,
      },
      include: this.userInclude,
    });
    if (dto.role === Role.SubjectTeacher && dto.subjectIds) {
      await this.syncSubjects(user.id, dto.subjectIds);
      const refreshed = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: this.userInclude,
      });
      return this.sanitize(refreshed);
    }
    return this.sanitize(user);
  }

  async update(schoolId: string, id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, schoolId },
      include: { subjects: true },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    if (dto.role && dto.role !== Role.Admin && existing.role === Role.Admin) {
      const adminCount = await this.prisma.user.count({
        where: { schoolId, role: Role.Admin },
      });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last admin');
      }
    }
    const nextRole = dto.role ?? existing.role;
    if (nextRole === Role.SubjectTeacher) {
      const ids = dto.subjectIds ?? existing.subjects.map((s) => s.subjectId);
      if (!ids.length) {
        throw new BadRequestException(
          'Subject teacher requires at least one subject',
        );
      }
      await this.assertSubjectsInSchool(schoolId, ids);
      await this.syncSubjects(id, ids);
    } else if (dto.subjectIds !== undefined) {
      throw new BadRequestException('Only subject teachers can have subjects');
    } else if (dto.role && dto.role !== Role.SubjectTeacher) {
      await this.syncSubjects(id, []);
    }
    const data: { name?: string; role?: string; passwordHash?: string } = {};
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: this.userInclude,
    });
    return this.sanitize(user);
  }

  async remove(schoolId: string, id: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, schoolId } });
    if (!existing) {
      throw new NotFoundException();
    }
    if (existing.role === Role.Admin) {
      const adminCount = await this.prisma.user.count({
        where: { schoolId, role: Role.Admin },
      });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot delete the last admin');
      }
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
