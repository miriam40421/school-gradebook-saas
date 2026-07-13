'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CertificatePrefs,
  CertificateSnapshotSummaryDto,
  CertificateSupplementDto,
  CertificateSupplementSubjectDto,
  GenerateCertificatesResultDto,
  GradingTermDto,
} from '@school/shared';
import { CertificatePdfPreview } from '@/components/CertificatePdfPreview';
import { CertificateUnifiedTable } from '@/components/CertificateUnifiedTable';
import { NikudPreviewModal } from '@/components/NikudPreviewModal';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = {
  classId: string;
  termId: string;
  classInfo: { name: string; yearHebrew?: string | null; certificateProfileId?: string | null } | null;
  termLocked: boolean;
};

type NikudModalState = {
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
};

export function TeacherCertificatesTab({ classId, termId, classInfo, termLocked }: Props) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{ id: string; studentName: string } | null>(null);
  const [nikudModal, setNikudModal] = useState<NikudModalState | null>(null);
  const [generatingStudentId, setGeneratingStudentId] = useState<string | null>(null);

  const { data: terms = [] } = useQuery({
    queryKey: ['grading-terms'],
    queryFn: () => apiFetch<GradingTermDto[]>('/grading-terms'),
  });

  const termName = terms.find((t) => t.id === termId)?.name ?? '';

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['certificates', classId, termId],
    queryFn: () =>
      apiFetch<CertificateSnapshotSummaryDto[]>(
        `/certificates/snapshots?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  const generateAll = useMutation({
    mutationFn: () =>
      apiFetch<GenerateCertificatesResultDto>('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ classId, termId }),
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['certificates', classId, termId] });
      const ok = data.results.filter((r) => r.ok).length;
      const label = `${ok}/${data.results.length} ${he.certificatesLatest}`;
      // simple console feedback — Toast not imported to keep component lean
      console.info(label);
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

  if (!classId || !termId) {
    return (
      <Alert variant="info" className="mt-4">{he.selectClassAndTermFirst}</Alert>
    );
  }

  return (
    <>
      {classInfo && !classInfo.certificateProfileId && (
        <Alert variant="info" className="mb-4">
          {he.certClassNoProfile}{' '}
          <Link href="/classes" className="font-medium text-primary underline">
            {he.certClassNoProfileLink}
          </Link>
        </Alert>
      )}

      {!termLocked && (
        <Alert variant="info" className="mb-4">{he.certTermNotLockedEarly}</Alert>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Button
          type="button"
          variant="cta"
          loading={generateAll.isPending}
          disabled={!termLocked || generateAll.isPending}
          onClick={() => generateAll.mutate()}
        >
          {he.certificatesGenerate}
        </Button>
      </div>

      {generateAll.error && (
        <Alert variant="error" className="mb-4">
          {translateApiError((generateAll.error as Error).message)}
        </Alert>
      )}
      {generateAll.data?.results.some((r) => !r.ok) && (
        <Alert variant="error" className="mb-4">
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

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <CertificateUnifiedTable
          classId={classId}
          termId={termId}
          canEdit
          termLocked={termLocked}
          snapshots={snapshots}
          generatingStudentId={generatingStudentId}
          generatePending={generateOne.isPending}
          onGenerateOne={(studentId) => {
            setGeneratingStudentId(studentId);
            generateOne.mutate(studentId);
          }}
          onPreview={(id, studentName) => setPreview({ id, studentName })}
          onNikudEdit={(
            snapshotId, studentName, studentId, supplement, prefs, subjects,
            classInfoArg, termNameArg, gradeValues, customTextBlocks, classNikudOverrides,
          ) =>
            setNikudModal({
              snapshotId, studentName, studentId, supplement, prefs, subjects,
              classInfo: classInfoArg, termName: termNameArg, gradeValues,
              customTextBlocks, classNikudOverrides,
            })
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
