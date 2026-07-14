'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { RowActions } from '@/components/RowActions';
import { useAuth } from '@/lib/auth';
import { apiFetch, apiUpload } from '@/lib/api';
import { groupSubjectId } from '@/lib/class-group';
import { he, translateApiError } from '@/lib/he';
import {
  formatStudentDisplayName,
  formatStudentFullName,
  normalizeStudentFullName,
  sortByFamilyName,
  sortHebrew,
  splitStudentFullName,
} from '@/lib/sort';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';

type ClassGroup = {
  id: string;
  name: string;
  sortOrder: number;
  subjectId?: string | null;
  subject?: { id: string; name: string } | null;
};

type ClassRow = {
  id: string;
  name: string;
  year: number;
  yearHebrew: string | null;
  groups?: ClassGroup[];
};

type GroupMembership = {
  classGroupId: string;
  classGroup: ClassGroup;
};

type Student = {
  id: string;
  fullName: string;
  classId: string;
  classGroupId: string | null;
  class: ClassRow;
  classGroup: ClassGroup | null;
  groupMemberships?: GroupMembership[];
};

function membershipGroupId(student: Student, subjectId: string): string {
  const m = student.groupMemberships?.find(
    (x) => x.classGroup.subject?.id === subjectId,
  );
  return m?.classGroupId ?? '';
}

function nextMembershipIds(
  student: Student,
  subjectId: string,
  groupId: string | null,
): string[] {
  const keep = (student.groupMemberships ?? [])
    .filter((m) => m.classGroup.subject?.id && m.classGroup.subject.id !== subjectId)
    .map((m) => m.classGroupId);
  return groupId ? [...keep, groupId] : keep;
}

export default function MyStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFamilyName, setEditFamilyName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');

  const isHomeroom = user?.role === Role.HomeroomTeacher;

  useEffect(() => {
    if (!authLoading && user?.role === Role.SubjectTeacher) {
      router.replace('/teacher');
    }
  }, [authLoading, user, router]);

  const { data: classes = [] } = useQuery({
    queryKey: ['my-classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
    enabled: isHomeroom,
  });

  const sortedClasses = useMemo(() => sortHebrew(classes, (c) => c.name), [classes]);
  const selectedClass = sortedClasses.find((c) => c.id === classId) ?? sortedClasses[0];

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['my-students', selectedClass?.id],
    queryFn: () =>
      apiFetch<Student[]>(`/students${selectedClass ? `?classId=${selectedClass.id}` : ''}`),
    enabled: !!selectedClass,
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          fullName: normalizeStudentFullName(fullName),
          classId: classId || selectedClass?.id,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] });
      setFullName('');
    },
  });

  const updateMemberships = useMutation({
    mutationFn: (payload: { studentId: string; classGroupIds: string[] }) =>
      apiFetch(`/students/${payload.studentId}/group-memberships`, {
        method: 'PATCH',
        body: JSON.stringify({ classGroupIds: payload.classGroupIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-students'] }),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; fullName: string }) =>
      apiFetch(`/students/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName: payload.fullName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] });
      setEditingId(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-students'] }),
  });

  const importFile = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const cid = classId || selectedClass?.id;
      return apiUpload<{ imported: number }>(`/students/import-file?classId=${cid}`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-students'] });
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  const classLabel = (c: ClassRow) =>
    `${c.name} · ${c.year}${c.yearHebrew ? ` (${c.yearHebrew})` : ''}`;

  const sortedStudents = useMemo(
    () => sortByFamilyName(students, (s) => s.fullName),
    [students],
  );

  const groups = selectedClass?.groups ?? [];

  const subjectsWithGroups = useMemo(() => {
    const bySubject = new Map<string, { id: string; name: string; groups: ClassGroup[] }>();
    for (const g of groups) {
      const sid = groupSubjectId(g);
      if (!sid) continue;
      const name = g.subject?.name ?? '—';
      const entry = bySubject.get(sid) ?? { id: sid, name, groups: [] };
      entry.groups.push(g);
      bySubject.set(sid, entry);
    }
    for (const entry of bySubject.values()) {
      entry.groups.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'he'));
    }
    return sortHebrew([...bySubject.values()], (x) => x.name);
  }, [groups]);

  if (!authLoading && user && user.role !== Role.HomeroomTeacher) {
    if (user.role === Role.SubjectTeacher) {
      return <p style={{ padding: '2rem' }}>{he.loading}</p>;
    }
    return (
      <AppShell>
        <p className="error">{he.homeroomPortal}</p>
      </AppShell>
    );
  }

  if (sortedClasses.length === 0) {
    return (
      <AppShell>
        <h1>{he.myStudentsTitle}</h1>
        <p className="error">{he.myStudentsNoClass}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>{he.myStudentsTitle}</h1>
      <p className="mt-1 text-sm text-text-muted">{he.myStudentsHint}</p>

      <div className="card max-w-2xl">
        <label>
          {he.myClass}
          <select
            value={classId || selectedClass?.id || ''}
            onChange={(e) => setClassId(e.target.value)}
          >
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card max-w-2xl" style={{ marginTop: '0.75rem' }}>
        <h2>{he.importStudents}</h2>
        <div className="mb-4 flex flex-col gap-2.5">
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="mb-1.5 text-xs font-semibold text-text">📊 Excel (.xlsx / .xls) או CSV</p>
            <div className="text-xs text-text-muted leading-relaxed">
              <strong>אפשרות א׳ — שתי עמודות (מומלץ):</strong>
              <br />
              <span>הכותרות יכולות להיות כל דבר — או בלי כותרות בכלל.</span>
              <div className="font-mono mt-1.5 mb-2 inline-block rounded bg-surface px-2 py-1 text-text border border-border">
                משפחה &nbsp;&nbsp;|&nbsp; פרטי<br />
                כהן &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp; רחל<br />
                בן-דוד &nbsp;&nbsp;|&nbsp; שירה
              </div>
              <br />
              <strong>אפשרות ב׳ — עמודה אחת (שם מלא בכל תא):</strong>
              <div className="font-mono mt-1 inline-block rounded bg-surface px-2 py-1 text-text border border-border">
                כהן רחל<br />
                בן-דוד שירה
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="mb-1 text-xs font-semibold text-text">📝 Word (.docx)</p>
            <p className="text-xs text-text-muted leading-relaxed">
              <strong>טבלה</strong> — שתי עמודות, עם כותרות <strong>או בלי כותרות</strong>. <strong>— או —</strong> רשימה פשוטה, כל שם בשורה נפרדת.
              כותרת מסמך לפני הטבלה? לא בעיה — המערכת מדלגת עליה.
            </p>
          </div>
          <div className="rounded-md border border-warning/30 bg-warning-light px-3 py-2 text-xs text-amber-800">
            ⚠️ <strong>שם משפחה בת שתי מילים</strong> — חברי במקף: <strong>בן-דוד</strong> (לא "בן דוד"), אחרת המילה השנייה תיכנס לעמודת השם הפרטי.
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            ✅ מותר: כותרות כלשהן (או בלי כותרות), שורות ריקות, עיצוב (צבע/bold), כותרת מסמך — המערכת מתעלמת מהם.<br />
            ✅ פורמטים: .xlsx, .xls, .csv, .docx<br />
            ❌ לא נתמך: .doc ישן (שמרי כ-docx), גיליון שני (רק גיליון ראשון נקרא).
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile.mutate(file);
          }}
        />
        {importFile.isPending && <p className="mt-2 text-sm text-text-muted">{he.importing}</p>}
        {importFile.isSuccess && (
          <p className="mt-2 text-sm font-medium text-primary">✅ {he.importedCount(importFile.data?.imported ?? 0)}</p>
        )}
        {importFile.isError && (
          <p className="mt-2 text-sm text-danger">{translateApiError((importFile.error as Error).message)}</p>
        )}
      </div>

      <div className="card max-w-2xl" style={{ marginTop: '0.75rem' }}>
        <h2>{he.addStudent}</h2>
        <form onSubmit={onSubmit}>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={he.fullNamePlaceholder}
            required
          />
          <button type="submit" disabled={create.isPending}>
            {he.addStudent}
          </button>
        </form>
        {create.isError && (
          <p className="error">{translateApiError((create.error as Error).message)}</p>
        )}
      </div>

      <Card className="mt-4 max-w-2xl">
        <h2 className="mb-1 text-base font-semibold text-text">{he.studentsListSorted}</h2>
        <p className="mb-3 text-xs text-text-muted">{he.studentsSortByFamilyHint}</p>

        {isLoading && <p className="text-sm text-text-muted">{he.loading}</p>}
        {error && (
          <p className="text-sm text-danger">{translateApiError((error as Error).message)}</p>
        )}
        {!isLoading && !error && sortedStudents.length === 0 && (
          <p className="text-sm text-text-muted">{he.noStudents}</p>
        )}

        {sortedStudents.length > 0 && (
          <DataTable compact>
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>{he.familyNameCol}</th>
                <th>{he.firstNameCol}</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, index) => {
                const { firstName, familyName } = splitStudentFullName(s.fullName);
                const isEditing = editingId === s.id;
                return (
                  <tr key={s.id}>
                    <td>{index + 1}</td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editFamilyName}
                          onChange={(e) => setEditFamilyName(e.target.value)}
                          placeholder={he.familyNameCol}
                          required
                        />
                      ) : (
                        familyName || '—'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder={he.firstNameCol}
                          required
                        />
                      ) : (
                        firstName || '—'
                      )}
                    </td>
                    <td>
                      <RowActions
                        isEditing={isEditing}
                        onEdit={() => {
                          const parts = splitStudentFullName(s.fullName);
                          setEditingId(s.id);
                          setEditFirstName(parts.firstName);
                          setEditFamilyName(parts.familyName);
                        }}
                        onSave={() =>
                          update.mutate({
                            id: s.id,
                            fullName: formatStudentFullName(
                              editFamilyName.trim(),
                              editFirstName.trim(),
                            ),
                          })
                        }
                        onCancel={() => setEditingId(null)}
                        onDelete={() => remove.mutate(s.id)}
                        saveDisabled={!editFamilyName.trim() && !editFirstName.trim()}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      <div className="card max-w-2xl" style={{ marginTop: '1.5rem' }}>
        <h2>{he.studentGroupsTitle}</h2>
        <p className="text-xs text-text-muted">{he.studentGroupsHint}</p>
        {subjectsWithGroups.length === 0 && <p>{he.studentGroupsNone}</p>}
        {updateMemberships.isError && (
          <p className="error">
            {translateApiError((updateMemberships.error as Error).message)}
          </p>
        )}
        {subjectsWithGroups.map((subject) => (
          <div key={subject.id} style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>{subject.name}</h3>
            {sortedStudents.length === 0 ? (
              <p>{he.noStudents}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{he.studentName}</th>
                    <th>{he.groupCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((s) => (
                    <tr key={s.id}>
                      <td>{formatStudentDisplayName(s.fullName)}</td>
                      <td>
                        <select
                          value={membershipGroupId(s, subject.id)}
                          disabled={updateMemberships.isPending}
                          onChange={(e) => {
                            const gid = e.target.value || null;
                            updateMemberships.mutate({
                              studentId: s.id,
                              classGroupIds: nextMembershipIds(s, subject.id, gid),
                            });
                          }}
                        >
                          <option value="">{he.noGroup}</option>
                          {subject.groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
