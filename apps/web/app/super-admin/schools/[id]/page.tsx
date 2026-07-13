'use client';

import { use, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  admin: { id: string; name: string; email: string } | null;
};

export default function EditSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['super-admin-school', id],
    queryFn: () => apiFetch<SchoolDetail>(`/super-admin/schools/${id}`),
  });

  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saved, setSaved] = useState(false);

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
        <Card>
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
                  <Input
                    id="admin-name"
                    value={adminName}
                    onChange={(e) => { setAdminName(e.target.value); setSaved(false); }}
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">{he.superAdminAdminEmail}</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => { setAdminEmail(e.target.value); setSaved(false); }}
                  />
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
            <Alert variant="error" className="mt-4">
              {translateApiError((save.error as Error).message)}
            </Alert>
          )}
          {saved && (
            <Alert variant="success" className="mt-4">
              השינויים נשמרו בהצלחה.
            </Alert>
          )}

          <div className="mt-6">
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !isDirty}
            >
              {save.isPending ? he.saving : he.save}
            </Button>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
