import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  private async assertTypeInSchool(schoolId: string, gradingSetTypeId: string) {
    const type = await this.prisma.gradingSetType.findFirst({
      where: { id: gradingSetTypeId, schoolId, deletedAt: null },
    });
    if (!type) {
      throw new BadRequestException('Grading category not found in school');
    }
  }

  list(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId, deletedAt: null },
      include: { gradingSetType: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(schoolId: string, dto: CreateSubjectDto) {
    await this.assertTypeInSchool(schoolId, dto.gradingSetTypeId);
    return this.prisma.subject.create({
      data: {
        schoolId,
        name: dto.name,
        gradingSetTypeId: dto.gradingSetTypeId,
      },
      include: { gradingSetType: true },
    });
  }

  async update(schoolId: string, id: string, dto: UpdateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where: { id, schoolId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    if (dto.gradingSetTypeId) {
      await this.assertTypeInSchool(schoolId, dto.gradingSetTypeId);
    }
    return this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        gradingSetTypeId: dto.gradingSetTypeId,
      },
      include: { gradingSetType: true },
    });
  }

  async remove(schoolId: string, id: string) {
    const existing = await this.prisma.subject.findFirst({
      where: { id, schoolId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException();
    }
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
