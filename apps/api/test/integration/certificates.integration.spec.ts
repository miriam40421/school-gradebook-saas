import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role, TERM_LOCKED_CODE } from '@school/shared';

describe('Certificates Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let classAId: string;
  let termAId: string;
  let studentAId: string;
  let subjectMathId: string;
  let schoolBId: string;
  let adminAToken: string;
  let homeroomToken: string;
  let subjectToken: string;

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
    await prisma.certificateSnapshot.deleteMany();
    await prisma.editLock.deleteMany();
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
      data: { name: 'Cert School A', settingsJson: {} },
    });
    schoolBId = (
      await prisma.school.create({
        data: { name: 'Cert School B', settingsJson: {} },
      })
    ).id;

    const type = await prisma.gradingSetType.create({
      data: { schoolId: schoolA.id, key: 'academic', label: 'לימודי' },
    });
    const set = await prisma.gradingSet.create({
      data: {
        schoolId: schoolA.id,
        name: 'Academic',
        gradingSetTypeId: type.id,
      },
    });
    await prisma.gradingSetValue.createMany({
      data: [
        { gradingSetId: set.id, label: 'Excellent', order: 1 },
        { gradingSetId: set.id, label: 'Good', order: 2 },
      ],
    });

    await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        role: Role.Admin,
        name: 'Admin A',
        email: 'admin@demo-a.local',
        passwordHash: hash,
      },
    });
    const homeroom = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        role: Role.HomeroomTeacher,
        name: 'Homeroom A',
        email: 'teacher@demo-a.local',
        passwordHash: hash,
      },
    });
    const subjectTeacher = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        role: Role.SubjectTeacher,
        name: 'Subject A',
        email: 'subject@demo-a.local',
        passwordHash: hash,
      },
    });

    const cls = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        name: 'Grade 3',
        year: 2025,
        homeroomTeacherId: homeroom.id,
      },
    });
    classAId = cls.id;

    const math = await prisma.subject.create({
      data: {
        schoolId: schoolA.id,
        name: 'Math',
        gradingSetTypeId: type.id,
      },
    });
    subjectMathId = math.id;

    const student = await prisma.student.create({
      data: {
        schoolId: schoolA.id,
        classId: classAId,
        fullName: 'Student One',
      },
    });
    studentAId = student.id;

    const term = await prisma.gradingTerm.create({
      data: { schoolId: schoolA.id, name: 'Term 1', isLocked: false },
    });
    termAId = term.id;

    await prisma.teacherAssignment.create({
      data: {
        schoolId: schoolA.id,
        userId: subjectTeacher.id,
        classId: classAId,
        subjectId: subjectMathId,
      },
    });

    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@demo-a.local' },
    });
    await prisma.gradeEntry.create({
      data: {
        schoolId: schoolA.id,
        studentId: studentAId,
        classId: classAId,
        subjectId: subjectMathId,
        termId: termAId,
        teacherId: adminUser!.id,
        value: 'Good',
      },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'DemoAdmin1!' });
      return res.body.accessToken as string;
    };

    adminAToken = await login('admin@demo-a.local');
    homeroomToken = await login('teacher@demo-a.local');
    subjectToken = await login('subject@demo-a.local');
  });

  beforeEach(async () => {
    await prisma.gradingTerm.update({
      where: { id: termAId },
      data: { isLocked: false },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks bulk-update when term locked', async () => {
    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: true })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          { studentId: studentAId, subjectId: subjectMathId, value: 'Excellent' },
        ],
      })
      .expect(403);

    expect(res.body.code).toBe(TERM_LOCKED_CODE);

    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: false })
      .expect(200);
  });

  it('blocks lock acquire when term locked', async () => {
    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: true })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        subjectId: subjectMathId,
      })
      .expect(403);

    expect(res.body.code).toBe(TERM_LOCKED_CODE);

    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: false })
      .expect(200);
  });

  it('rejects generate when term unlocked', async () => {
    await request(app.getHttpServer())
      .post('/certificates/generate')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ classId: classAId, termId: termAId })
      .expect(400);
  });

  it('generates snapshot and pdf when term locked', async () => {
    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: true })
      .expect(200);

    const gen = await request(app.getHttpServer())
      .post('/certificates/generate')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ classId: classAId, termId: termAId })
      .expect(201);

    expect(gen.body.results[0]?.ok).toBe(true);
    const snapshotId = gen.body.results[0]?.snapshotId as string;

    const pdf = await request(app.getHttpServer())
      .get(`/certificates/snapshots/${snapshotId}/pdf`)
      .set('Authorization', `Bearer ${homeroomToken}`)
      .expect(200);

    expect(pdf.headers['content-type']).toMatch(/pdf/);
    expect(pdf.body.length).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get(`/certificates/snapshots?classId=${classAId}&termId=${termAId}`)
      .set('Authorization', `Bearer ${subjectToken}`)
      .expect(200);

    expect(list.body.length).toBeGreaterThan(0);
  });

  it('forbids subject teacher from generating', async () => {
    await request(app.getHttpServer())
      .post('/certificates/generate')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send({ classId: classAId, termId: termAId })
      .expect(403);
  });

  it('returns 404 for cross-tenant snapshot', async () => {
    const snap = await prisma.certificateSnapshot.findFirst({
      where: { termId: termAId },
    });
    expect(snap).toBeTruthy();

    const schoolBAdmin = await prisma.user.create({
      data: {
        schoolId: schoolBId,
        role: Role.Admin,
        name: 'Admin B',
        email: 'admin-b-cert@demo.local',
        passwordHash: await bcrypt.hash('DemoAdmin1!', 12),
      },
    });
    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-b-cert@demo.local', password: 'DemoAdmin1!' });
    void schoolBAdmin;

    await request(app.getHttpServer())
      .get(`/certificates/snapshots/${snap!.id}/pdf`)
      .set('Authorization', `Bearer ${loginB.body.accessToken}`)
      .expect(404);
  });
});
