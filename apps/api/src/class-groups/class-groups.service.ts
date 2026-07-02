import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassGroupDto, UpdateClassGroupDto } from './dto/class-group.dto';

@Injectable()
export class ClassGroupsService {
  constructor(private prisma: PrismaService) {}

  private async assertClass(schoolId: string, classId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!cls) {
      throw new NotFoundException('Class not found');
    }
    return cls;
  }

  private groupInclude = {
    subject: { select: { id: true, name: true } },
  };

  private async assertSubjectInSchool(schoolId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
    if (!subject) {
      throw new BadRequestException('Subject not found in school');
    }
  }

  list(schoolId: string, classId: string) {
    return this.assertClass(schoolId, classId).then(() =>
      this.prisma.classGroup.findMany({
        where: { schoolId, classId },
        include: this.groupInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  async create(schoolId: string, classId: string, dto: CreateClassGroupDto) {
    await this.assertClass(schoolId, classId);
    if (dto.subjectId) {
      await this.assertSubjectInSchool(schoolId, dto.subjectId);
    }
    return this.prisma.classGroup.create({
      data: {
        schoolId,
        classId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        subjectId: dto.subjectId ?? null,
      },
      include: this.groupInclude,
    });
  }

  async update(
    schoolId: string,
    classId: string,
    id: string,
    dto: UpdateClassGroupDto,
  ) {
    const existing = await this.prisma.classGroup.findFirst({
      where: { id, schoolId, classId },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    if (dto.subjectId) {
      await this.assertSubjectInSchool(schoolId, dto.subjectId);
    }
    return this.prisma.classGroup.update({
      where: { id },
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder,
        subjectId: dto.subjectId,
      },
      include: this.groupInclude,
    });
  }

  async remove(schoolId: string, classId: string, id: string) {
    const existing = await this.prisma.classGroup.findFirst({
      where: { id, schoolId, classId },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    const [legacyAssigned, membershipCount] = await Promise.all([
      this.prisma.student.count({
        where: { classGroupId: id, schoolId },
      }),
      this.prisma.studentClassGroup.count({
        where: { classGroupId: id, schoolId },
      }),
    ]);
    if (legacyAssigned > 0 || membershipCount > 0) {
      throw new BadRequestException('Group has students assigned');
    }
    await this.prisma.classGroup.delete({ where: { id } });
    return { success: true };
  }
}
