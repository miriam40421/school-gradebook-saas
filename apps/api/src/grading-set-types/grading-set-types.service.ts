import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradingSetTypeDto, UpdateGradingSetTypeDto } from './dto/grading-set-type.dto';

@Injectable()
export class GradingSetTypesService {
  constructor(private prisma: PrismaService) {}

  private slugifyKey(label: string): string {
    const base = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const safe = base.match(/^[a-z]/) ? base : `t_${base || 'custom'}`;
    return `${safe}_${Date.now().toString(36)}`;
  }

  private async assertValidParent(
    schoolId: string,
    parentId: string | null | undefined,
    selfId?: string,
  ) {
    if (parentId === undefined) return;
    if (parentId === null || parentId === '') return;
    if (selfId && parentId === selfId) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    const parent = await this.prisma.gradingSetType.findFirst({
      where: { id: parentId, schoolId, deletedAt: null },
    });
    if (!parent) {
      throw new BadRequestException('Parent category not found');
    }
    if (selfId) {
      let cursor: string | null = parentId;
      while (cursor) {
        if (cursor === selfId) {
          throw new BadRequestException('Circular category hierarchy');
        }
        const row: { parentId: string | null } | null =
          await this.prisma.gradingSetType.findFirst({
          where: { id: cursor, schoolId, deletedAt: null },
          select: { parentId: true },
        });
        cursor = row?.parentId ?? null;
      }
    }
  }

  list(schoolId: string) {
    return this.prisma.gradingSetType.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: [{ label: 'asc' }],
    });
  }

  async create(schoolId: string, dto: CreateGradingSetTypeDto) {
    const key = dto.key ?? this.slugifyKey(dto.label);
    const existing = await this.prisma.gradingSetType.findFirst({
      where: { schoolId, key, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Type key already exists');
    }
    await this.assertValidParent(schoolId, dto.parentId);
    return this.prisma.gradingSetType.create({
      data: {
        schoolId,
        key,
        label: dto.label,
        parentId: dto.parentId || null,
      },
    });
  }

  async update(schoolId: string, id: string, dto: UpdateGradingSetTypeDto) {
    const row = await this.prisma.gradingSetType.findFirst({ where: { id, schoolId, deletedAt: null } });
    if (!row) throw new NotFoundException();
    if (dto.parentId !== undefined) {
      await this.assertValidParent(schoolId, dto.parentId, id);
    }
    return this.prisma.gradingSetType.update({
      where: { id },
      data: {
        label: dto.label,
        ...(dto.parentId !== undefined ? { parentId: dto.parentId || null } : {}),
      },
    });
  }

  async remove(schoolId: string, id: string) {
    const row = await this.prisma.gradingSetType.findFirst({ where: { id, schoolId, deletedAt: null } });
    if (!row) throw new NotFoundException();

    const childCount = await this.prisma.gradingSetType.count({
      where: { parentId: id, schoolId, deletedAt: null },
    });
    if (childCount > 0) {
      throw new ConflictException('Category has sub-categories');
    }

    const subjectCount = await this.prisma.subject.count({
      where: { gradingSetTypeId: id, schoolId, deletedAt: null },
    });
    if (subjectCount > 0) {
      throw new ConflictException('Category is used by subjects');
    }

    const setCount = await this.prisma.gradingSet.count({
      where: { gradingSetTypeId: id, schoolId, deletedAt: null },
    });
    if (setCount > 0) {
      throw new ConflictException('Type is used by grading sets');
    }

    await this.prisma.gradingSetType.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
