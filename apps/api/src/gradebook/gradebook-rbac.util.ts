import { Role } from '@school/shared';

export type TeacherAssignmentScope = {
  id?: string;
  subjectId: string;
  classId: string;
  classGroupId: string | null;
};

export type ClassAccessContext = {
  id: string;
  homeroomTeacherId: string | null;
};

export function canAccessClassForGradebook(
  role: Role,
  userId: string,
  classRow: ClassAccessContext,
  assignmentClassIds: string[],
): boolean {
  if (role === Role.Admin) return true;
  if (role === Role.HomeroomTeacher) {
    return classRow.homeroomTeacherId === userId;
  }
  if (role === Role.SubjectTeacher) {
    return assignmentClassIds.includes(classRow.id);
  }
  return false;
}

/** Subjects shown as columns in the gradebook matrix. */
export function getVisibleSubjectIds(
  role: Role,
  userId: string,
  classRow: ClassAccessContext,
  subjectIds: string[],
  assignments: TeacherAssignmentScope[],
): string[] {
  if (role === Role.Admin) return [...subjectIds];
  if (role === Role.HomeroomTeacher && classRow.homeroomTeacherId === userId) {
    return [...subjectIds];
  }
  if (role === Role.SubjectTeacher) {
    const assigned = new Set(
      assignments
        .filter((a) => a.classId === classRow.id)
        .map((a) => a.subjectId),
    );
    return subjectIds.filter((id) => assigned.has(id));
  }
  return [];
}

export function getEditableSubjectIds(
  role: Role,
  userId: string,
  classRow: ClassAccessContext,
  subjectIds: string[],
  assignments: TeacherAssignmentScope[],
): string[] {
  // Admin: view only. Homeroom: all subjects in her class. Subject teacher: assigned only.
  if (role === Role.Admin) return [];
  if (role === Role.HomeroomTeacher && classRow.homeroomTeacherId === userId) {
    return [...subjectIds];
  }
  if (role === Role.SubjectTeacher) {
    const assigned = new Set(
      assignments
        .filter((a) => a.classId === classRow.id)
        .map((a) => a.subjectId),
    );
    return subjectIds.filter((id) => assigned.has(id));
  }
  return [];
}

export function canEditSubjectColumn(
  role: Role,
  userId: string,
  classRow: ClassAccessContext,
  subjectId: string,
  assignments: TeacherAssignmentScope[],
): boolean {
  return getEditableSubjectIds(
    role,
    userId,
    classRow,
    [subjectId],
    assignments,
  ).includes(subjectId);
}

export function canEditStudentSubject(
  role: Role,
  userId: string,
  classRow: ClassAccessContext,
  subjectId: string,
  studentClassGroupIds: string[],
  assignments: TeacherAssignmentScope[],
): boolean {
  if (!canEditSubjectColumn(role, userId, classRow, subjectId, assignments)) {
    return false;
  }
  if (role !== Role.SubjectTeacher) return true;
  const scoped = assignments.filter(
    (a) =>
      a.classId === classRow.id &&
      a.subjectId === subjectId &&
      a.classGroupId != null,
  );
  if (scoped.length === 0) return true;
  return scoped.some((a) => studentClassGroupIds.includes(a.classGroupId!));
}

export type StudentGroupMembership = {
  id: string;
  classGroupId: string | null;
  groupMemberships: { classGroupId: string }[];
};

export function studentInClassGroup(
  student: StudentGroupMembership,
  classGroupId: string,
): boolean {
  const ids = [
    ...student.groupMemberships.map((m) => m.classGroupId),
    ...(student.classGroupId ? [student.classGroupId] : []),
  ];
  return ids.includes(classGroupId);
}

/** For one subject assignment: whole class if no group, else only that group. */
export function filterStudentsForSubjectAssignment<T extends StudentGroupMembership>(
  assignment: TeacherAssignmentScope | undefined,
  students: T[],
): T[] {
  if (!assignment?.classGroupId) {
    return students;
  }
  return students.filter((s) => studentInClassGroup(s, assignment.classGroupId!));
}

export function pickFocusAssignment(
  classAssignments: TeacherAssignmentScope[],
  subjectId?: string,
  assignmentId?: string,
): TeacherAssignmentScope | undefined {
  if (classAssignments.length === 0) {
    return undefined;
  }
  if (assignmentId) {
    const byId = classAssignments.find((a) => a.id === assignmentId);
    if (byId) return byId;
  }
  if (subjectId) {
    const matches = classAssignments.filter((a) => a.subjectId === subjectId);
    if (matches.length === 1) return matches[0];
    return undefined;
  }
  if (classAssignments.length === 1) {
    return classAssignments[0];
  }
  return undefined;
}
