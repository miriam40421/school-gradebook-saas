'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Role } from '@school/shared';
import type { CertificateSupplementContextDto, GradebookMatrixDto, GradingTermDto } from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { GradebookGrid } from '@/components/GradebookGrid';
import { hasCertificateColumns } from '@/lib/gradebook-columns.util';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { he, translateApiError } from '@/lib/he';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

type ClassRow = { id: string; name: string; year: number };

export default function AdminGradebookPageWrapper() {
  return (
    <Suspense fallback={<Spinner label={he.loading} />}>
      <AdminGradebookPage />
    </Suspense>
  );
}

function AdminGradebookPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const classId = params.get('classId') ?? '';
  const termId = params.get('termId') ?? '';
  const [newTermName, setNewTermName] = useState('');
  const [confirmLockId, setConfirmLockId] = useState<string | null>(null);
  const [confirmDeleteTermId, setConfirmDeleteTermId] = useState<string | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
    enabled: user?.role === Role.Admin,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['grading-terms'],
    queryFn: () => apiFetch<GradingTermDto[]>('/grading-terms'),
  });

  const toggleTermLock = useMutation({
    mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) =>
      apiFetch<GradingTermDto>(`/grading-terms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isLocked }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['grading-terms'] });
      void qc.invalidateQueries({ queryKey: ['gradebook'] });
    },
  });

  const addTerm = useMutation({
    mutationFn: (name: string) =>
      apiFetch<GradingTermDto>('/grading-terms', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (term) => {
      qc.invalidateQueries({ queryKey: ['grading-terms'] });
      setNewTermName('');
      const q = new URLSearchParams(params.toString());
      if (classId) q.set('classId', classId);
      q.set('termId', term.id);
      router.push(`/gradebook?${q.toString()}`);
    },
  });

  const deleteTerm = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/grading-terms/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, deletedId) => {
      void qc.invalidateQueries({ queryKey: ['grading-terms'] });
      if (termId === deletedId) {
        const q = new URLSearchParams(params.toString());
        if (classId) q.set('classId', classId);
        router.push(`/gradebook?${q.toString()}`);
      }
    },
  });

  const {
    data: matrix,
    refetch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gradebook', classId, termId],
    queryFn: () =>
      apiFetch<GradebookMatrixDto>(
        `/gradebook?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  const { data: certContext } = useQuery({
    queryKey: ['certificate-supplement-context', classId, termId],
    queryFn: () =>
      apiFetch<CertificateSupplementContextDto>(
        `/certificates/supplement-context?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  if (user?.role !== Role.Admin) {
    return (
      <AppShell>
        <p>{he.adminOnly}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title={he.navAdminGradebook} description={he.gradebookWhatIs} />
      <p className="mb-4 text-sm text-text-muted">{he.adminGradebookSteps}</p>
      <Card className="mb-4">
        <h3 className="mb-2 mt-0 text-lg font-semibold text-text">{he.gradebookTermsTitle}</h3>
        <p className="mb-3 text-sm text-text-muted">{he.gradebookTermsHint}</p>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (newTermName.trim()) addTerm.mutate(newTermName.trim());
          }}
          className="mb-4 flex flex-wrap gap-2"
        >
          <Input
            value={newTermName}
            onChange={(e) => setNewTermName(e.target.value)}
            placeholder={he.gradebookTermsNamePlaceholder}
            className="min-w-[200px] flex-1"
          />
          <Button type="submit" disabled={addTerm.isPending || !newTermName.trim()}>
            {he.gradebookTermsAdd}
          </Button>
        </form>
        {terms.length > 0 && (
          <ul className="m-0 list-none space-y-2 p-0">
            {terms.map((t) => (
              <li key={t.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {t.name}
                    {t.isLocked ? ` (${he.lockedLabel})` : ''}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={toggleTermLock.isPending}
                    onClick={() => setConfirmLockId(t.id)}
                  >
                    {t.isLocked ? he.termUnlockAction : he.termLockAction}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={deleteTerm.isPending}
                    onClick={() => setConfirmDeleteTermId(t.id)}
                  >
                    {he.gradebookTermsDelete}
                  </Button>
                </div>
                {confirmLockId === t.id && (
                  <div className="flex items-center gap-2 rounded-md bg-warning-light px-3 py-2 text-sm">
                    <span>{t.isLocked ? he.termUnlockConfirm : he.termLockConfirm}</span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={toggleTermLock.isPending}
                      onClick={() => {
                        toggleTermLock.mutate({ id: t.id, isLocked: !t.isLocked });
                        setConfirmLockId(null);
                      }}
                    >
                      {he.confirmYes ?? 'כן'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmLockId(null)}
                    >
                      {he.confirmNo ?? 'ביטול'}
                    </Button>
                  </div>
                )}
                {confirmDeleteTermId === t.id && (
                  <div className="flex items-center gap-2 rounded-md bg-danger-light px-3 py-2 text-sm">
                    <span>{he.gradebookTermsDeleteConfirm}</span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deleteTerm.isPending}
                      onClick={() => {
                        deleteTerm.mutate(t.id);
                        setConfirmDeleteTermId(null);
                      }}
                    >
                      {he.confirmYes ?? 'כן'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteTermId(null)}
                    >
                      {he.confirmNo ?? 'ביטול'}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="mb-4">
        <div>
          <Label>{he.selectClass}</Label>
          <Select
            value={classId}
            onChange={(e) => {
              const q = new URLSearchParams(params.toString());
              q.set('classId', e.target.value);
              if (termId) q.set('termId', termId);
              router.push(`/gradebook?${q.toString()}`);
            }}
          >
            <option value="">{he.selectPlaceholder}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.year})
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4">
          <Label>{he.selectTerm}</Label>
          <Select
            value={termId}
            onChange={(e) => {
              const q = new URLSearchParams(params.toString());
              if (classId) q.set('classId', classId);
              q.set('termId', e.target.value);
              router.push(`/gradebook?${q.toString()}`);
            }}
          >
            <option value="">{he.selectPlaceholder}</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isLocked ? ` (${he.lockedLabel})` : ''}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      {classId && termId && isLoading && <Spinner label={he.loading} />}
      {error && (
        <Alert variant="error" className="mb-4">
          <p>{translateApiError((error as Error).message)}</p>
          <p className="mt-2 text-sm">
            {he.gradebookAmbiguousHint}{' '}
            <Link href="/grading-sets">{he.navGradingSets}</Link>
          </p>
        </Alert>
      )}
      {matrix && user && (
        <>
          {certContext && (
            <p className="mb-3 text-sm text-text-muted">
              {he.gradebookActiveCertProfile(
                certContext.certificateProfileName ?? he.classCertProfileDefault,
              )}
              {!hasCertificateColumns(certContext.certificatePrefs) && (
                <>
                  {' '}
                  · {he.gradebookNoComputerCertCols}
                </>
              )}
            </p>
          )}
          <GradebookGrid
          classId={classId}
          termId={termId}
          matrix={matrix}
          userId={user.id}
          readOnly
          onSaved={() => void refetch()}
          certSupplementContext={certContext ?? null}
        />
        </>
      )}
    </AppShell>
  );
}
