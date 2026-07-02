'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Role } from '@school/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Users } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { sortByFamilyName, splitStudentFullName } from '@/lib/sort';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTableRows } from '@/components/ui/Skeleton';

type ClassRow = { id: string; name: string; year: number; yearHebrew: string | null };
type Student = {
  id: string;
  fullName: string;
  classId: string;
  class: ClassRow;
};

export default function StudentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === Role.HomeroomTeacher) {
      router.replace('/my-students');
    }
  }, [user, router]);

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students-view'],
    queryFn: () => apiFetch<Student[]>('/students'),
    enabled: user?.role === Role.Admin,
  });

  const byClass = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const s of students) {
      const list = map.get(s.classId) ?? [];
      list.push(s);
      map.set(s.classId, list);
    }
    for (const [, list] of map) {
      sortByFamilyName(list, (x) => x.fullName);
    }
    return [...map.entries()].sort((a, b) =>
      (a[1][0]?.class.name ?? '').localeCompare(b[1][0]?.class.name ?? '', 'he'),
    );
  }, [students]);

  if (user?.role === Role.HomeroomTeacher) {
    return null;
  }

  return (
    <AppShell>
      <PageHeader title={he.studentsTitle} description={he.studentsAdminViewHint} />
      {isLoading && (
        <Card>
          <table className="w-full border-collapse text-sm">
            <tbody><SkeletonTableRows rows={5} cols={2} /></tbody>
          </table>
        </Card>
      )}
      {error && (
        <Alert variant="error">{translateApiError((error as Error).message)}</Alert>
      )}
      {!isLoading && byClass.length === 0 && (
        <EmptyState icon={Users} message={he.noStudents} />
      )}
      <div className="space-y-4">
        {byClass.map(([classId, list]) => {
          const c = list[0]?.class;
          const label = c
            ? `${c.name} · ${c.year}${c.yearHebrew ? ` (${c.yearHebrew})` : ''}`
            : classId;
          return (
            <Card key={classId}>
              <h3 className="mb-3 text-lg font-semibold text-text">{label}</h3>
              <DataTable compact>
                <thead>
                  <tr>
                    <th>{he.familyNameCol}</th>
                    <th>{he.firstNameCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const { firstName, familyName } = splitStudentFullName(s.fullName);
                    return (
                      <tr key={s.id}>
                        <td>{familyName || '—'}</td>
                        <td>{firstName || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
