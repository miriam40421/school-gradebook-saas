import { ForbiddenException } from '@nestjs/common';
import { Role } from '@school/shared';
import { SchoolUserPayload } from '../auth/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

export async function assertHomeroomClassAccess(
  prisma: PrismaService,
  user: SchoolUserPayload,
  classId: string,
) {
  if (user.role === Role.Admin) {
    return;
  }
  if (user.role !== Role.HomeroomTeacher) {
    throw new ForbiddenException();
  }
  const cls = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId: user.school_id,
      homeroomTeacherId: user.sub,
    },
  });
  if (!cls) {
    throw new ForbiddenException('Not homeroom teacher for this class');
  }
}

export async function assertHomeroomStudentAccess(
  prisma: PrismaService,
  user: SchoolUserPayload,
  studentId: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: user.school_id },
    select: { classId: true },
  });
  if (!student) {
    return null;
  }
  await assertHomeroomClassAccess(prisma, user, student.classId);
  return student;
}

export function assertHomeroomWrite(user: SchoolUserPayload) {
  if (user.role !== Role.HomeroomTeacher) {
    throw new ForbiddenException('Only homeroom teacher can manage students');
  }
}
