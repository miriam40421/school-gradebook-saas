/**
 * Unit tests verifying that all service queries on soft-deletable models
 * (User, Student, Class, Subject, GradingSetType, GradingSet) include
 * `deletedAt: null` in their where clauses, and that hard-delete operations
 * are converted to soft-deletes (`update { deletedAt: new Date() }`).
 *
 * Strategy: inject a mock PrismaService that captures every call's `where` arg,
 * then assert the expected fields are present.
 */

// Mock the ExcelJS/mammoth-dependent util before any imports that transitively
// pull it in (StudentsService → import-names.util → ExcelJS / mammoth).
// This prevents a pre-existing TS incompatibility in that file from breaking
// the test suite (the incompatibility is filed in FOLLOWUPS.md).
jest.mock('../../src/students/import-names.util', () => ({
  parseNamesFromBuffer: jest.fn().mockResolvedValue([]),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@school/shared';
import { UsersService } from '../../src/users/users.service';
import { StudentsService } from '../../src/students/students.service';
import { SubjectsService } from '../../src/subjects/subjects.service';
import { GradingSetsService } from '../../src/grading-sets/grading-sets.service';
import { GradingSetTypesService } from '../../src/grading-set-types/grading-set-types.service';
import { ClassesService } from '../../src/classes/classes.service';
import { ClassGroupsService } from '../../src/class-groups/class-groups.service';
import { TeacherAssignmentsService } from '../../src/teacher-assignments/teacher-assignments.service';
import { AuthService } from '../../src/auth/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock Prisma delegate that returns a provided value. */
function mockDelegate(returnValue: unknown = null) {
  return {
    findMany: jest.fn().mockResolvedValue(returnValue ?? []),
    findFirst: jest.fn().mockResolvedValue(returnValue),
    findUnique: jest.fn().mockResolvedValue(returnValue),
    findUniqueOrThrow: jest.fn().mockResolvedValue(returnValue),
    create: jest.fn().mockResolvedValue(returnValue ?? {}),
    update: jest.fn().mockResolvedValue(returnValue ?? {}),
    delete: jest.fn().mockResolvedValue(returnValue ?? {}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
  };
}

// Extract the `where` object from the first call to a mock function.
function capturedWhere(mockFn: jest.Mock): Record<string, unknown> {
  expect(mockFn).toHaveBeenCalled();
  const [firstArg] = mockFn.mock.calls[0] as [{ where?: Record<string, unknown> }];
  return firstArg?.where ?? {};
}

// ---------------------------------------------------------------------------
// UsersService
// ---------------------------------------------------------------------------

describe('UsersService — soft-delete filtering', () => {
  let service: UsersService;
  let userDelegate: ReturnType<typeof mockDelegate>;
  let subjectDelegate: ReturnType<typeof mockDelegate>;
  let userSubjectDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    userDelegate = mockDelegate({
      id: 'u1',
      schoolId: 's1',
      role: Role.HomeroomTeacher,
      name: 'Test',
      email: 'test@x.com',
      passwordHash: '$2a$12$hash',
      deletedAt: null,
      homeroomClasses: [],
      subjects: [],
    });
    // list() returns an array
    userDelegate.findMany.mockResolvedValue([]);
    subjectDelegate = mockDelegate(null);
    userSubjectDelegate = mockDelegate(null);
    (userSubjectDelegate as Record<string, unknown>)['createMany'] = jest.fn().mockResolvedValue({ count: 1 });

    const prisma = {
      user: userDelegate,
      subject: subjectDelegate,
      userSubject: userSubjectDelegate,
    };
    service = new UsersService(prisma as never);
  });

  it('list() passes deletedAt: null', async () => {
    await service.list('s1');
    expect(capturedWhere(userDelegate.findMany)).toMatchObject({ deletedAt: null });
  });

  it('create() duplicate-check uses deletedAt: null', async () => {
    userDelegate.findFirst.mockResolvedValueOnce(null);
    userDelegate.create.mockResolvedValueOnce({
      id: 'u2',
      schoolId: 's1',
      role: Role.HomeroomTeacher,
      name: 'New',
      email: 'new@x.com',
      homeroomClasses: [],
      subjects: [],
    });
    await service.create('s1', {
      name: 'New',
      email: 'new@x.com',
      role: Role.HomeroomTeacher,
      password: 'pass123',
    });
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('update() existence check uses deletedAt: null', async () => {
    const user = {
      id: 'u1',
      schoolId: 's1',
      role: Role.HomeroomTeacher,
      name: 'Old',
      email: 'old@x.com',
      homeroomClasses: [],
      subjects: [],
    };
    userDelegate.findFirst.mockResolvedValueOnce(user);
    userDelegate.update.mockResolvedValueOnce({ ...user, homeroomClasses: [], subjects: [] });
    await service.update('s1', 'u1', { name: 'New' });
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('remove() uses update with deletedAt instead of delete', async () => {
    const adminUser = {
      id: 'u1',
      schoolId: 's1',
      role: Role.HomeroomTeacher,
      name: 'Test',
      email: 'test@x.com',
      deletedAt: null,
    };
    userDelegate.findFirst.mockResolvedValueOnce(adminUser);
    userDelegate.count.mockResolvedValueOnce(2);
    await service.remove('s1', 'u1');
    expect(userDelegate.delete).not.toHaveBeenCalled();
    expect(userDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('remove() existence check uses deletedAt: null', async () => {
    userDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove('s1', 'u1')).rejects.toThrow(NotFoundException);
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('admin count in remove() uses deletedAt: null', async () => {
    const adminUser = {
      id: 'u1',
      schoolId: 's1',
      role: Role.Admin,
      name: 'Admin',
      email: 'admin@x.com',
      deletedAt: null,
    };
    userDelegate.findFirst.mockResolvedValueOnce(adminUser);
    userDelegate.count.mockResolvedValueOnce(2);
    await service.remove('s1', 'u1');
    const countWhere = userDelegate.count.mock.calls[0][0].where;
    expect(countWhere).toMatchObject({ deletedAt: null, role: Role.Admin });
  });

  it('assertSubjectsInSchool count uses deletedAt: null', async () => {
    const createdUser = {
      id: 'u2', schoolId: 's1', role: Role.SubjectTeacher,
      name: 'T', email: 'sub@x.com', homeroomClasses: [], subjects: [],
    };
    userDelegate.findFirst.mockResolvedValueOnce(null); // no duplicate
    subjectDelegate.count.mockResolvedValueOnce(1); // one subject found
    userDelegate.create.mockResolvedValueOnce(createdUser);
    userDelegate.findUniqueOrThrow.mockResolvedValueOnce(createdUser);
    await service.create('s1', {
      name: 'T',
      email: 'sub@x.com',
      role: Role.SubjectTeacher,
      password: 'pass123',
      subjectIds: ['sub1'],
    });
    const subjectCountWhere = subjectDelegate.count.mock.calls[0][0].where;
    expect(subjectCountWhere).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// StudentsService
// ---------------------------------------------------------------------------

describe('StudentsService — soft-delete filtering', () => {
  let service: StudentsService;
  let studentDelegate: ReturnType<typeof mockDelegate>;
  let classDelegate: ReturnType<typeof mockDelegate>;
  let classGroupDelegate: ReturnType<typeof mockDelegate>;
  let studentClassGroupDelegate: ReturnType<typeof mockDelegate>;

  const adminUser = {
    sub: 'admin1',
    school_id: 's1',
    email: 'admin@x.com',
    role: Role.Admin,
  };

  beforeEach(() => {
    studentDelegate = mockDelegate({
      id: 'st1',
      classId: 'c1',
      schoolId: 's1',
      fullName: 'Test Student',
      deletedAt: null,
      class: { id: 'c1', name: 'A' },
      classGroup: null,
    });
    classDelegate = mockDelegate({ id: 'c1', schoolId: 's1', deletedAt: null });
    classGroupDelegate = mockDelegate([]);
    studentClassGroupDelegate = mockDelegate({ count: 0 });

    const prisma = {
      student: studentDelegate,
      class: classDelegate,
      classGroup: classGroupDelegate,
      studentClassGroup: studentClassGroupDelegate,
      $transaction: jest.fn().mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') {
          return fn({
            studentClassGroup: studentClassGroupDelegate,
            student: studentDelegate,
          });
        }
        return Promise.all(fn as Promise<unknown>[]);
      }),
    };
    service = new StudentsService(prisma as never);
  });

  it('list() filters classes with deletedAt: null', async () => {
    classDelegate.findMany.mockResolvedValueOnce([{ id: 'c1' }]);
    studentDelegate.findMany.mockResolvedValueOnce([]);
    await service.list(adminUser);
    const classWhere = capturedWhere(classDelegate.findMany);
    expect(classWhere).toMatchObject({ deletedAt: null });
  });

  it('list() student query includes deletedAt: null', async () => {
    classDelegate.findMany.mockResolvedValueOnce([{ id: 'c1' }]);
    studentDelegate.findMany.mockResolvedValueOnce([]);
    await service.list(adminUser);
    const studentWhere = capturedWhere(studentDelegate.findMany);
    expect(studentWhere).toMatchObject({ deletedAt: null });
  });

  it('remove() uses soft-delete (update) not hard-delete', async () => {
    const homeroomUser = {
      sub: 'h1',
      school_id: 's1',
      email: 'h@x.com',
      role: Role.HomeroomTeacher,
    };
    studentDelegate.findFirst
      .mockResolvedValueOnce({ id: 'st1', classId: 'c1', schoolId: 's1', deletedAt: null })
      .mockResolvedValueOnce({ classId: 'c1' }); // assertHomeroomStudentAccess
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1', homeroomTeacherId: 'h1' });
    await service.remove(homeroomUser, 'st1');
    expect(studentDelegate.delete).not.toHaveBeenCalled();
    expect(studentDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'st1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('remove() existence check uses deletedAt: null', async () => {
    const homeroomUser = {
      sub: 'h1',
      school_id: 's1',
      email: 'h@x.com',
      role: Role.HomeroomTeacher,
    };
    studentDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove(homeroomUser, 'st1')).rejects.toThrow(NotFoundException);
    expect(capturedWhere(studentDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('updateGroupMemberships() existence check uses deletedAt: null', async () => {
    const homeroomUser = {
      sub: 'h1',
      school_id: 's1',
      email: 'h@x.com',
      role: Role.HomeroomTeacher,
    };
    studentDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.updateGroupMemberships(homeroomUser, 'st1', [])
    ).rejects.toThrow(NotFoundException);
    expect(capturedWhere(studentDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('update() existence check uses deletedAt: null', async () => {
    const homeroomUser = {
      sub: 'h1',
      school_id: 's1',
      email: 'h@x.com',
      role: Role.HomeroomTeacher,
    };
    studentDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.update(homeroomUser, 'st1', { fullName: 'New' })).rejects.toThrow(
      NotFoundException,
    );
    expect(capturedWhere(studentDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// SubjectsService
// ---------------------------------------------------------------------------

describe('SubjectsService — soft-delete filtering', () => {
  let service: SubjectsService;
  let subjectDelegate: ReturnType<typeof mockDelegate>;
  let gradingSetTypeDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    subjectDelegate = mockDelegate({
      id: 'sub1',
      schoolId: 's1',
      name: 'Math',
      deletedAt: null,
      gradingSetType: { id: 'gst1', label: 'Grades' },
    });
    gradingSetTypeDelegate = mockDelegate({ id: 'gst1', schoolId: 's1', deletedAt: null });
    const prisma = { subject: subjectDelegate, gradingSetType: gradingSetTypeDelegate };
    service = new SubjectsService(prisma as never);
  });

  it('list() uses deletedAt: null', async () => {
    subjectDelegate.findMany.mockResolvedValueOnce([]);
    await service.list('s1');
    expect(capturedWhere(subjectDelegate.findMany)).toMatchObject({ deletedAt: null });
  });

  it('update() existence check uses deletedAt: null', async () => {
    const subject = { id: 'sub1', schoolId: 's1', deletedAt: null };
    subjectDelegate.findFirst.mockResolvedValueOnce(subject);
    subjectDelegate.update.mockResolvedValueOnce({ ...subject, gradingSetType: {} });
    await service.update('s1', 'sub1', { name: 'Science' });
    expect(capturedWhere(subjectDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('remove() uses soft-delete not hard-delete', async () => {
    subjectDelegate.findFirst.mockResolvedValueOnce({ id: 'sub1', schoolId: 's1' });
    await service.remove('s1', 'sub1');
    expect(subjectDelegate.delete).not.toHaveBeenCalled();
    expect(subjectDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('remove() existence check uses deletedAt: null', async () => {
    subjectDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove('s1', 'sub1')).rejects.toThrow(NotFoundException);
    expect(capturedWhere(subjectDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('assertTypeInSchool uses deletedAt: null for gradingSetType', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.create('s1', { name: 'X', gradingSetTypeId: 'gst1' })).rejects.toThrow();
    expect(capturedWhere(gradingSetTypeDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// GradingSetsService
// ---------------------------------------------------------------------------

describe('GradingSetsService — soft-delete filtering', () => {
  let service: GradingSetsService;
  let gradingSetDelegate: ReturnType<typeof mockDelegate>;
  let gradingSetTypeDelegate: ReturnType<typeof mockDelegate>;
  let gradingSetValueDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    gradingSetDelegate = mockDelegate({
      id: 'gs1',
      schoolId: 's1',
      name: 'Set A',
      deletedAt: null,
      values: [],
      gradingSetType: { id: 'gst1', label: 'T' },
    });
    gradingSetTypeDelegate = mockDelegate({ id: 'gst1', schoolId: 's1', deletedAt: null });
    gradingSetValueDelegate = mockDelegate(null);
    const prisma = {
      gradingSet: gradingSetDelegate,
      gradingSetType: gradingSetTypeDelegate,
      gradingSetValue: gradingSetValueDelegate,
    };
    service = new GradingSetsService(prisma as never);
  });

  it('list() uses deletedAt: null', async () => {
    gradingSetDelegate.findMany.mockResolvedValueOnce([]);
    await service.list('s1');
    expect(capturedWhere(gradingSetDelegate.findMany)).toMatchObject({ deletedAt: null });
  });

  it('findSetOrThrow uses deletedAt: null', async () => {
    gradingSetDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.listValues('s1', 'gs1')).rejects.toThrow(NotFoundException);
    expect(capturedWhere(gradingSetDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('create() duplicate-check uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce({ id: 'gst1' });
    gradingSetDelegate.findFirst.mockResolvedValueOnce(null);
    gradingSetDelegate.create.mockResolvedValueOnce({
      id: 'gs2', values: [], gradingSetType: {},
    });
    await service.create('s1', { name: 'Set B', gradingSetTypeId: 'gst1' });
    const setWhere = gradingSetDelegate.findFirst.mock.calls[0][0].where;
    expect(setWhere).toMatchObject({ deletedAt: null });
  });

  it('remove() uses soft-delete not hard-delete', async () => {
    gradingSetDelegate.findFirst.mockResolvedValueOnce({
      id: 'gs1', values: [], gradingSetType: {},
    });
    await service.remove('s1', 'gs1');
    expect(gradingSetDelegate.delete).not.toHaveBeenCalled();
    expect(gradingSetDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gs1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('assertTypeInSchool uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.create('s1', { name: 'X', gradingSetTypeId: 'gst1' })).rejects.toThrow();
    expect(capturedWhere(gradingSetTypeDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// GradingSetTypesService
// ---------------------------------------------------------------------------

describe('GradingSetTypesService — soft-delete filtering', () => {
  let service: GradingSetTypesService;
  let gradingSetTypeDelegate: ReturnType<typeof mockDelegate>;
  let subjectDelegate: ReturnType<typeof mockDelegate>;
  let gradingSetDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    gradingSetTypeDelegate = mockDelegate({
      id: 'gst1',
      schoolId: 's1',
      key: 'math',
      label: 'Math',
      parentId: null,
      deletedAt: null,
    });
    subjectDelegate = mockDelegate(null);
    gradingSetDelegate = mockDelegate(null);
    const prisma = {
      gradingSetType: gradingSetTypeDelegate,
      subject: subjectDelegate,
      gradingSet: gradingSetDelegate,
    };
    service = new GradingSetTypesService(prisma as never);
  });

  it('list() uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findMany.mockResolvedValueOnce([]);
    await service.list('s1');
    expect(capturedWhere(gradingSetTypeDelegate.findMany)).toMatchObject({ deletedAt: null });
  });

  it('create() key-uniqueness check uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce(null);
    gradingSetTypeDelegate.create.mockResolvedValueOnce({ id: 'gst2' });
    await service.create('s1', { label: 'Science' });
    expect(capturedWhere(gradingSetTypeDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('update() existence check uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce({
      id: 'gst1', schoolId: 's1', deletedAt: null, parentId: null,
    });
    gradingSetTypeDelegate.update.mockResolvedValueOnce({});
    await service.update('s1', 'gst1', { label: 'Updated' });
    expect(capturedWhere(gradingSetTypeDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('remove() uses soft-delete not hard-delete', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce({ id: 'gst1' });
    gradingSetTypeDelegate.count.mockResolvedValueOnce(0);
    subjectDelegate.count.mockResolvedValueOnce(0);
    gradingSetDelegate.count.mockResolvedValueOnce(0);
    await service.remove('s1', 'gst1');
    expect(gradingSetTypeDelegate.delete).not.toHaveBeenCalled();
    expect(gradingSetTypeDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gst1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('remove() counts use deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce({ id: 'gst1' });
    gradingSetTypeDelegate.count.mockResolvedValueOnce(0);
    subjectDelegate.count.mockResolvedValueOnce(0);
    gradingSetDelegate.count.mockResolvedValueOnce(0);
    await service.remove('s1', 'gst1');
    const childCountWhere = gradingSetTypeDelegate.count.mock.calls[0][0].where;
    expect(childCountWhere).toMatchObject({ deletedAt: null });
    const subjectCountWhere = subjectDelegate.count.mock.calls[0][0].where;
    expect(subjectCountWhere).toMatchObject({ deletedAt: null });
    const setCountWhere = gradingSetDelegate.count.mock.calls[0][0].where;
    expect(setCountWhere).toMatchObject({ deletedAt: null });
  });

  it('remove() existence check uses deletedAt: null', async () => {
    gradingSetTypeDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(service.remove('s1', 'gst1')).rejects.toThrow(NotFoundException);
    expect(capturedWhere(gradingSetTypeDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// ClassesService
// ---------------------------------------------------------------------------

describe('ClassesService — soft-delete filtering', () => {
  let service: ClassesService;
  let classDelegate: ReturnType<typeof mockDelegate>;
  let userDelegate: ReturnType<typeof mockDelegate>;
  let studentDelegate: ReturnType<typeof mockDelegate>;
  let teacherAssignmentDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    classDelegate = mockDelegate({
      id: 'c1',
      schoolId: 's1',
      name: 'A',
      year: 2025,
      deletedAt: null,
      homeroomTeacher: null,
      groups: [],
    });
    userDelegate = mockDelegate({
      id: 'u1',
      schoolId: 's1',
      role: Role.HomeroomTeacher,
      deletedAt: null,
    });
    studentDelegate = mockDelegate(null);
    teacherAssignmentDelegate = mockDelegate([]);
    const prisma = {
      class: classDelegate,
      user: userDelegate,
      student: studentDelegate,
      teacherAssignment: teacherAssignmentDelegate,
    };
    service = new ClassesService(prisma as never);
  });

  it('list() uses deletedAt: null', async () => {
    classDelegate.findMany.mockResolvedValueOnce([]);
    await service.list('s1');
    const where = classDelegate.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ deletedAt: null });
  });

  it('update() existence check uses deletedAt: null', async () => {
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1', schoolId: 's1' });
    classDelegate.update.mockResolvedValueOnce({ id: 'c1', homeroomTeacher: null });
    await service.update('s1', 'c1', { name: 'B' });
    expect(capturedWhere(classDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('remove() uses soft-delete not hard-delete', async () => {
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1' });
    studentDelegate.count.mockResolvedValueOnce(0);
    await service.remove('s1', 'c1');
    expect(classDelegate.delete).not.toHaveBeenCalled();
    expect(classDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('remove() student count uses deletedAt: null', async () => {
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1' });
    studentDelegate.count.mockResolvedValueOnce(0);
    await service.remove('s1', 'c1');
    const studentCountWhere = studentDelegate.count.mock.calls[0][0].where;
    expect(studentCountWhere).toMatchObject({ deletedAt: null });
  });

  it('assertHomeroomTeacher uses deletedAt: null for user lookup', async () => {
    userDelegate.findFirst.mockResolvedValueOnce({
      id: 'u1', role: Role.HomeroomTeacher, deletedAt: null,
    });
    classDelegate.create.mockResolvedValueOnce({ id: 'c2', homeroomTeacher: null });
    await service.create('s1', {
      name: 'B',
      year: 2025,
      homeroomTeacherId: 'u1',
    });
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// ClassGroupsService — class and subject queries need deletedAt: null
// ---------------------------------------------------------------------------

describe('ClassGroupsService — soft-delete filtering on class and subject', () => {
  let service: ClassGroupsService;
  let classGroupDelegate: ReturnType<typeof mockDelegate>;
  let classDelegate: ReturnType<typeof mockDelegate>;
  let subjectDelegate: ReturnType<typeof mockDelegate>;
  let studentDelegate: ReturnType<typeof mockDelegate>;
  let studentClassGroupDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    classDelegate = mockDelegate({ id: 'c1', schoolId: 's1', deletedAt: null });
    subjectDelegate = mockDelegate({ id: 'sub1', schoolId: 's1', deletedAt: null });
    classGroupDelegate = mockDelegate({
      id: 'cg1', schoolId: 's1', classId: 'c1', name: 'Group A',
      subject: null,
    });
    studentDelegate = mockDelegate(null);
    studentClassGroupDelegate = mockDelegate({ count: 0 });
    const prisma = {
      class: classDelegate,
      subject: subjectDelegate,
      classGroup: classGroupDelegate,
      student: studentDelegate,
      studentClassGroup: studentClassGroupDelegate,
    };
    service = new ClassGroupsService(prisma as never);
  });

  it('assertClass uses deletedAt: null for class lookup', async () => {
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1' });
    classGroupDelegate.findMany.mockResolvedValueOnce([]);
    await service.list('s1', 'c1');
    expect(capturedWhere(classDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('assertSubjectInSchool uses deletedAt: null for subject lookup', async () => {
    classDelegate.findFirst.mockResolvedValueOnce({ id: 'c1' });
    subjectDelegate.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.create('s1', 'c1', { name: 'G', subjectId: 'sub1', sortOrder: 0 })
    ).rejects.toThrow();
    expect(capturedWhere(subjectDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// TeacherAssignmentsService
// ---------------------------------------------------------------------------

describe('TeacherAssignmentsService — soft-delete filtering', () => {
  let service: TeacherAssignmentsService;
  let userDelegate: ReturnType<typeof mockDelegate>;
  let subjectDelegate: ReturnType<typeof mockDelegate>;
  let classDelegate: ReturnType<typeof mockDelegate>;
  let teacherAssignmentDelegate: ReturnType<typeof mockDelegate>;
  let classGroupDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    userDelegate = mockDelegate({
      id: 'u1',
      schoolId: 's1',
      role: Role.SubjectTeacher,
      deletedAt: null,
      subjects: [{ subjectId: 'sub1' }],
    });
    subjectDelegate = mockDelegate([{ id: 'sub1', schoolId: 's1', deletedAt: null }]);
    classDelegate = mockDelegate({ id: 'c1', schoolId: 's1', deletedAt: null });
    teacherAssignmentDelegate = mockDelegate(null);
    classGroupDelegate = mockDelegate(null);
    const prisma = {
      user: userDelegate,
      subject: subjectDelegate,
      class: classDelegate,
      teacherAssignment: teacherAssignmentDelegate,
      classGroup: classGroupDelegate,
    };
    service = new TeacherAssignmentsService(prisma as never);
  });

  it('create() user lookup uses deletedAt: null', async () => {
    teacherAssignmentDelegate.create.mockResolvedValueOnce({
      id: 'ta1', user: {}, subject: {}, class: {}, classGroup: null,
    });
    await service.create('s1', { userId: 'u1', classId: 'c1', subjectIds: ['sub1'] });
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });

  it('create() subject lookup uses deletedAt: null', async () => {
    teacherAssignmentDelegate.create.mockResolvedValueOnce({
      id: 'ta1', user: {}, subject: {}, class: {}, classGroup: null,
    });
    await service.create('s1', { userId: 'u1', classId: 'c1', subjectIds: ['sub1'] });
    const subjectWhere = subjectDelegate.findMany.mock.calls[0][0].where;
    expect(subjectWhere).toMatchObject({ deletedAt: null });
  });

  it('create() class lookup uses deletedAt: null', async () => {
    teacherAssignmentDelegate.create.mockResolvedValueOnce({
      id: 'ta1', user: {}, subject: {}, class: {}, classGroup: null,
    });
    await service.create('s1', { userId: 'u1', classId: 'c1', subjectIds: ['sub1'] });
    const classWhere = classDelegate.findFirst.mock.calls[0][0].where;
    expect(classWhere).toMatchObject({ deletedAt: null });
  });

  it('update() class lookup uses deletedAt: null', async () => {
    teacherAssignmentDelegate.findFirst.mockResolvedValueOnce({
      id: 'ta1', schoolId: 's1', classId: 'c1', classGroupId: null,
      userId: 'u1', subjectId: 'sub1',
    });
    teacherAssignmentDelegate.update.mockResolvedValueOnce({
      id: 'ta1', user: {}, subject: {}, class: {}, classGroup: null,
    });
    // second findFirst for duplicate check
    teacherAssignmentDelegate.findFirst.mockResolvedValueOnce(null);
    await service.update('s1', 'ta1', { classId: 'c1' });
    const classWhere = classDelegate.findFirst.mock.calls[0][0].where;
    expect(classWhere).toMatchObject({ deletedAt: null });
  });
});

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

describe('AuthService — soft-delete filtering', () => {
  let service: AuthService;
  let userDelegate: ReturnType<typeof mockDelegate>;

  beforeEach(() => {
    const mockUser = {
      id: 'u1',
      name: 'Test',
      email: 'test@x.com',
      role: Role.Admin,
      schoolId: 's1',
      deletedAt: null,
      school: { id: 's1', name: 'My School' },
    };
    userDelegate = mockDelegate(mockUser);
    const prisma = { user: userDelegate };
    const jwtService = {} as never;
    service = new AuthService(prisma as never, jwtService);
  });

  it('me() uses deletedAt: null', async () => {
    await service.me('u1', 's1');
    expect(capturedWhere(userDelegate.findFirst)).toMatchObject({ deletedAt: null });
  });
});
