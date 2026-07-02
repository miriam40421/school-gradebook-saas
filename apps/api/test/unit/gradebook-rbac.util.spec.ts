import { Role } from '@school/shared';
import {
  canAccessClassForGradebook,
  canEditStudentSubject,
  filterStudentsForSubjectAssignment,
  getEditableSubjectIds,
  getVisibleSubjectIds,
  pickFocusAssignment,
} from '../../src/gradebook/gradebook-rbac.util';

const classRow = { id: 'class-1', homeroomTeacherId: 'homeroom-1' };
const subjects = ['sub-1', 'sub-2'];
const assignments = [
  { subjectId: 'sub-1', classId: 'class-1', classGroupId: null },
  { subjectId: 'sub-2', classId: 'class-1', classGroupId: 'group-a' },
];

describe('gradebook RBAC', () => {
  it('admin can access any class but cannot edit grades', () => {
    expect(
      canAccessClassForGradebook(Role.Admin, 'a', classRow, []),
    ).toBe(true);
    expect(
      getEditableSubjectIds(Role.Admin, 'a', classRow, subjects, []),
    ).toEqual([]);
  });

  it('homeroom teacher can edit all subjects in own class', () => {
    expect(
      canAccessClassForGradebook(
        Role.HomeroomTeacher,
        'homeroom-1',
        classRow,
        [],
      ),
    ).toBe(true);
    expect(
      canAccessClassForGradebook(
        Role.HomeroomTeacher,
        'other',
        classRow,
        [],
      ),
    ).toBe(false);
    expect(
      getEditableSubjectIds(
        Role.HomeroomTeacher,
        'homeroom-1',
        classRow,
        subjects,
        [],
      ),
    ).toEqual(subjects);
  });

  it('subject teacher only sees assigned subject columns', () => {
    expect(
      getVisibleSubjectIds(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        subjects,
        assignments,
      ),
    ).toEqual(['sub-1', 'sub-2']);
    expect(
      getVisibleSubjectIds(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        subjects,
        [{ subjectId: 'sub-1', classId: 'class-1', classGroupId: null }],
      ),
    ).toEqual(['sub-1']);
  });

  it('subject teacher only assigned columns', () => {
    expect(
      canAccessClassForGradebook(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        ['class-1'],
      ),
    ).toBe(true);
    expect(
      getEditableSubjectIds(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        subjects,
        assignments,
      ),
    ).toEqual(['sub-1', 'sub-2']);
  });

  it('whole-class assignment shows all students', () => {
    const students = [
      { id: 's1', classGroupId: null, groupMemberships: [] },
      { id: 's2', classGroupId: null, groupMemberships: [{ classGroupId: 'group-a' }] },
    ];
    const filtered = filterStudentsForSubjectAssignment(
      { subjectId: 'sub-1', classId: 'class-1', classGroupId: null },
      students,
    );
    expect(filtered.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('group assignment shows only students in that group', () => {
    const students = [
      {
        id: 's1',
        classGroupId: null,
        groupMemberships: [{ classGroupId: 'group-a' }],
      },
      {
        id: 's2',
        classGroupId: null,
        groupMemberships: [{ classGroupId: 'group-b' }],
      },
    ];
    const filtered = filterStudentsForSubjectAssignment(
      { subjectId: 'sub-2', classId: 'class-1', classGroupId: 'group-a' },
      students,
    );
    expect(filtered.map((s) => s.id)).toEqual(['s1']);
  });

  it('pickFocusAssignment requires subjectId when multiple', () => {
    const multi = [
      { subjectId: 'sub-1', classId: 'class-1', classGroupId: null },
      { subjectId: 'sub-2', classId: 'class-1', classGroupId: 'group-a' },
    ];
    expect(pickFocusAssignment(multi, 'sub-1')?.subjectId).toBe('sub-1');
    expect(pickFocusAssignment(multi)).toBeUndefined();
    expect(pickFocusAssignment([multi[0]!])?.subjectId).toBe('sub-1');
  });

  it('subject teacher group scope on student', () => {
    expect(
      canEditStudentSubject(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        'sub-2',
        ['group-a'],
        assignments,
      ),
    ).toBe(true);
    expect(
      canEditStudentSubject(
        Role.SubjectTeacher,
        'sub-t',
        classRow,
        'sub-2',
        ['group-b'],
        assignments,
      ),
    ).toBe(false);
  });
});
