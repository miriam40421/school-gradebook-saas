import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL_SUFFIXES = ['@demo-a.local', '@demo-b.local'];
const DEMO_SCHOOL_NAMES = ['בית ספר לדוגמה', 'בית ספר אחר'];

async function main() {
  const demoSchools = await prisma.school.findMany({
    where: { name: { in: DEMO_SCHOOL_NAMES } },
    select: { id: true, name: true },
  });

  const demoUsers = await prisma.user.findMany({
    where: {
      OR: DEMO_EMAIL_SUFFIXES.map((suffix) => ({
        email: { endsWith: suffix },
      })),
    },
    select: { id: true, email: true, schoolId: true },
  });

  const schoolIds = new Set([
    ...demoSchools.map((s) => s.id),
    ...demoUsers.map((u) => u.schoolId),
  ]);

  if (schoolIds.size === 0) {
    console.log('No demo schools or demo users found — nothing to delete.');
    return;
  }

  for (const id of schoolIds) {
    await prisma.school.delete({ where: { id } });
  }

  console.log(
    `Removed ${schoolIds.size} demo school(s) (cascade: users, classes, students, grades, assignments).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
