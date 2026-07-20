'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role } from '@school/shared';
import type {
  CertificatePrefs,
  CertificateSnapshotSummaryDto,
  CertificateSupplementDto,
  CertificateSupplementSubjectDto,
  GenerateCertificatesResultDto,
  GradingTermDto,
} from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { CertificatePdfPreview } from '@/components/CertificatePdfPreview';
import { CertificateUnifiedTable } from '@/components/CertificateUnifiedTable';
import { NikudPreviewModal } from '@/components/NikudPreviewModal';
import { TeacherShell } from '@/components/TeacherShell';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type ClassRow = { id: string; name: string; year: number; yearHebrew?: string | null; certificateProfileId?: string | null };

function CertificatesContent({
  canGenerate,
  readOnlyHint,
}: {
  canGenerate: boolean;
  readOnlyHint?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const classId = params.get('classId') ?? '';
  const termId = params.get('termId') ?? '';

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['grading-terms'],
    queryFn: () => apiFetch<GradingTermDto[]>('/grading-terms'),
  });

  const selectedTerm = terms.find((t) => t.id === termId);
  const selectedClass = classes.find((c) => c.id === classId);
  const termLocked = Boolean(selectedTerm?.isLocked);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['certificates', classId, termId],
    queryFn: () =>
      apiFetch<CertificateSnapshotSummaryDto[]>(
        `/certificates/snapshots?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  const [preview, setPreview] = useState<{ id: string; studentName: string } | null>(null);
  const [nikudModal, setNikudModal] = useState<{
    snapshotId: string;
    studentName: string;
    studentId: string;
    supplement: CertificateSupplementDto;
    prefs: CertificatePrefs;
    subjects: CertificateSupplementSubjectDto[];
    classInfo: { name: string; yearHebrew: string | null };
    termName: string;
    gradeValues: Record<string, string>;
    customTextBlocks: Array<{ id: string; text: string }>;
    classNikudOverrides: Record<string, string>;
    gradeNikudMap: Record<string, string>;
  } | null>(null);
  const [generatingStudentId, setGeneratingStudentId] = useState<string | null>(null);

  const generateAll = useMutation({
    mutationFn: () =>
      apiFetch<GenerateCertificatesResultDto>('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ classId, termId }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['certificates', classId, termId] });
      const ok = data.results.filter((r) => r.ok).length;
      toast(`${ok}/${data.results.length} ${he.certificatesLatest}`, ok === data.results.length ? 'success' : 'info');
    },
  });

  const generateOne = useMutation({
    mutationFn: (studentId: string) =>
      apiFetch<GenerateCertificatesResultDto>('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ classId, termId, studentIds: [studentId] }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['certificates', classId, termId] });
      setGeneratingStudentId(null);
    },
    onError: () => setGeneratingStudentId(null),
  });

  const pushParams = (next: { classId?: string; termId?: string }) => {
    const q = new URLSearchParams();
    const cid = next.classId ?? classId;
    const tid = next.termId ?? termId;
    if (cid) q.set('classId', cid);
    if (tid) q.set('termId', tid);
    router.push(`?${q.toString()}`);
  };

  return (
    <>
      <PageHeader title={he.certificatesTitle} description={he.certificatesHint} />
      <p className="mb-3 text-sm text-text-muted">
        <Link href="/school" className="text-primary">{he.certificatesStructureLink}</Link>
        {' · '}
        <Link href="/gradebook" className="text-primary">{he.certificatesLockTermHint}</Link>
        {' · '}
        <Link href="/classes" className="text-primary">{he.certificatesCohortLink}</Link>
      </p>
      {!canGenerate && readOnlyHint && (
        <Alert variant="info" className="mb-4">{readOnlyHint}</Alert>
      )}
      {canGenerate && classId && selectedClass && !selectedClass.certificateProfileId && (
        <Alert variant="info" className="mb-4">
          {he.certClassNoProfile}{' '}
          <Link href="/classes" className="font-medium text-primary underline">
            {he.certClassNoProfileLink}
          </Link>
        </Alert>
      )}
      <Card className="mb-4">
        <div>
          <Label>{he.selectClass}</Label>
          <Select value={classId} onChange={(e) => pushParams({ classId: e.target.value })}>
            <option value="">{he.selectPlaceholder}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.yearHebrew ? ` · ${he.cohortLabel}: ${c.yearHebrew}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4">
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
        {selectedClass?.yearHebrew && (
          <p className="mt-2 text-sm text-text-muted">
            {he.certificatesCohortValue(selectedClass.yearHebrew)}
          </p>
        )}
        {canGenerate && classId && termId && !termLocked && (
          <Alert variant="info" className="mt-4">
            {he.certTermNotLockedEarly}
          </Alert>
        )}
        {canGenerate && classId && termId && (
          <div className="mt-4">
            <Button
              type="button"
              variant="cta"
              loading={generateAll.isPending}
              disabled={!termLocked || generateAll.isPending}
              onClick={() => generateAll.mutate()}
            >
              {he.certificatesGenerate}
            </Button>
            {generateAll.error && (
              <Alert variant="error" className="mt-2">
                {translateApiError((generateAll.error as Error).message)}
              </Alert>
            )}
            {generateAll.data?.results.some((r) => !r.ok) && (
              <Alert variant="error" className="mt-2">
                <p className="font-medium">{he.certificatesGenerateErrors}</p>
                <ul className="mt-1 list-disc ps-4 text-xs">
                  {generateAll.data.results
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <li key={r.studentId}>{translateApiError(r.error ?? 'Failed')}</li>
                    ))}
                </ul>
              </Alert>
            )}
          </div>
        )}
      </Card>

      {classId && termId && isLoading && <Skeleton className="h-40 w-full" />}

      {classId && termId && !isLoading && (
        <CertificateUnifiedTable
          classId={classId}
          termId={termId}
          canEdit={canGenerate}
          termLocked={termLocked}
          snapshots={snapshots}
          generatingStudentId={generatingStudentId}
          generatePending={generateOne.isPending}
          onGenerateOne={(studentId) => {
            setGeneratingStudentId(studentId);
            generateOne.mutate(studentId);
          }}
          onPreview={(id, studentName) => setPreview({ id, studentName })}
          onNikudEdit={(snapshotId, studentName, studentId, supplement, prefs, subjects, classInfo, termName, gradeValues, customTextBlocks, classNikudOverrides, gradeNikudMap) =>
            setNikudModal({ snapshotId, studentName, studentId, supplement, prefs, subjects, classInfo, termName, gradeValues, customTextBlocks, classNikudOverrides, gradeNikudMap })
          }
        />
      )}

      {preview && (
        <CertificatePdfPreview
          snapshotId={preview.id}
          studentName={preview.studentName}
          onClose={() => setPreview(null)}
        />
      )}

      {nikudModal && (
        <NikudPreviewModal
          snapshotId={nikudModal.snapshotId}
          studentName={nikudModal.studentName}
          supplement={nikudModal.supplement}
          classNikudOverrides={nikudModal.classNikudOverrides}
          gradeNikudMap={nikudModal.gradeNikudMap}
          prefs={nikudModal.prefs}
          subjects={nikudModal.subjects}
          gradeValues={nikudModal.gradeValues}
          customTextBlocks={nikudModal.customTextBlocks}
          classInfo={nikudModal.classInfo}
          termName={nikudModal.termName}
          classId={classId}
          termId={termId}
          onClose={() => setNikudModal(null)}
          onAfterSave={() => {
            void qc.invalidateQueries({ queryKey: ['certificate-supplement-context', classId, termId] });
          }}
        />
      )}
    </>
  );
}

export function CertificatesPage({
  canGenerate,
  readOnlyHint,
}: {
  canGenerate: boolean;
  readOnlyHint?: string;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full m-8" />}>
      <CertificatesContent canGenerate={canGenerate} readOnlyHint={readOnlyHint} />
    </Suspense>
  );
}

export function AdminCertificatesPage() {
  const { user } = useAuth();
  if (user?.role !== Role.Admin) {
    return (
      <AppShell>
        <p>{he.adminOnly}</p>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <CertificatesPage
        canGenerate={false}
        readOnlyHint={he.certificatesAdminReadOnly}
      />
    </AppShell>
  );
}

export function TeacherCertificatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === Role.SubjectTeacher) {
      router.replace('/teacher');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <TeacherShell>
        <p>{he.loading}</p>
      </TeacherShell>
    );
  }

  if (!user || user.role === Role.SubjectTeacher) {
    return (
      <TeacherShell>
        <p>{he.loading}</p>
      </TeacherShell>
    );
  }

  if (user.role !== Role.HomeroomTeacher) {
    return (
      <AppShell>
        <p>{he.teacherOnly}</p>
      </AppShell>
    );
  }

  return (
    <TeacherShell>
      <CertificatesPage canGenerate />
    </TeacherShell>
  );
}
