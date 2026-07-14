'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Plus, School, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';
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
  userCount: number;
  studentCount: number;
  certificateCount: number;
};

type CreateSchoolResult = {
  school: { id: string; name: string };
  admin: { id: string; email: string };
};

export default function SuperAdminPage() {
  const qc = useQueryClient();
  const { data: schools = [], isLoading, error } = useQuery({
    queryKey: ['super-admin-schools'],
    queryFn: () => apiFetch<SchoolRow[]>('/super-admin/schools'),
  });

  const [showForm, setShowForm] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [lastCreated, setLastCreated] = useState<CreateSchoolResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CreateSchoolResult>('/super-admin/schools', {
        method: 'POST',
        body: JSON.stringify({ schoolName, adminName, adminEmail, adminPassword }),
      }),
    onSuccess: (result) => {
      setLastCreated(result);
      setShowForm(false);
      setSchoolName(''); setAdminName(''); setAdminEmail(''); setAdminPassword('');
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

  return (
    <AdminShell>
      <PageHeader
        title={he.navSuperAdminSchools}
        actions={
          <Button onClick={() => { setShowForm((v) => !v); setLastCreated(null); }}>
            <Plus className="h-4 w-4" aria-hidden />
            {he.superAdminCreateSchool}
          </Button>
        }
      />

      {lastCreated && (
        <Alert variant="success" className="mb-4">
          בית הספר <strong>{lastCreated.school.name}</strong> נוצר.
          מנהלת: <strong>{lastCreated.admin.email}</strong> — שדה הסיסמה שהוגדר.
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
            <div>
              <Label htmlFor="admin-password">{he.superAdminAdminPassword}</Label>
              <Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="לפחות 6 תווים" />
            </div>
          </div>
          {create.isError && (
            <Alert variant="error" className="mt-3">{translateApiError((create.error as Error).message)}</Alert>
          )}
          <div className="mt-4 flex gap-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending || !schoolName || !adminName || !adminEmail || !adminPassword}>
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
              <tr className="border-b border-slate-100 text-right text-xs font-semibold text-text-muted">
                <th className="pb-2 font-semibold">{he.superAdminSchoolName}</th>
                <th className="pb-2 font-semibold">משתמשים</th>
                <th className="pb-2 font-semibold">{he.superAdminStudents}</th>
                <th className="pb-2 font-semibold">{he.superAdminCertificates}</th>
                <th className="pb-2 font-semibold">סטטוס</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className={`border-b border-slate-50 last:border-b-0 ${s.isBlocked ? 'opacity-60' : ''}`}>
                  <td className="py-3 font-medium text-text">{s.name}</td>
                  <td className="py-3 text-text-muted">{s.userCount}</td>
                  <td className="py-3 text-text-muted">{s.studentCount}</td>
                  <td className="py-3 text-text-muted">{s.certificateCount}</td>
                  <td className="py-3">
                    {s.isBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <Ban className="h-3 w-3" aria-hidden /> {he.superAdminStatusBlocked}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> {he.superAdminStatusActive}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/super-admin/schools/${s.id}`} className="text-xs text-primary hover:underline">עריכה</a>
                      <button
                        type="button"
                        onClick={() => toggleBlock.mutate({ id: s.id, block: !s.isBlocked })}
                        className="text-xs text-text-muted hover:text-text"
                        title={s.isBlocked ? he.unblockSchool : he.blockSchool}
                      >
                        {s.isBlocked ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Ban className="h-4 w-4 text-amber-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(s.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                        title={he.deleteSchool}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
          <Card className="w-full max-w-sm shadow-elevation4">
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
