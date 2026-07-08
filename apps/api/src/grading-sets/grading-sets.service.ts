import {

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import {

  CreateGradingSetDto,

  CreateGradingSetValueDto,

  UpdateGradingSetDto,

  UpdateGradingSetValueDto,

} from './dto/grading-set.dto';



@Injectable()

export class GradingSetsService {

  constructor(private prisma: PrismaService) {}



  private async findSetOrThrow(schoolId: string, id: string) {

    const set = await this.prisma.gradingSet.findFirst({

      where: { id, schoolId, deletedAt: null },

      include: {

        values: { orderBy: { order: 'asc' } },

        gradingSetType: true,

      },

    });

    if (!set) {

      throw new NotFoundException();

    }

    return set;

  }



  private async assertTypeInSchool(schoolId: string, gradingSetTypeId: string) {

    const t = await this.prisma.gradingSetType.findFirst({

      where: { id: gradingSetTypeId, schoolId, deletedAt: null },

    });

    if (!t) throw new NotFoundException('Grading set type not found');

    return t;

  }



  list(schoolId: string) {

    return this.prisma.gradingSet.findMany({

      where: { schoolId, deletedAt: null },

      include: {

        values: { orderBy: { order: 'asc' } },

        gradingSetType: true,

      },

      orderBy: { name: 'asc' },

    });

  }



  async create(schoolId: string, dto: CreateGradingSetDto) {
    await this.assertTypeInSchool(schoolId, dto.gradingSetTypeId);
    const existing = await this.prisma.gradingSet.findFirst({
      where: { schoolId, gradingSetTypeId: dto.gradingSetTypeId, deletedAt: null },
      include: { values: true, gradingSetType: true },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.gradingSet.create({

      data: {

        schoolId,

        name: dto.name,

        gradingSetTypeId: dto.gradingSetTypeId,

      },

      include: { values: true, gradingSetType: true },

    });

  }



  async update(schoolId: string, id: string, dto: UpdateGradingSetDto) {

    await this.findSetOrThrow(schoolId, id);

    if (dto.gradingSetTypeId) {

      await this.assertTypeInSchool(schoolId, dto.gradingSetTypeId);

    }

    return this.prisma.gradingSet.update({

      where: { id },

      data: dto,

      include: {

        values: { orderBy: { order: 'asc' } },

        gradingSetType: true,

      },

    });

  }



  async remove(schoolId: string, id: string) {

    await this.findSetOrThrow(schoolId, id);

    await this.prisma.gradingSet.update({ where: { id }, data: { deletedAt: new Date() } });

    return { success: true };

  }



  async listValues(schoolId: string, setId: string) {

    const set = await this.findSetOrThrow(schoolId, setId);

    return set.values;

  }



  async addValue(schoolId: string, setId: string, dto: CreateGradingSetValueDto) {

    const set = await this.findSetOrThrow(schoolId, setId);

    let order = dto.order;
    if (order === undefined) {
      const maxOrder = set.values.reduce((m, v) => Math.max(m, v.order), 0);
      order = maxOrder + 1;
    }

    return this.prisma.gradingSetValue.create({

      data: { gradingSetId: setId, label: dto.label, order },

    });

  }



  async updateValue(

    schoolId: string,

    setId: string,

    valueId: string,

    dto: UpdateGradingSetValueDto,

  ) {

    await this.findSetOrThrow(schoolId, setId);

    const value = await this.prisma.gradingSetValue.findFirst({

      where: { id: valueId, gradingSetId: setId },

    });

    if (!value) {

      throw new NotFoundException();

    }

    return this.prisma.gradingSetValue.update({

      where: { id: valueId },

      data: dto,

    });

  }



  async removeValue(schoolId: string, setId: string, valueId: string) {

    await this.findSetOrThrow(schoolId, setId);

    const value = await this.prisma.gradingSetValue.findFirst({

      where: { id: valueId, gradingSetId: setId },

    });

    if (!value) {

      throw new NotFoundException();

    }

    await this.prisma.gradingSetValue.delete({ where: { id: valueId } });

    return { success: true };

  }

}

