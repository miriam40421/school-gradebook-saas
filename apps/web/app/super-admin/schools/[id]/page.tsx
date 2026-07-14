'use client';

import { use, useEffect, useState } from 'react';
import { ArrowRight, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

type SchoolDetail = {
  id: string;
  name: string;
  isBlocked: boolean;
  studentCount: number;
  certificateCount: number;
  admin: { id: string; name: string; email: string } | null;
};

export default function EditSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['super-admin-school', id],
    queryFn: () => apiFetch<SchoolDetail>(`/super-admin/schools/${id}`),
  });

  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (data) {
      setSchoolName(data.name);
      setAdminName(data.admin?.name ?? '');
      setAdminEmail(data.admin?.email ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {};
      if (schoolName !== data?.name) body.schoolName = schoolName;
      if (adminName !== data?.admin?.name) body.adminName = adminName;
      if (adminEmail !== data?.admin?.email) body.adminEmail = adminEmail;
      if (adminPassword) body.adminPassword = adminPassword;
      return apiFetch<SchoolDetail>(`/super-admin/schools/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (result) => {
      setSaved(true);
      setAdminPassword('');
      qc.setQueryData(['super-admin-school', id], result);
      qc.invalidateQueries({ queryKey: ['super-admin-schools'] });
    },
  });

  const toggleBlock = useMutation({
    mutationFn: (block: boolean) =>
      apiFetch(`/super-admin/schools/${id}/${block ? 'block' : 'unblock'}`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-school', id] });
      qc.invalidateQueries({ queryKey: ['super-admin-schools'] });
    },
  });

  const deleteSchool = useMutation({
    mutationFn: () => apiFetch(`/super-admin/schools/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-schools'] });
      router.replace('/super-admin');
    },
  });

  const isDirty =
    schoolName !== (data?.name ?? '') ||
    adminName !== (data?.admin?.name ?? '') ||
    adminEmail !== (data?.admin?.email ?? '') ||
    adminPassword !== '';

  return (
    <AdminShell>
      <PageHeader
        title={data?.name ?? he.superAdminSchoolName}
        actions={
          <Link href="/super-admin">
            <Button variant="secondary">
              <ArrowRight className="h-4 w-4 ms-1" aria-hidden />
              חזרה
            </Button>
          </Link>
        }
      />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <Alert variant="error" className="mb-4">
          {translateApiError((error as Error).message)}
        </Alert>
      )}

      {data && (
        <>
          {/* Stats + status */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-2 text-sm">
              <span className="text-text-muted">{he.superAdminStudents}:</span>
              <span className="font-semibold text-text">{data.studentCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-2 text-sm">
              <span className="text-text-muted">{he.superAdminCertificates}:</span>
              <span className="font-semibold text-text">{data.certificateCount}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-2 text-sm">
              {data.isBlocked ? (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <Ban className="h-4 w-4" aria-hidden /> {he.superAdminStatusBlocked}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {he.superAdminStatusActive}
                </span>
              )}
            </div>
          </div>

          {/* Edit form */}
          <Card className="mb-4">
            <h2 className="mb-4 text-base font-semibold text-text">{he.superAdminSchoolName}</h2>
            <div className="mb-6">
              <Label htmlFor="school-name">{he.superAdminSchoolName}</Label>
              <Input
                id="school-name"
                value={schoolName}
                onChange={(e) => { setSchoolName(e.target.value); setSaved(false); }}
              />
            </div>

            {data.admin && (
              <>
                <h2 className="mb-4 text-base font-semibold text-text">{he.superAdminAdminName}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="admin-name">{he.superAdminAdminName}</Label>
                    <Input id="admin-name" value={adminName} onChange={(e) => { setAdminName(e.target.value); setSaved(false); }} />
                  </div>
                  <div>
                    <Label htmlFor="admin-email">{he.superAdminAdminEmail}</Label>
                    <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => { setAdminEmail(e.target.value); setSaved(false); }} />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">{he.superAdminAdminPassword}</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => { setAdminPassword(e.target.value); setSaved(false); }}
                      placeholder="השאירי ריק לאי-שינוי"
                    />
                  </div>
                </div>
              </>
            )}

            {save.isError && (
              <Alert variant="error" className="mt-4">{translateApiError((save.error as Error).message)}</Alert>
            )}
            {saved && <Alert variant="success" className="mt-4">השינויים נשמרו בהצלחה.</Alert>}

            <div className="mt-6">
              <Button onClick={() => save.mutate()} disabled={save.isPending || !isDirty}>
                {save.isPending ? he.saving : he.save}
              </Button>
            </div>
          </Card>

          {/* Block / Delete */}
          <Card className="border-red-100">
            <h2 className="mb-4 text-base font-semibold text-text">פעולות מתקדמות</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => toggleBlock.mutate(!data.isBlocked)}
                disabled={toggleBlock.isPending}
                className={data.isBlocked
                  ? 'border-green-200 text-green-700 hover:bg-green-50'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'}
              >
                {data.isBlocked ? (
                  <><CheckCircle2 className="h-4 w-4 ms-1" aria-hidden />{he.unblockSchool}</>
                ) : (
                  <><Ban className="h-4 w-4 ms-1" aria-hidden />{he.blockSchool}</>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 ms-1" aria-hidden />
                {he.deleteSchool}
              </Button>
            </div>
            {toggleBlock.isError && (
              <Alert variant="error" className="mt-3">{translateApiError((toggleBlock.error as Error).message)}</Alert>
            )}
          </Card>
        </>
      )}

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
                onClick={() => deleteSchool.mutate()}
                disabled={deleteSchool.isPending}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteSchool.isPending ? 'מוחק…' : he.deleteSchool}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{he.cancel}</Button>
            </div>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
