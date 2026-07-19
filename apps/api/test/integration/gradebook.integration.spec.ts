import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role } from '@school/shared';

describe('Gradebook Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolAId: string;
  let schoolBId: string;
  let classAId: string;
  let termAId: string;
  let studentAId: string;
  let subjectMathId: string;
  let subjectEnglishId: string;
  let academicTypeId: string;
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
      data: { name: 'Gradebook School A', settingsJson: {} },
    });
    schoolAId = schoolA.id;
    const schoolB = await prisma.school.create({
      data: { name: 'Gradebook School B', settingsJson: {} },
    });
    schoolBId = schoolB.id;

    const type = await prisma.gradingSetType.create({
      data: { schoolId: schoolAId, key: 'academic', label: 'לימודי' },
    });
    academicTypeId = type.id;
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
    const homeroom = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.HomeroomTeacher,
        name: 'Homeroom A',
        email: 'teacher@demo-a.local',
        passwordHash: hash,
      },
    });
    await prisma.trustedDevice.create({
      data: {
        userId: homeroom.id,
        tokenHash: createHash('sha256').update('test-device-teacher@demo-a.local').digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const subjectTeacher = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.SubjectTeacher,
        name: 'Subject A',
        email: 'subject@demo-a.local',
        passwordHash: hash,
      },
    });
    await prisma.trustedDevice.create({
      data: {
        userId: subjectTeacher.id,
        tokenHash: createHash('sha256').update('test-device-subject@demo-a.local').digest('hex'),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    const classB = await prisma.class.create({
      data: { schoolId: schoolBId, name: 'B Class', year: 2025 },
    });
    const termB = await prisma.gradingTerm.create({
      data: { schoolId: schoolBId, name: 'Term B' },
    });

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@demo-a.local', password: 'DemoAdmin1!', schoolId: schoolAId, deviceToken: 'test-device-admin@demo-a.local' });
    adminAToken = loginAdmin.body.accessToken;

    const loginHomeroom = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@demo-a.local', password: 'DemoAdmin1!', schoolId: schoolAId, deviceToken: 'test-device-teacher@demo-a.local' });
    homeroomToken = loginHomeroom.body.accessToken;

    const loginSubject = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'subject@demo-a.local', password: 'DemoAdmin1!', schoolId: schoolAId, deviceToken: 'test-device-subject@demo-a.local' });
    subjectToken = loginSubject.body.accessToken;

    // store B ids for isolation test
    void classB;
    void termB;
  });

  afterAll(async () => {
    await app.close();
  });

  it('tenant isolation: school A cannot GET school B gradebook', async () => {
    const classB = await prisma.class.findFirst({ where: { schoolId: schoolBId } });
    const termB = await prisma.gradingTerm.findFirst({
      where: { schoolId: schoolBId },
    });
    await request(app.getHttpServer())
      .get(`/gradebook?classId=${classB!.id}&termId=${termB!.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);
  });

  it('grading terms RBAC: teacher cannot POST', async () => {
    await request(app.getHttpServer())
      .post('/grading-terms')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ name: 'Blocked' })
      .expect(403);
  });

  it('admin can CRUD grading terms', async () => {
    const created = await request(app.getHttpServer())
      .post('/grading-terms')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Term 2' })
      .expect(201);
    expect(created.body.name).toBe('Term 2');

    await request(app.getHttpServer())
      .patch(`/grading-terms/${created.body.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Term 2 Renamed' })
      .expect(200);

    await prisma.gradeEntry.create({
      data: {
        schoolId: schoolAId,
        studentId: studentAId,
        classId: classAId,
        subjectId: subjectMathId,
        termId: termAId,
        teacherId: (
          await prisma.user.findFirst({
            where: { email: 'admin@demo-a.local' },
          })
        )!.id,
        value: 'Good',
      },
    });
    await request(app.getHttpServer())
      .delete(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(409);
  });

  it('admin cannot bulk-update grades (view only)', async () => {
    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          {
            studentId: studentAId,
            subjectId: subjectMathId,
            value: 'Excellent',
          },
        ],
      })
      .expect(403);

    const matrix = await request(app.getHttpServer())
      .get(`/gradebook?classId=${classAId}&termId=${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    expect(matrix.body.editableSubjectIds).toHaveLength(0);
  });

  it('homeroom teacher can edit all subjects in her class', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        subjectId: subjectEnglishId,
      })
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
            value: 'Excellent',
          },
        ],
      })
      .expect(201);
  });

  it('subject teacher allowed on assigned subject', async () => {
    await request(app.getHttpServer())
      .post('/locks/acquire')
      .set('Authorization', `Bearer ${subjectToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        subjectId: subjectMathId,
      })
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
      .expect(201);
  });

  it('subject teacher gradebook matrix lists only focused subject', async () => {
    const matrix = await request(app.getHttpServer())
      .get(
        `/gradebook?classId=${classAId}&termId=${termAId}&subjectId=${subjectMathId}`,
      )
      .set('Authorization', `Bearer ${subjectToken}`)
      .expect(200);
    expect(matrix.body.subjects).toHaveLength(1);
    expect(matrix.body.subjects[0].id).toBe(subjectMathId);
    expect(matrix.body.editableSubjectIds).toEqual([subjectMathId]);
  });

  it('subject teacher denied on unassigned subject', async () => {
    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${subjectToken}`)
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
      .expect(403);
  });

  it('invalid label returns 400', async () => {
    await request(app.getHttpServer())
      .post('/gradebook/bulk-update')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        classId: classAId,
        termId: termAId,
        updates: [
          {
            studentId: studentAId,
            subjectId: subjectMathId,
            value: 'NotALabel',
          },
        ],
      })
      .expect(400);
  });

  it('resolves labels when duplicate set is empty but another has values', async () => {
    await prisma.gradingSet.create({
      data: {
        schoolId: schoolAId,
        name: 'Duplicate empty',
        gradingSetTypeId: academicTypeId,
      },
    });
    await request(app.getHttpServer())
      .get(`/gradebook?classId=${classAId}&termId=${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
  });
});
