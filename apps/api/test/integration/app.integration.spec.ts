import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role } from '@school/shared';

describe('API Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolAId: string;
  let schoolBId: string;
  let academicTypeAId: string;
  let homeroomTeacherId: string;
  let adminAToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://school:school@localhost:5432/school_gradebook';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.gradeEntry.deleteMany();
    await prisma.gradingTerm.deleteMany();
    await prisma.teacherAssignment.deleteMany();
    await prisma.gradingSetValue.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.studentClassGroup.deleteMany();
    await prisma.student.deleteMany();
    await prisma.gradingSet.deleteMany();
    await prisma.gradingSetType.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
    await prisma.school.deleteMany();

    const hash = await bcrypt.hash('DemoAdmin1!', 12);
    const schoolA = await prisma.school.create({
      data: { name: 'Test School A', settingsJson: {} },
    });
    schoolAId = schoolA.id;
    const typeAcademic = await prisma.gradingSetType.create({
      data: { schoolId: schoolAId, key: 'limudi_test', label: 'לימודי' },
    });
    academicTypeAId = typeAcademic.id;
    const adminA = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.Admin,
        name: 'Admin A',
        email: 'admin@demo-a.local',
        passwordHash: hash,
      },
    });
    await prisma.trustedDevice.create({
      data: {
        userId: adminA.id,
        tokenHash: createHash('sha256').update('test-device-admin@demo-a.local').digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const teacher = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.HomeroomTeacher,
        name: 'Teacher A',
        email: 'teacher@demo-a.local',
        passwordHash: hash,
      },
    });
    homeroomTeacherId = teacher.id;
    await prisma.trustedDevice.create({
      data: {
        userId: teacher.id,
        tokenHash: createHash('sha256').update('test-device-teacher@demo-a.local').digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.gradingSet.create({
      data: {
        schoolId: schoolAId,
        name: 'Academic',
        gradingSetTypeId: academicTypeAId,
      },
    });

    const schoolB = await prisma.school.create({
      data: { name: 'Test School B', settingsJson: {} },
    });
    schoolBId = schoolB.id;
    const adminB = await prisma.user.create({
      data: {
        schoolId: schoolBId,
        role: Role.Admin,
        name: 'Admin B',
        email: 'admin@demo-b.local',
        passwordHash: hash,
      },
    });
    await prisma.trustedDevice.create({
      data: {
        userId: adminB.id,
        tokenHash: createHash('sha256').update('test-device-admin@demo-b.local').digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('login success and failure', async () => {
    const ok = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo-a.local', password: 'DemoAdmin1!', schoolId: schoolAId, deviceToken: 'test-device-admin@demo-a.local' })
      .expect(201);
    adminAToken = ok.body.accessToken;
    expect(ok.body.user.schoolId).toBe(schoolAId);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo-a.local', password: 'wrong', schoolId: schoolAId })
      .expect(401);
  });

  it('GET /auth/me with valid and invalid token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('tenant isolation: school A admin cannot access school B grading set', async () => {
    const typeB = await prisma.gradingSetType.create({
      data: { schoolId: schoolBId, key: 'b_type', label: 'סוג ב' },
    });
    const setB = await prisma.gradingSet.create({
      data: {
        schoolId: schoolBId,
        name: 'B Set',
        gradingSetTypeId: typeB.id,
      },
    });
    await request(app.getHttpServer())
      .get(`/grading-sets/${setB.id}/values`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);
  });

  it('RBAC: homeroom teacher gets 403 on POST /grading-sets', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@demo-a.local', password: 'DemoAdmin1!', schoolId: schoolAId, deviceToken: 'test-device-teacher@demo-a.local' })
      .expect(201);
    teacherToken = login.body.accessToken;

    await request(app.getHttpServer())
      .post('/grading-sets')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Blocked', gradingSetTypeId: academicTypeAId })
      .expect(403);
  });

  it('admin happy path: class with homeroom → subject; students by homeroom only', async () => {
    const cls = await request(app.getHttpServer())
      .post('/classes')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Grade 1',
        year: 2025,
        yearHebrew: 'תשפ״ה',
        homeroomTeacherId,
      })
      .expect(201);
    expect(cls.body.homeroomTeacher?.id).toBe(homeroomTeacherId);

    await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Math', gradingSetTypeId: academicTypeAId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ fullName: 'Alice Cohen', classId: cls.body.id })
      .expect(403);

    await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ fullName: 'Alice Cohen', classId: cls.body.id })
      .expect(201);

    const students = await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(students.body.length).toBeGreaterThanOrEqual(1);
  });

  it('subject teacher requires subject ids on create', async () => {
    const subject = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'English', gradingSetTypeId: academicTypeAId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Sub Teacher',
        email: 'sub@demo-a.local',
        password: 'DemoAdmin1!',
        role: Role.SubjectTeacher,
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Sub Teacher',
        email: 'sub@demo-a.local',
        password: 'DemoAdmin1!',
        role: Role.SubjectTeacher,
        subjectIds: [subject.body.id],
      })
      .expect(201);
    expect(created.body.subjects[0].name).toBe('English');
  });

  it('admin can manage class groups', async () => {
    const classes = await request(app.getHttpServer())
      .get('/classes')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    const classId = classes.body[0].id;
    const group = await request(app.getHttpServer())
      .post(`/classes/${classId}/groups`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'רמה א׳' })
      .expect(201);
    expect(group.body.name).toBe('רמה א׳');
  });

  it('admin can add and delete custom grading set type', async () => {
    const created = await request(app.getHttpServer())
      .post('/grading-set-types')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ label: 'מיומנויות', key: 'skills' })
      .expect(201);
    expect(created.body.label).toBe('מיומנויות');

    await request(app.getHttpServer())
      .delete(`/grading-set-types/${created.body.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
  });

  it('GET /grading-set-types returns empty until manager creates types', async () => {
    await prisma.gradingSetValue.deleteMany({
      where: { gradingSet: { schoolId: schoolBId } },
    });
    await prisma.gradingSet.deleteMany({ where: { schoolId: schoolBId } });
    await prisma.gradingSetType.deleteMany({ where: { schoolId: schoolBId } });
    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo-b.local', password: 'DemoAdmin1!', schoolId: schoolBId, deviceToken: 'test-device-admin@demo-b.local' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/grading-set-types')
      .set('Authorization', `Bearer ${loginB.body.accessToken}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });
});
