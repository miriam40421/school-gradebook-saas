'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Pencil, Plus, RotateCcw, School, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

type SchoolRow = {
  id: string;
  name: string;
  isBlocked: boolean;
  isDeleted: boolean;
};

type CreateSchoolResult = {
  school: { id: string; name: string };
  admin: { id: string; email: string };
};

export default function SuperAdminPage() {
  const qc = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [lastCreated, setLastCreated] = useState<CreateSchoolResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: schools = [], isLoading, error } = useQuery({
    queryKey: ['super-admin-schools', showDeleted],
    queryFn: () => apiFetch<SchoolRow[]>(`/super-admin/schools${showDeleted ? '?includeDeleted=true' : ''}`),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CreateSchoolResult>('/super-admin/schools', {
        method: 'POST',
        body: JSON.stringify({ schoolName, adminName, adminEmail }),
      }),
    onSuccess: (result) => {
      setLastCreated(result);
      setShowForm(false);
      setSchoolName(''); setAdminName(''); setAdminEmail('');
      qc.invalidateQueries({ queryKey: ['super-admin-schools'] });
    },
  });

  const toggleBlock = useMutation({
    mutationFn: ({ id, block }: { id: string; block: boolean }) =>
      apiFetch(`/super-admin/schools/${id}/${block ? 'block' : 'unblock'}`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-schools'] }),
  });

  const deleteSchool = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/super-admin/schools/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['super-admin-schools'] });
    },
  });

  const restoreSchool = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/super-admin/schools/${id}/restore`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-schools'] }),
  });

  return (
    <AdminShell>
      <PageHeader
        title={he.navSuperAdminSchools}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDeleted((v) => !v)}>
              {showDeleted ? he.hideDeleted : he.showDeleted}
            </Button>
            <Button onClick={() => { setShowForm((v) => !v); setLastCreated(null); }}>
              <Plus className="h-4 w-4" aria-hidden />
              {he.superAdminCreateSchool}
            </Button>
          </div>
        }
      />

      {lastCreated && (
        <Alert variant="success" className="mb-4">
          בית הספר <strong>{lastCreated.school.name}</strong> נוצר.
          מנהלת: <strong>{lastCreated.admin.email}</strong> — נשלח מייל להגדרת סיסמה.
        </Alert>
      )}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-4 text-lg font-semibold text-text">{he.superAdminCreateSchool}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="school-name">{he.superAdminSchoolName}</Label>
              <Input id="school-name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="בית ספר יסודי עמית" />
            </div>
            <div>
              <Label htmlFor="admin-name">{he.superAdminAdminName}</Label>
              <Input id="admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="שרה לוי" />
            </div>
            <div>
              <Label htmlFor="admin-email">{he.superAdminAdminEmail}</Label>
              <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="principal@school.edu" />
            </div>
          </div>
          {create.isError && (
            <Alert variant="error" className="mt-3">{translateApiError((create.error as Error).message)}</Alert>
          )}
          <div className="mt-4 flex gap-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending || !schoolName || !adminName || !adminEmail}>
              {he.superAdminCreateSchool}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{he.cancel}</Button>
          </div>
        </Card>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && <Alert variant="error" className="mb-4">{translateApiError((error as Error).message)}</Alert>}

      {!isLoading && schools.length === 0 && (
        <Card className="flex flex-col items-center py-12 text-center">
          <School className="mb-3 h-10 w-10 text-text-muted" aria-hidden />
          <p className="text-text-muted">אין בתי ספר עדיין. צרי את הראשון.</p>
        </Card>
      )}

      {schools.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs font-semibold text-text-muted">
                <th className="pb-2 font-semibold">{he.superAdminSchoolName}</th>
                <th className="pb-2 font-semibold">{he.schoolId}</th>
                <th className="pb-2 font-semibold">סטטוס</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className={`border-b border-border last:border-b-0 ${s.isDeleted ? 'opacity-50' : s.isBlocked ? 'opacity-70' : ''}`}>
                  <td className="py-3 font-medium text-text">{s.name}</td>
                  <td className="py-3 font-mono text-xs text-text-muted">{s.id}</td>
                  <td className="py-3">
                    {s.isDeleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-subtle">
                        <Trash2 className="h-3 w-3" aria-hidden /> {he.superAdminStatusDeleted}
                      </span>
                    ) : s.isBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <Ban className="h-3 w-3" aria-hidden /> {he.superAdminStatusBlocked}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> {he.superAdminStatusActive}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      {s.isDeleted ? (
                        <button
                          type="button"
                          onClick={() => restoreSchool.mutate(s.id)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          title={he.restoreSchool}
                        >
                          <RotateCcw className="h-4 w-4" /> {he.restoreSchool}
                        </button>
                      ) : (
                        <>
                          <span className="relative inline-flex group/edit">
                            <a
                              href={`/super-admin/schools/${s.id}`}
                              aria-label="עריכה"
                              className="ui-icon-action flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-transparent text-primary transition-colors duration-150 hover:border-primary hover:bg-primary/10"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </a>
                            <span
                              aria-hidden
                              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/edit:opacity-100"
                            >
                              עריכה
                            </span>
                          </span>
                          <span className="relative inline-flex group/block">
                            <button
                              type="button"
                              onClick={() => toggleBlock.mutate({ id: s.id, block: !s.isBlocked })}
                              aria-label={s.isBlocked ? he.unblockSchool : he.blockSchool}
                              className={cn(
                                'ui-icon-action flex h-7 w-7 items-center justify-center rounded-md border bg-transparent transition-colors duration-150',
                                s.isBlocked
                                  ? 'border-green-200 text-green-600 hover:border-green-400 hover:bg-green-50'
                                  : 'border-amber-200 text-amber-500 hover:border-amber-400 hover:bg-amber-50',
                              )}
                            >
                              {s.isBlocked
                                ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                : <Ban className="h-3.5 w-3.5" aria-hidden />}
                            </button>
                            <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/block:opacity-100">
                              {s.isBlocked ? he.unblockSchool : he.blockSchool}
                            </span>
                          </span>
                          <span className="relative inline-flex group/del">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(s.id)}
                              aria-label={he.deleteSchool}
                              className="ui-icon-action flex h-7 w-7 items-center justify-center rounded-md border border-danger/20 bg-transparent text-danger/70 transition-colors duration-150 hover:border-danger/60 hover:bg-danger-light hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/del:opacity-100">
                              {he.deleteSchool}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm shadow-elevation2">
            <h3 className="mb-2 text-base font-semibold text-text">{he.deleteSchool}</h3>
            <p className="mb-4 text-sm text-text-muted">{he.deleteSchoolConfirm}</p>
            {deleteSchool.isError && (
              <Alert variant="error" className="mb-3">{translateApiError((deleteSchool.error as Error).message)}</Alert>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => deleteSchool.mutate(confirmDelete)}
                disabled={deleteSchool.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteSchool.isPending ? 'מוחק…' : he.deleteSchool}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{he.cancel}</Button>
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
