'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@school/shared';
import { ClipboardList } from 'lucide-react';
import { TeacherShell } from '@/components/TeacherShell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { he } from '@/lib/he';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

type ClassRow = { id: string; name: string; year: number };
type TermRow = { id: string; name: string };
type MyAssignment = {
  id: string;
  subjectId: string;
  classId: string;
  classGroupId: string | null;
  subject: { id: string; name: string };
  class: { id: string; name: string; year: number };
  classGroup: { id: string; name: string } | null;
};

function assignmentLabel(a: MyAssignment): string {
  if (a.classGroup?.name) {
    return `${a.subject.name}-${a.classGroup.name}`;
  }
  return a.subject.name;
}

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const isSubjectTeacher = user?.role === Role.SubjectTeacher;

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
    enabled: !isSubjectTeacher,
  });

  const { data: myAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-teacher-assignments'],
    queryFn: () => apiFetch<MyAssignment[]>('/my/teacher-assignments'),
    enabled: isSubjectTeacher,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['grading-terms'],
    queryFn: () => apiFetch<TermRow[]>('/grading-terms'),
  });

  const defaultTermId = terms[0]?.id ?? '';
  const isLoading = isSubjectTeacher ? assignmentsLoading : classesLoading;

  if (
    user &&
    user.role !== Role.HomeroomTeacher &&
    user.role !== Role.SubjectTeacher
  ) {
    return (
      <TeacherShell>
        <Alert variant="info">{he.teacherOnly}</Alert>
      </TeacherShell>
    );
  }

  const emptyMessage =
    user?.role === Role.HomeroomTeacher
      ? he.noClassesHomeroomHint
      : he.noClassesSubjectTeacherHint;

  return (
    <TeacherShell>
      <PageHeader
        title={he.teacherClassesTitle}
        description={isSubjectTeacher ? he.teacherGradebookHint : undefined}
      />
      {isLoading && <Skeleton className="h-24 w-full mb-4" />}
      {terms.length === 0 && (
        <Alert variant="info" className="mb-4">
          {he.noTermsHint}
        </Alert>
      )}
      {isSubjectTeacher ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {myAssignments.map((a) => (
            <li key={a.id}>
              <Card className="cursor-pointer transition-shadow duration-200 hover:shadow-elevation3">
                <Link
                  href={
                    defaultTermId
                      ? `/teacher/gradebook?classId=${a.classId}&termId=${defaultTermId}&subjectId=${a.subjectId}&assignmentId=${a.id}`
                      : '#'
                  }
                  className="block font-semibold text-text no-underline hover:text-primary hover:no-underline"
                >
                  {assignmentLabel(a)} — {a.class.name} ({a.class.year}) → {he.openGradebook}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {classes.map((c) => (
            <li key={c.id}>
              <Card className="cursor-pointer transition-shadow duration-200 hover:shadow-elevation3">
                <Link
                  href={
                    defaultTermId
                      ? `/teacher/gradebook?classId=${c.id}&termId=${defaultTermId}`
                      : '#'
                  }
                  className="block font-semibold text-text no-underline hover:text-primary hover:no-underline"
                >
                  {c.name} ({c.year}) → {he.openGradebook}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {!isLoading &&
        (isSubjectTeacher ? myAssignments.length === 0 : classes.length === 0) && (
          <EmptyState icon={ClipboardList} message={emptyMessage} />
        )}
    </TeacherShell>
  );
}
