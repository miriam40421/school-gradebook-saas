import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@school/shared';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';



@Injectable()

export class ClassesService {

  constructor(private prisma: PrismaService) {}



  private classInclude = {
    homeroomTeacher: { select: { id: true, name: true, email: true, role: true } },
  };

  private listInclude = {
    ...this.classInclude,
    groups: {
      orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
      include: { subject: { select: { id: true, name: true } } },
    },
  };



  private async assertHomeroomTeacher(schoolId: string, userId: string | null | undefined) {

    if (!userId) return;

    const teacher = await this.prisma.user.findFirst({

      where: { id: userId, schoolId, deletedAt: null },

    });

    if (!teacher) {

      throw new BadRequestException('Teacher not found in school');

    }

    if (teacher.role !== Role.HomeroomTeacher && teacher.role !== Role.Admin) {

      throw new BadRequestException('User must be homeroom teacher or admin');

    }

  }



  async list(schoolId: string, user?: JwtPayload) {
    let where: { schoolId: string; homeroomTeacherId?: string; id?: { in: string[] } } =
      { schoolId };
    if (user?.role === Role.HomeroomTeacher) {
      where = { schoolId, homeroomTeacherId: user.sub };
    } else if (user?.role === Role.SubjectTeacher) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: { schoolId, userId: user.sub },
        select: { classId: true },
        distinct: ['classId'],
      });
      const classIds = assignments.map((a) => a.classId);
      if (classIds.length === 0) {
        return [];
      }
      where = { schoolId, id: { in: classIds } };
    }
    const orderBy = [{ year: 'desc' as const }, { name: 'asc' as const }];
    try {
      return await this.prisma.class.findMany({
        where: { ...where, deletedAt: null },
        include: this.listInclude,
        orderBy,
      });
    } catch {
      return this.prisma.class.findMany({
        where: { ...where, deletedAt: null },
        include: {
          ...this.classInclude,
          groups: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        },
        orderBy,
      });
    }
  }



  async create(schoolId: string, dto: CreateClassDto) {
    if (!dto.homeroomTeacherId) {
      throw new BadRequestException('Homeroom teacher is required');
    }
    await this.assertHomeroomTeacher(schoolId, dto.homeroomTeacherId);

    return this.prisma.class.create({

      data: {

        schoolId,

        name: dto.name,

        year: dto.year,

        yearHebrew: dto.yearHebrew ?? null,

        homeroomTeacherId: dto.homeroomTeacherId,

        ...(dto.certificateProfileId !== undefined
          ? { certificateProfileId: dto.certificateProfileId }
          : {}),

      },

      include: this.classInclude,

    });

  }



  async update(schoolId: string, id: string, dto: UpdateClassDto) {

    const existing = await this.prisma.class.findFirst({ where: { id, schoolId, deletedAt: null } });

    if (!existing) {

      throw new NotFoundException();

    }

    if (dto.homeroomTeacherId !== undefined) {

      await this.assertHomeroomTeacher(schoolId, dto.homeroomTeacherId ?? undefined);

    }

    const data: Prisma.ClassUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.yearHebrew !== undefined) data.yearHebrew = dto.yearHebrew;
    if (dto.homeroomTeacherId !== undefined) {
      data.homeroomTeacher = dto.homeroomTeacherId
        ? { connect: { id: dto.homeroomTeacherId } }
        : { disconnect: true };
    }
    if (dto.certificateProfileId !== undefined) {
      data.certificateProfileId = dto.certificateProfileId;
    }

    return this.prisma.class.update({

      where: { id },

      data,

      include: this.classInclude,

    });

  }



  async remove(schoolId: string, id: string) {

    const existing = await this.prisma.class.findFirst({ where: { id, schoolId, deletedAt: null } });

    if (!existing) {

      throw new NotFoundException();

    }

    const studentCount = await this.prisma.student.count({

      where: { classId: id, schoolId, deletedAt: null },

    });

    if (studentCount > 0) {

      throw new NotFoundException('Class has students');

    }

    await this.prisma.class.update({ where: { id }, data: { deletedAt: new Date() } });

    return { success: true };

  }

}

