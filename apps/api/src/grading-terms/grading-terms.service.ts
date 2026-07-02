import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GradingTermDto } from '@school/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradingTermDto, UpdateGradingTermDto } from './dto/grading-term.dto';

@Injectable()
export class GradingTermsService {
  constructor(private prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    name: string;
    isLocked: boolean;
  }): GradingTermDto {
    return { id: row.id, name: row.name, isLocked: row.isLocked };
  }

  list(schoolId: string): Promise<GradingTermDto[]> {
    return this.prisma.gradingTerm
      .findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
      })
      .then((rows) => rows.map((r) => this.toDto(r)));
  }

  async create(schoolId: string, dto: CreateGradingTermDto): Promise<GradingTermDto> {
    const row = await this.prisma.gradingTerm.create({
      data: { schoolId, name: dto.name },
    });
    return this.toDto(row);
  }

  async update(
    schoolId: string,
    id: string,
    dto: UpdateGradingTermDto,
  ): Promise<GradingTermDto> {
    const existing = await this.prisma.gradingTerm.findFirst({
      where: { id, schoolId },
    });
    if (!existing) throw new NotFoundException();

    if (dto.isLocked === true && !existing.isLocked) {
      await this.prisma.editLock.deleteMany({
        where: { schoolId, termId: id },
      });
    }

    const row = await this.prisma.gradingTerm.update({
      where: { id },
      data: {
        name: dto.name,
        isLocked: dto.isLocked,
      },
    });
    return this.toDto(row);
  }

  async remove(schoolId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.gradingTerm.findFirst({
      where: { id, schoolId },
    });
    if (!existing) throw new NotFoundException();

    const [entryCount, snapshotCount, supplementCount] = await Promise.all([
      this.prisma.gradeEntry.count({ where: { termId: id, schoolId } }),
      this.prisma.certificateSnapshot.count({ where: { termId: id, schoolId } }),
      this.prisma.certificateSupplement.count({ where: { termId: id, schoolId } }),
    ]);

    if (entryCount > 0) {
      throw new ConflictException('Term has grade entries');
    }
    if (snapshotCount > 0) {
      throw new ConflictException('Term has generated certificates');
    }
    if (supplementCount > 0) {
      throw new ConflictException('Term has certificate supplement data');
    }

    await this.prisma.editLock.deleteMany({ where: { schoolId, termId: id } });
    await this.prisma.gradingTerm.delete({ where: { id } });
    return { success: true };
  }

  async findInSchool(schoolId: string, id: string) {
    return this.prisma.gradingTerm.findFirst({ where: { id, schoolId } });
  }
}
