'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Role } from '@school/shared';
import type { CertificateSupplementContextDto, GradebookMatrixDto, GradingTermDto } from '@school/shared';
import { TeacherShell } from '@/components/TeacherShell';
import { GradebookGrid } from '@/components/GradebookGrid';
import { TeacherCertificatesTab } from '@/components/TeacherCertificatesTab';
import { hasCertificateColumns } from '@/lib/gradebook-columns.util';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';

type ClassRow = { id: string; name: string; year: number; yearHebrew?: string | null; certificateProfileId?: string | null };
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
  return a.classGroup?.name ? `${a.subject.name}-${a.classGroup.name}` : a.subject.name;
}

export default function TeacherGradebookPageWrapper() {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full m-8" />}>
      <TeacherGradebookPage />
    </Suspense>
  );
}

function TeacherGradebookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get('classId') ?? '';
  const termId = params.get('termId') ?? '';
  const subjectId = params.get('subjectId') ?? '';
  const assignmentId = params.get('assignmentId') ?? '';
  const activeTab = params.get('tab') === 'certificates' ? 'certificates' : 'gradebook';

  const isSubjectTeacher = user?.role === Role.SubjectTeacher;
  const isHomeroom = user?.role === Role.HomeroomTeacher;

  const { data: terms = [] } = useQuery({
    queryKey: ['grading-terms'],
    queryFn: () => apiFetch<GradingTermDto[]>('/grading-terms'),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
    enabled: !isSubjectTeacher,
  });

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['my-teacher-assignments'],
    queryFn: () => apiFetch<MyAssignment[]>('/my/teacher-assignments'),
    enabled: isSubjectTeacher,
  });

  const classAssignments = useMemo(
    () => myAssignments.filter((a) => a.classId === classId),
    [myAssignments, classId],
  );

  const effectiveAssignment = useMemo(() => {
    if (!isSubjectTeacher) return undefined;
    if (assignmentId) return classAssignments.find((a) => a.id === assignmentId);
    if (classAssignments.length === 1) return classAssignments[0];
    if (subjectId) {
      const matches = classAssignments.filter((a) => a.subjectId === subjectId);
      if (matches.length === 1) return matches[0];
    }
    return undefined;
  }, [isSubjectTeacher, assignmentId, subjectId, classAssignments]);

  const effectiveSubjectId = effectiveAssignment?.subjectId ?? '';
  const effectiveAssignmentId = effectiveAssignment?.id ?? '';
  const needSubjectPick = isSubjectTeacher && classAssignments.length > 1 && !effectiveAssignment;

  const selectedTerm = terms.find((t) => t.id === termId);
  const selectedClass = classes.find((c) => c.id === classId);
  const termLocked = Boolean(selectedTerm?.isLocked);

  const { data: matrix, refetch, isLoading, error } = useQuery({
    queryKey: ['gradebook', classId, termId, effectiveSubjectId, effectiveAssignmentId],
    queryFn: () => {
      const q = new URLSearchParams({ classId, termId });
      if (effectiveSubjectId) q.set('subjectId', effectiveSubjectId);
      if (effectiveAssignmentId) q.set('assignmentId', effectiveAssignmentId);
      return apiFetch<GradebookMatrixDto>(`/gradebook?${q.toString()}`);
    },
    enabled: Boolean(classId && termId && !needSubjectPick && activeTab === 'gradebook'),
  });

  const { data: certContext, refetch: refetchCertContext } = useQuery({
    queryKey: ['certificate-supplement-context', classId, termId],
    queryFn: () =>
      apiFetch<CertificateSupplementContextDto>(
        `/certificates/supplement-context?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId && !needSubjectPick && isHomeroom),
  });

  if (user && !isHomeroom && !isSubjectTeacher) {
    return (
      <TeacherShell>
        <Alert variant="info">{he.teacherOnly}</Alert>
      </TeacherShell>
    );
  }

  const pushParams = (next: {
    classId?: string;
    termId?: string;
    subjectId?: string;
    assignmentId?: string;
    tab?: string;
  }) => {
    const q = new URLSearchParams();
    const cid = next.classId ?? classId;
    const tid = next.termId ?? termId;
    const sid = 'subjectId' in next ? (next.subjectId ?? '') : subjectId;
    const aid = 'assignmentId' in next ? (next.assignmentId ?? '') : assignmentId;
    const tab = next.tab ?? activeTab;
    if (cid) q.set('classId', cid);
    if (tid) q.set('termId', tid);
    if (sid) q.set('subjectId', sid);
    if (aid) q.set('assignmentId', aid);
    if (tab !== 'gradebook') q.set('tab', tab);
    router.push(`/teacher/gradebook?${q.toString()}`);
  };

  const tabBase =
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 focus:outline-none';

  return (
    <TeacherShell>
      <PageHeader
        title={isHomeroom ? he.homeroomPortal : he.navGradebook}
        description={isHomeroom ? undefined : he.teacherGradebookHint}
      />

      <nav className="mb-4 flex items-center gap-1 text-sm text-text-muted">
        <Link href="/teacher" className="hover:text-primary">
          {he.backToClasses}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <span className="text-text">
          {activeTab === 'certificates' ? he.navTeacherCertificates : he.navGradebook}
        </span>
      </nav>

      {/* Class / Term selectors — shared across tabs */}
      <Card className="mb-4 max-w-lg space-y-4">
        {!isSubjectTeacher && (
          <div>
            <Label>{he.selectClass}</Label>
            <Select
              value={classId}
              onChange={(e) => pushParams({ classId: e.target.value, subjectId: '', assignmentId: '' })}
            >
              <option value="">{he.selectPlaceholder}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        )}

        {isSubjectTeacher && classId && (
          <p className="text-sm text-text-muted">
            <strong>{he.selectClass}:</strong>{' '}
            {myAssignments.find((a) => a.classId === classId)?.class.name ?? '—'}
            {effectiveAssignment && (
              <> · <strong>{he.gradebookFocusSubject}:</strong> {assignmentLabel(effectiveAssignment)}</>
            )}
          </p>
        )}

        <div>
          <Label>{he.selectTerm}</Label>
          <Select value={termId} onChange={(e) => pushParams({ termId: e.target.value })}>
            <option value="">{he.selectPlaceholder}</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isLocked ? ` (${he.lockedLabel})` : ''}
              </option>
            ))}
          </Select>
        </div>

        {isSubjectTeacher && classId && classAssignments.length > 1 && (
          <div>
            <Label>{he.selectSubjectForGradebook}</Label>
            <Select
              value={assignmentId}
              onChange={(e) => {
                const picked = classAssignments.find((a) => a.id === e.target.value);
                pushParams({ assignmentId: e.target.value, subjectId: picked?.subjectId ?? '' });
              }}
            >
              <option value="">{he.selectPlaceholder}</option>
              {classAssignments.map((a) => (
                <option key={a.id} value={a.id}>{assignmentLabel(a)}</option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {/* Tab switcher — homeroom only (subject teacher has no certificates) */}
      {isHomeroom && (
        <div
          dir="rtl"
          className="mb-4 flex max-w-lg gap-1 rounded-md border border-border bg-surface-raised p-1"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'gradebook'}
            type="button"
            onClick={() => pushParams({ tab: 'gradebook' })}
            className={cn(
              tabBase,
              activeTab === 'gradebook'
                ? 'bg-surface text-primary font-semibold shadow-elevation1'
                : 'text-text-muted hover:text-text',
            )}
          >
            {he.teacherTabGradebook}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'certificates'}
            type="button"
            onClick={() => pushParams({ tab: 'certificates' })}
            className={cn(
              tabBase,
              activeTab === 'certificates'
                ? 'bg-surface text-primary font-semibold shadow-elevation1'
                : 'text-text-muted hover:text-text',
            )}
          >
            {he.teacherTabCertificates}
          </button>
        </div>
      )}

      {/* ─── Gradebook tab ─── */}
      {activeTab === 'gradebook' && (
        <>
          {needSubjectPick && (
            <Alert variant="warning" className="mb-4">{he.pickSubjectForGradebook}</Alert>
          )}

          {classId && termId && !needSubjectPick && isLoading && (
            <Skeleton className="h-48 w-full" />
          )}

          {error && (
            <Alert variant="error" className="mb-4">
              <p>{translateApiError((error as Error).message)}</p>
              <p className="mt-1 text-xs">{he.gradebookAmbiguousHint}</p>
            </Alert>
          )}

          {matrix && user && (
            <>
              {certContext && isHomeroom && (
                <p className="mb-3 text-sm text-text-muted">
                  {he.gradebookActiveCertProfile(
                    certContext.certificateProfileName ?? he.classCertProfileDefault,
                  )}
                  {!hasCertificateColumns(certContext.certificatePrefs) && (
                    <> · {he.gradebookNoComputerCertCols}</>
                  )}
                </p>
              )}
              <GradebookGrid
                classId={classId}
                termId={termId}
                matrix={matrix}
                userId={user.id}
                getLockClassGroupId={(sid) =>
                  effectiveAssignment?.subjectId === sid
                    ? (effectiveAssignment.classGroupId ?? null)
                    : null
                }
                onSaved={() => void refetch()}
                certSupplementContext={isHomeroom ? (certContext ?? null) : null}
                canEditCertSupplements={isHomeroom}
                onCertSupplementsSaved={() => void refetchCertContext()}
              />
            </>
          )}
        </>
      )}

      {/* ─── Certificates tab ─── */}
      {activeTab === 'certificates' && isHomeroom && (
        <TeacherCertificatesTab
          classId={classId}
          termId={termId}
          termLocked={termLocked}
          classInfo={selectedClass ?? null}
        />
      )}
    </TeacherShell>
  );
}
