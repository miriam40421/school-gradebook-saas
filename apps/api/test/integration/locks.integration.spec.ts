import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role } from '@school/shared';

describe('Locks Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolAId: string;
  let schoolBId: string;
  let classAId: string;
  let termAId: string;
  let studentAId: string;
  let subjectMathId: string;
  let subjectEnglishId: string;
  let homeroomUserId: string;
  let adminAToken: string;
  let homeroomToken: string;
  let homeroomBToken: string;
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
    await prisma.editLock.deleteMany();
    await prisma.gradeEntry.deleteMany();
    await prisma.gradingTerm.deleteMany();
    await prisma.teacherAssignment.deleteMany();
    await prisma.gradingSetValue.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.gradingSet.deleteMany();
    await prisma.gradingSetType.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();
    await prisma.school.deleteMany();

    const hash = await bcrypt.hash('DemoAdmin1!', 12);
    const schoolA = await prisma.school.create({
      data: { name: 'Lock School A', settingsJson: {} },
    });
    schoolAId = schoolA.id;
    const schoolB = await prisma.school.create({
      data: { name: 'Lock School B', settingsJson: {} },
    });
    schoolBId = schoolB.id;

    const type = await prisma.gradingSetType.create({
      data: { schoolId: schoolAId, key: 'academic', label: 'Academic' },
    });
    const set = await prisma.gradingSet.create({
      data: {
        schoolId: schoolAId,
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
        schoolId: schoolAId,
        role: Role.Admin,
        name: 'Admin A',
        email: 'admin@demo-a.local',
        passwordHash: hash,
      },
    });
    const homeroom = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.HomeroomTeacher,
        name: 'Homeroom A',
        email: 'teacher@demo-a.local',
        passwordHash: hash,
      },
    });
    homeroomUserId = homeroom.id;
    const subjectTeacher = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.SubjectTeacher,
        name: 'Subject A',
        email: 'subject@demo-a.local',
        passwordHash: hash,
      },
    });
    const cls = await prisma.class.create({
      data: {
        schoolId: schoolAId,
        name: 'Grade 3',
        year: 2025,
        homeroomTeacherId: homeroom.id,
      },
    });
    classAId = cls.id;

    const math = await prisma.subject.create({
      data: {
        schoolId: schoolAId,
        name: 'Math',
        gradingSetTypeId: type.id,
      },
    });
    subjectMathId = math.id;
    const english = await prisma.subject.create({
      data: {
        schoolId: schoolAId,
        name: 'English',
        gradingSetTypeId: type.id,
      },
    });
    subjectEnglishId = english.id;

    const student = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        classId: classAId,
        fullName: 'Student One',
      },
    });
    studentAId = student.id;

    const term = await prisma.gradingTerm.create({
      data: { schoolId: schoolAId, name: 'Semester 1' },
    });
    termAId = term.id;

    await prisma.teacherAssignment.create({
      data: {
        schoolId: schoolAId,
        userId: subjectTeacher.id,
        classId: classAId,
        subjectId: subjectMathId,
      },
    });

    await prisma.user.create({
      data: {
        schoolId: schoolBId,
        role: Role.Admin,
        name: 'Admin B',
        email: 'admin@demo-b.local',
        passwordHash: hash,
      },
    });
    await prisma.user.create({
      data: {
        schoolId: schoolBId,
        role: Role.HomeroomTeacher,
        name: 'Homeroom B',
        email: 'teacher@demo-b.local',
        passwordHash: hash,
      },
    });

    adminAToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@demo-a.local', password: 'DemoAdmin1!' })
    ).body.accessToken;

    homeroomToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'teacher@demo-a.local', password: 'DemoAdmin1!' })
    ).body.accessToken;

    subjectToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'subject@demo-a.local', password: 'DemoAdmin1!' })
    ).body.accessToken;

    homeroomBToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'teacher@demo-b.local', password: 'DemoAdmin1!' })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const acquireBody = (subjectId: string) => ({
    classId: classAId,
    termId: termAId,
    subjectId,
  });

  it('acquire happy path returns lockId and expiresAt', async () => {
    const res = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);
    expect(res.body.lockId).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();
    await prisma.editLock.deleteMany();
  });

  it('conflict when another user holds lock', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send(acquireBody(subjectMathId))
      .expect(409);
    expect(conflict.body.lockedBy.name).toBe('Homeroom A');
    expect(conflict.body.expiresAt).toBeDefined();

    await prisma.editLock.deleteMany();
  });

  it('release then re-acquire by second user', async () => {
    const first = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/locks/release')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ lockId: first.body.lockId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await prisma.editLock.deleteMany();
  });

  it('bulk-update without lock returns 409', async () => {
    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          {
            studentId: studentAId,
            subjectId: subjectEnglishId,
            value: 'Excellent',
          },
        ],
      })
      .expect(409);
  });

  it('bulk-update with lock succeeds', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectEnglishId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          {
            studentId: studentAId,
            subjectId: subjectEnglishId,
            value: 'Good',
          },
        ],
      })
      .expect(201);

    await prisma.editLock.deleteMany();
  });

  it('bulk-update conflict when other user holds lock', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          {
            studentId: studentAId,
            subjectId: subjectMathId,
            value: 'Good',
          },
        ],
      })
      .expect(409);

    await prisma.editLock.deleteMany();
  });

  it('expired lock allows new acquire; heartbeat on expired returns 404', async () => {
    const acquired = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await prisma.editLock.update({
      where: { id: acquired.body.lockId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/locks/heartbeat')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ lockId: acquired.body.lockId })
      .expect(404);

    await prisma.editLock.deleteMany();
  });

  it('same user re-acquire refreshes TTL', async () => {
    const first = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await new Promise((r) => setTimeout(r, 50));

    const second = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    expect(second.body.lockId).toBe(first.body.lockId);
    const row = await prisma.editLock.findUnique({
      where: { id: first.body.lockId },
    });
    expect(row!.expiresAt.getTime()).toBeGreaterThan(
      new Date(first.body.expiresAt).getTime() - 1000,
    );

    await prisma.editLock.deleteMany();
  });

  it('admin acquire returns 403', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send(acquireBody(subjectMathId))
      .expect(403);
  });

  it('cross-school lock release returns 404', async () => {
    const acquired = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/locks/release')
      .set('Authorization', `Bearer ${homeroomBToken}`)
      .send({ lockId: acquired.body.lockId })
      .expect(404);

    await prisma.editLock.deleteMany();
  });

  it('GET /gradebook includes active locks', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    const matrix = await request(app.getHttpServer())
      .get(`/gradebook?classId=${classAId}&termId=${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(matrix.body.locks).toHaveLength(1);
    expect(matrix.body.locks[0].subjectId).toBe(subjectMathId);
    expect(matrix.body.locks[0].lockedBy.id).toBe(homeroomUserId);

    await prisma.editLock.deleteMany();
  });

  it('heartbeat extends lock for holder', async () => {
    const acquired = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    const beat = await request(app.getHttpServer())
      .post('/locks/heartbeat')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send({ lockId: acquired.body.lockId })
      .expect(201);

    expect(beat.body.expiresAt).toBeDefined();
    await prisma.editLock.deleteMany();
  });

  it('release by non-holder returns 403', async () => {
    const acquired = await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/locks/release')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send({ lockId: acquired.body.lockId })
      .expect(403);

    await prisma.editLock.deleteMany();
  });

  it('GET /locks lists non-expired locks', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send(acquireBody(subjectMathId))
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/locks?classId=${classAId}&termId=${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(list.body).toHaveLength(1);
    await prisma.editLock.deleteMany();
  });
});
