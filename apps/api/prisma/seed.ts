import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'DemoAdmin1!';

async function main() {
  if (process.env.SEED_DEMO !== '1') {
    console.log(
      'Seed skipped. Set SEED_DEMO=1 to load demo data (wipes all schools first).',
    );
    console.log('To remove demo data only: pnpm db:clear-demo');
    return;
  }

  await prisma.certificateSnapshot.deleteMany();
  await prisma.editLock.deleteMany();
  await prisma.gradeEntry.deleteMany();
  await prisma.gradingTerm.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.gradingSetValue.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.gradingSet.deleteMany();
  await prisma.gradingSetType.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const schoolA = await prisma.school.create({
    data: { name: 'בית ספר לדוגמה', settingsJson: {} },
  });
  await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      role: 'admin',
      name: 'מנהלת דמו',
      email: 'admin@demo-a.local',
      passwordHash,
    },
  });
  const homeroom = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      role: 'homeroom_teacher',
      name: 'מחנכת דמו',
      email: 'teacher@demo-a.local',
      passwordHash,
    },
  });
  const subjectTeacher = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      role: 'subject_teacher',
      name: 'מורת מתמטיקה',
      email: 'subject@demo-a.local',
      passwordHash,
    },
  });
  const mathTeacher = await prisma.user.create({
    data: {
      schoolId: schoolA.id,
      role: 'subject_teacher',
      name: 'מורה מתמטיקה ב׳',
      email: 'teacher.math@demo.local',
      passwordHash,
    },
  });

  const typeAcademic = await prisma.gradingSetType.create({
    data: { schoolId: schoolA.id, key: 'limudi', label: 'לימודי' },
  });
  const setAcademic = await prisma.gradingSet.create({
    data: {
      schoolId: schoolA.id,
      name: 'ציונים לימודיים',
      gradingSetTypeId: typeAcademic.id,
    },
  });
  await prisma.gradingSetValue.createMany({
    data: [
      { gradingSetId: setAcademic.id, label: 'מצוין', order: 1 },
      { gradingSetId: setAcademic.id, label: 'טוב', order: 2 },
      { gradingSetId: setAcademic.id, label: 'מספיק', order: 3 },
    ],
  });

  const math = await prisma.subject.create({
    data: {
      schoolId: schoolA.id,
      name: 'מתמטיקה',
      gradingSetTypeId: typeAcademic.id,
    },
  });
  const english = await prisma.subject.create({
    data: {
      schoolId: schoolA.id,
      name: 'אנגלית',
      gradingSetTypeId: typeAcademic.id,
    },
  });

  const typeBehavior = await prisma.gradingSetType.create({
    data: { schoolId: schoolA.id, key: 'hitnahagut', label: 'התנהגות' },
  });
  const setBehavior = await prisma.gradingSet.create({
    data: {
      schoolId: schoolA.id,
      name: 'ציוני התנהגות',
      gradingSetTypeId: typeBehavior.id,
    },
  });
  await prisma.gradingSetValue.createMany({
    data: [
      { gradingSetId: setBehavior.id, label: 'מצוין', order: 1 },
      { gradingSetId: setBehavior.id, label: 'טוב', order: 2 },
      { gradingSetId: setBehavior.id, label: 'דורש שיפור', order: 3 },
    ],
  });
  await prisma.subject.create({
    data: {
      schoolId: schoolA.id,
      name: 'התנהגות כללית',
      gradingSetTypeId: typeBehavior.id,
    },
  });

  await prisma.userSubject.createMany({
    data: [
      { userId: subjectTeacher.id, subjectId: math.id },
      { userId: mathTeacher.id, subjectId: math.id },
    ],
  });

  const cls = await prisma.class.create({
    data: {
      schoolId: schoolA.id,
      name: 'ג׳1',
      year: 2025,
      yearHebrew: 'תשפ״ה',
      homeroomTeacherId: homeroom.id,
    },
  });

  const student1 = await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      classId: cls.id,
      fullName: 'נועה כהן',
    },
  });
  await prisma.student.create({
    data: {
      schoolId: schoolA.id,
      classId: cls.id,
      fullName: 'יעל לוי',
    },
  });

  const term = await prisma.gradingTerm.create({
    data: { schoolId: schoolA.id, name: 'סמסטר א׳' },
  });

  await prisma.teacherAssignment.createMany({
    data: [
      {
        schoolId: schoolA.id,
        userId: subjectTeacher.id,
        classId: cls.id,
        subjectId: math.id,
      },
      {
        schoolId: schoolA.id,
        userId: mathTeacher.id,
        classId: cls.id,
        subjectId: math.id,
      },
    ],
  });

  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@demo-a.local' },
  });
  await prisma.gradeEntry.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      classId: cls.id,
      subjectId: math.id,
      termId: term.id,
      teacherId: adminUser!.id,
      value: 'טוב',
    },
  });
  await prisma.gradeEntry.create({
    data: {
      schoolId: schoolA.id,
      studentId: student1.id,
      classId: cls.id,
      subjectId: english.id,
      termId: term.id,
      teacherId: adminUser!.id,
      value: 'מצוין',
    },
  });

  const schoolB = await prisma.school.create({
    data: { name: 'בית ספר אחר', settingsJson: {} },
  });
  await prisma.user.create({
    data: {
      schoolId: schoolB.id,
      role: 'admin',
      name: 'מנהלת ב',
      email: 'admin@demo-b.local',
      passwordHash,
    },
  });
  await prisma.gradingTerm.create({
    data: { schoolId: schoolB.id, name: 'סמסטר ב׳' },
  });

  console.log(
    'Seed complete: School A — class ג׳1, term סמסטר א׳, Math conflict demo: teacher@demo-a.local (homeroom) vs teacher.math@demo.local (math)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
