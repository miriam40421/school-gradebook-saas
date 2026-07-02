import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Role } from '@school/shared';

describe('Certificate Templates Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let schoolAId: string;
  let classAId: string;
  let termAId: string;
  let studentAId: string;
  let subjectMathId: string;
  let adminAToken: string;
  let homeroomToken: string;

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
    await prisma.certificateTemplate.deleteMany();
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
      data: { name: 'Tpl School A', settingsJson: {} },
    });
    schoolAId = schoolA.id;

    const type = await prisma.gradingSetType.create({
      data: { schoolId: schoolAId, key: 'academic', label: 'לימודי' },
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
        name: 'Admin Tpl',
        email: 'admin-tpl@demo.local',
        passwordHash: hash,
      },
    });
    const homeroom = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        role: Role.HomeroomTeacher,
        name: 'Homeroom Tpl',
        email: 'teacher-tpl@demo.local',
        passwordHash: hash,
      },
    });

    const cls = await prisma.class.create({
      data: {
        schoolId: schoolAId,
        name: 'Grade 4',
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

    const student = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        classId: classAId,
        fullName: 'Student Tpl',
      },
    });
    studentAId = student.id;

    const term = await prisma.gradingTerm.create({
      data: { schoolId: schoolAId, name: 'Term Tpl', isLocked: false },
    });
    termAId = term.id;

    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin-tpl@demo.local' },
    });
    await prisma.gradeEntry.create({
      data: {
        schoolId: schoolAId,
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

    adminAToken = await login('admin-tpl@demo.local');
    homeroomToken = await login('teacher-tpl@demo.local');
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin creates template with scaffold layout', async () => {
    const res = await request(app.getHttpServer())
      .post('/certificate-templates')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'תבנית א׳', orientation: 'portrait' })
      .expect(201);

    expect(res.body.layoutJson.blocks).toHaveLength(2);
    expect(res.body.layoutVersion).toBe(1);
  });

  it('non-admin cannot list templates', async () => {
    await request(app.getHttpServer())
      .get('/certificate-templates')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .expect(403);
  });

  it('admin PATCH layout increments layout_version', async () => {
    const created = await request(app.getHttpServer())
      .post('/certificate-templates')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Patch Test', orientation: 'landscape' });

    const layout = created.body.layoutJson;
    layout.blocks.push({
      id: 'extra-block',
      type: 'date',
      box: { xMm: 10, yMm: 160, wMm: 50, hMm: 10 },
      style: {
        fontFamily: 'Arial',
        fontSizePt: 10,
        fontWeight: 'normal',
        color: '#1e293b',
        textAlign: 'right',
        backgroundColor: 'transparent',
      },
      props: { format: 'hebrew' },
    });

    const patched = await request(app.getHttpServer())
      .patch(`/certificate-templates/${created.body.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ layoutJson: layout })
      .expect(200);

    expect(patched.body.layoutVersion).toBe(2);
  });

  it('admin preview returns PDF content-type', async () => {
    const created = await request(app.getHttpServer())
      .post('/certificate-templates')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Preview', orientation: 'portrait' });

    const res = await request(app.getHttpServer())
      .post(`/certificate-templates/${created.body.id}/preview`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  it('link templateId on profile → generate includes templateId in snapshot', async () => {
    const tpl = await request(app.getHttpServer())
      .post('/certificate-templates')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Linked', orientation: 'portrait' });

    await request(app.getHttpServer())
      .patch('/school')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        settingsJson: {
          certificateProfiles: [
            {
              id: 'default',
              name: 'ברירת מחדל',
              certificate: {},
              templateId: tpl.body.id,
            },
          ],
          defaultCertificateProfileId: 'default',
        },
      })
      .expect(200);

    await prisma.class.update({
      where: { id: classAId },
      data: { certificateProfileId: 'default' },
    });

    await request(app.getHttpServer())
      .patch(`/grading-terms/${termAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isLocked: true });

    const gen = await request(app.getHttpServer())
      .post('/certificates/generate')
      .set('Authorization', `Bearer ${homeroomToken}`)
      .send({ classId: classAId, termId: termAId, studentIds: [studentAId] })
      .expect(201);

    const snapshotId = gen.body.results[0]?.snapshotId;
    expect(snapshotId).toBeDefined();

    const snap = await prisma.certificateSnapshot.findFirst({
      where: { id: snapshotId },
    });
    const json = snap?.snapshotJson as Record<string, unknown>;
    expect(json.templateId).toBe(tpl.body.id);
    expect(json.pageOrientation).toBe('portrait');
  });

  it('DELETE linked template returns 409', async () => {
    const tpl = await request(app.getHttpServer())
      .post('/certificate-templates')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Blocked Delete', orientation: 'portrait' });

    await request(app.getHttpServer())
      .patch('/school')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        settingsJson: {
          certificateProfiles: [
            {
              id: 'default',
              name: 'ברירת מחדל',
              certificate: {},
              templateId: tpl.body.id,
            },
          ],
        },
      });

    const res = await request(app.getHttpServer())
      .delete(`/certificate-templates/${tpl.body.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(409);

    expect(res.body.profileNames ?? res.body.message).toBeTruthy();
  });

  it('PATCH school with invalid templateId returns 400', async () => {
    await request(app.getHttpServer())
      .patch('/school')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        settingsJson: {
          certificateProfiles: [
            {
              id: 'default',
              name: 'ברירת מחדל',
              certificate: {},
              templateId: '00000000-0000-0000-0000-000000000000',
            },
          ],
        },
      })
      .expect(400);
  });
});
