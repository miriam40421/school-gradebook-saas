import { assertValidGroupMemberships } from '../../src/students/student-groups.util';

describe('assertValidGroupMemberships', () => {
  const groups = [
    { id: 'g1', classId: 'c1', subjectId: 'sub-math' },
    { id: 'g2', classId: 'c1', subjectId: 'sub-math' },
    { id: 'g3', classId: 'c1', subjectId: 'sub-en' },
  ];

  it('allows one group per subject', () => {
    expect(() =>
      assertValidGroupMemberships('c1', groups, ['g1', 'g3']),
    ).not.toThrow();
  });

  it('rejects two groups for same subject', () => {
    expect(() =>
      assertValidGroupMemberships('c1', groups, ['g1', 'g2']),
    ).toThrow('Only one group per subject per student');
  });
});
