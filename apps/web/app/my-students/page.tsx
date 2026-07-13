'use client';



import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';
import { Role } from '@school/shared';
import { AppShell } from '@/components/AppShell';
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



function membershipGroupId(

  student: Student,

  subjectId: string,

): string {

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

      apiFetch<Student[]>(

        `/students${selectedClass ? `?classId=${selectedClass.id}` : ''}`,

      ),

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

      return apiUpload<{ imported: number }>(

        `/students/import-file?classId=${cid}`,

        fd,

      );

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

      <p style={{ fontSize: '0.9rem', color: '#475569' }}>{he.myStudentsHint}</p>



      <div className="card">

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



      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h2>{he.importStudents}</h2>

        {/* ── הוראות פורמט קובץ ── */}
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

          {/* Excel */}
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              📊 Excel (.xlsx / .xls) או CSV
            </div>
            <div style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: 1.6 }}>
              <strong>אפשרות א׳ — שתי עמודות (מומלץ):</strong>
              <br />
              <span style={{ opacity: 0.85 }}>הכותרות יכולות להיות כל דבר — או בלי כותרות בכלל.</span>
              <div style={{ fontFamily: 'monospace', background: '#dcfce7', borderRadius: '0.25rem', padding: '0.3rem 0.5rem', marginTop: '0.2rem', marginBottom: '0.4rem', display: 'inline-block' }}>
                משפחה &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp; פרטי<br />
                כהן &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp; רחל<br />
                בן-דוד &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp; שירה
              </div>
              <br />
              <strong>אפשרות ב׳ — עמודה אחת (שם מלא בכל תא):</strong>
              <div style={{ fontFamily: 'monospace', background: '#dcfce7', borderRadius: '0.25rem', padding: '0.3rem 0.5rem', marginTop: '0.2rem', display: 'inline-block' }}>
                כהן רחל<br />
                בן-דוד שירה
              </div>
            </div>
          </div>

          {/* Word */}
          <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
            <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              📝 Word (.docx)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1d4ed8', lineHeight: 1.6 }}>
              <strong>טבלה</strong> — שתי עמודות, עם כותרות <strong>או בלי כותרות</strong>. <strong>— או —</strong> רשימה פשוטה, כל שם בשורה נפרדת.
              <br />כותרת מסמך לפני הטבלה? לא בעיה — המערכת מדלגת עליה.
            </div>
          </div>

          {/* אזהרה מקף */}
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#92400e' }}>
            ⚠️ <strong>שם משפחה בת שתי מילים</strong> — חברי במקף: <strong>בן-דוד</strong> (לא "בן דוד"), אחרת המילה השנייה תיכנס לעמודת השם הפרטי.
          </div>

          {/* מה מותר */}
          <div style={{ fontSize: '0.78rem', color: '#64748b', paddingRight: '0.25rem', lineHeight: 1.7 }}>
            ✅ מותר: כותרות כלשהן (או בלי כותרות), שורות ריקות, עיצוב (צבע/bold), כותרת מסמך — המערכת מתעלמת מהם.<br />
            ✅ פורמטים: .xlsx, .xls, .csv, .docx<br />
            ❌ לא נתמך: .doc ישן (שמרי כ-docx), גיליון שני (רק גיליון ראשון נקרא).
          </div>
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

        {importFile.isPending && <p>{he.importing}</p>}

        {importFile.isSuccess && (
          <p style={{ color: '#166534', fontWeight: 600 }}>✅ {he.importedCount(importFile.data?.imported ?? 0)}</p>
        )}

        {importFile.isError && (
          <p className="error">{translateApiError((importFile.error as Error).message)}</p>
        )}
      </div>



      <div className="card" style={{ marginTop: '0.75rem' }}>

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



      <div style={{ marginTop: '1rem' }}>

        <h2>{he.studentsListSorted}</h2>

        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>

          {he.studentsSortByFamilyHint}

        </p>

        {isLoading && <p>{he.loading}</p>}

        {error && (

          <p className="error">{translateApiError((error as Error).message)}</p>

        )}

        {!isLoading && !error && sortedStudents.length === 0 && <p>{he.noStudents}</p>}

        {sortedStudents.length > 0 && (

          <table>

            <thead>

              <tr>

                <th>#</th>

                <th>{he.familyNameCol}</th>

                <th>{he.firstNameCol}</th>

                <th />

              </tr>

            </thead>

            <tbody>

              {sortedStudents.map((s, index) => {

                const { firstName, familyName } = splitStudentFullName(s.fullName);

                return (

                <tr key={s.id}>

                  <td>{index + 1}</td>

                  <td>

                    {editingId === s.id ? (

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

                    {editingId === s.id ? (

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

                  <td style={{ whiteSpace: 'nowrap' }}>

                    {editingId === s.id ? (

                      <>

                        <button

                          type="button"

                          onClick={() =>

                            update.mutate({

                              id: s.id,

                              fullName: formatStudentFullName(
                                editFamilyName.trim(),
                                editFirstName.trim(),
                              ),

                            })

                          }

                        >

                          {he.save}

                        </button>

                        <button

                          type="button"

                          className="secondary"

                          onClick={() => setEditingId(null)}

                        >

                          {he.cancel}

                        </button>

                      </>

                    ) : (

                      <>

                        <button

                          type="button"

                          onClick={() => {

                            const parts = splitStudentFullName(s.fullName);

                            setEditingId(s.id);

                            setEditFirstName(parts.firstName);

                            setEditFamilyName(parts.familyName);

                          }}

                        >

                          {he.edit}

                        </button>

                        <button

                          type="button"

                          className="danger"

                          onClick={() => remove.mutate(s.id)}

                        >

                          {he.delete}

                        </button>

                      </>

                    )}

                  </td>

                </tr>

              );

              })}

            </tbody>

          </table>

        )}

      </div>



      <div className="card" style={{ marginTop: '1.5rem' }}>

        <h2>{he.studentGroupsTitle}</h2>

        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.studentGroupsHint}</p>

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


