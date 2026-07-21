import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD before running');
  }

  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!admin) throw new Error('No super admin found in DB');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: admin.id },
    data: { email, passwordHash },
  });

  console.log(`Super admin updated → ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
