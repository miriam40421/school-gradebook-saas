'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Role, formatCertificateProfileLabel, normalizeCertificateProfiles } from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { RowActions } from '@/components/RowActions';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { he, translateApiError } from '@/lib/he';
import { sortHebrew } from '@/lib/sort';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type ClassGroup = {
  id: string;
  name: string;
  sortOrder: number;
  subjectId?: string | null;
  subject?: { id: string; name: string } | null;
};
type SubjectRef = { id: string; name: string };
type UserRow = { id: string; name: string; role: string };
type ClassRow = {
  id: string;
  name: string;
  year: number;
  yearHebrew: string | null;
  homeroomTeacherId: string | null;
  homeroomTeacher: UserRow | null;
  certificateProfileId: string | null;
  groups?: ClassGroup[];
};

type SchoolSettings = {
  settingsJson?: Record<string, unknown>;
};

export default function ClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === Role.Admin;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [className, setClassName] = useState('');
  const [year, setYear] = useState(2025);
  const [yearHebrew, setYearHebrew] = useState('תשפ״ה');
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  const [newCertProfileId, setNewCertProfileId] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubjectId, setNewGroupSubjectId] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editYear, setEditYear] = useState(2025);
  const [editYearHebrew, setEditYearHebrew] = useState('');
  const [editHomeroomId, setEditHomeroomId] = useState('');
  const [editCertProfileId, setEditCertProfileId] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserRow[]>('/users'),
    enabled: isAdmin,
  });
  const homeroomCandidates = useMemo(
    () =>
      sortHebrew(
        users.filter((u) => u.role === Role.HomeroomTeacher || u.role === Role.Admin),
        (u) => u.name,
      ),
    [users],
  );

  useEffect(() => {
    if (!isAdmin || homeroomTeacherId || homeroomCandidates.length === 0) return;
    setHomeroomTeacherId(homeroomCandidates[0].id);
  }, [isAdmin, homeroomCandidates, homeroomTeacherId]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiFetch<SubjectRef[]>('/subjects'),
  });

  const { data: school } = useQuery({
    queryKey: ['school'],
    queryFn: () => apiFetch<SchoolSettings>('/school'),
    enabled: isAdmin,
  });

  const certProfiles = useMemo(
    () => normalizeCertificateProfiles(school?.settingsJson).profiles,
    [school?.settingsJson],
  );

  const certProfileLabel = (profileId: string | null | undefined) => {
    if (!profileId) return he.classCertProfileDefault;
    const profile = certProfiles.find((p) => p.id === profileId);
    if (!profile) return profileId;
    return formatCertificateProfileLabel(profile);
  };

  const {
    data: classes = [],
    isLoading,
    isError: classesError,
    error: classesQueryError,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
    enabled: isAdmin,
  });

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return a.name.localeCompare(b.name, 'he');
      }),
    [classes],
  );

  const createClass = useMutation({
    mutationFn: () =>
      apiFetch('/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: className.trim(),
          year: Number(year),
          yearHebrew: yearHebrew.trim() || undefined,
          homeroomTeacherId,
          ...(newCertProfileId ? { certificateProfileId: newCertProfileId } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setClassName('');
      setNewCertProfileId('');
    },
  });

  const updateClass = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      year: number;
      yearHebrew: string | null;
      homeroomTeacherId: string | null;
      certificateProfileId: string | null;
    }) =>
      apiFetch(`/classes/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          year: payload.year,
          yearHebrew: payload.yearHebrew,
          homeroomTeacherId: payload.homeroomTeacherId,
          certificateProfileId: payload.certificateProfileId,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setEditingClassId(null);
    },
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => apiFetch(`/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const addGroup = useMutation({
    mutationFn: ({
      classId,
      name,
      subjectId,
    }: {
      classId: string;
      name: string;
      subjectId: string;
    }) =>
      apiFetch(`/classes/${classId}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name, subjectId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setNewGroupName('');
      setNewGroupSubjectId('');
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({
      classId,
      id,
      name,
    }: {
      classId: string;
      id: string;
      name: string;
    }) =>
      apiFetch(`/classes/${classId}/groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      setEditingGroupId(null);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: ({ classId, id }: { classId: string; id: string }) =>
      apiFetch(`/classes/${classId}/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });

  const startEditClass = (c: ClassRow) => {
    setEditingClassId(c.id);
    setEditClassName(c.name);
    setEditYear(c.year);
    setEditYearHebrew(c.yearHebrew ?? '');
    setEditHomeroomId(c.homeroomTeacherId ?? '');
    setEditCertProfileId(c.certificateProfileId ?? '');
  };

  if (authLoading) {
    return (
      <AppShell>
        <p>{he.loading}</p>
      </AppShell>
    );
  }

  if (!authLoading && user && !isAdmin) {
    return (
      <AppShell>
        <h1>{he.classesOnlyTitle}</h1>
        <p className="error">{he.classesAdminCreateOnly}</p>
        <p style={{ fontSize: '0.9rem', color: '#475569' }}>
          {user.role === Role.SubjectTeacher ? he.teacherGradebookHint : he.homeroomPortal}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1>{he.classesOnlyTitle}</h1>
      <p style={{ fontSize: '0.9rem', color: '#475569' }}>{he.classesOnlyHint}</p>
      {!isAdmin ? (
        <div className="card">
          <p className="error">{he.classesAdminCreateOnly}</p>
        </div>
      ) : (
        <div className="card">
          <h2>{he.createClass}</h2>
          {homeroomCandidates.length === 0 && (
            <p className="error">{he.noHomeroomUsersHint}</p>
          )}
          <form
            className="max-w-sm space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!homeroomTeacherId) return;
              createClass.mutate();
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-text">{he.className}</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={he.className}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">{he.yearGregorian}</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2000}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">{he.yearHebrew}</label>
              <input
                value={yearHebrew}
                onChange={(e) => setYearHebrew(e.target.value)}
                placeholder="תשפ״ה"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">{he.homeroomTeacher}</label>
              <select
                value={homeroomTeacherId}
                onChange={(e) => setHomeroomTeacherId(e.target.value)}
                required
              >
                <option value="">{he.selectHomeroomRequired}</option>
                {homeroomCandidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({he.roleLabel(u.role)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text">{he.classCertProfile}</label>
              <select
                value={newCertProfileId}
                onChange={(e) => setNewCertProfileId(e.target.value)}
              >
                <option value="">{he.classCertProfileDefault}</option>
                {certProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatCertificateProfileLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-text-muted">{he.homeroomRequiredHint}</p>
            <button
              type="submit"
              disabled={
                !homeroomTeacherId ||
                !className.trim() ||
                createClass.isPending ||
                homeroomCandidates.length === 0
              }
            >
              {createClass.isPending ? he.loading : he.addClass}
            </button>
          </form>
          {createClass.isError && (
            <p className="error">
              {translateApiError((createClass.error as Error).message)}
            </p>
          )}
          {createClass.isSuccess && (
            <p style={{ color: '#2563EB' }}>{he.classCreatedOk}</p>
          )}
        </div>
      )}
      <div className="card" style={{ marginTop: '1rem' }}>
        {isLoading && <Skeleton className="h-8 w-full mb-2" />}
        {classesError && (
          <p className="error">
            {translateApiError((classesQueryError as Error).message) ||
              he.classesListError}
          </p>
        )}
        {!isLoading && !classesError && sortedClasses.length === 0 && (
          <p>{he.noClassesInSchool}</p>
        )}
        {updateClass.isError && (
          <p className="error">
            {translateApiError((updateClass.error as Error).message)}
          </p>
        )}
        <table style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>{he.className}</th>
              <th>{he.yearGregorian}</th>
              <th>{he.yearHebrew}</th>
              <th>{he.homeroomCol}</th>
              <th>{he.classCertProfile}</th>
              <th>{he.groupsCol}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedClasses.map((c) => {
              const isEditing = editingClassId === c.id;
              return (
              <tr key={c.id}>
                <td>
                  {isEditing ? (
                    <input
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      required
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(Number(e.target.value))}
                    />
                  ) : (
                    c.year
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      value={editYearHebrew}
                      onChange={(e) => setEditYearHebrew(e.target.value)}
                    />
                  ) : (
                    c.yearHebrew ?? '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      value={editHomeroomId}
                      onChange={(e) => setEditHomeroomId(e.target.value)}
                    >
                      <option value="">{he.noHomeroom}</option>
                      {homeroomCandidates.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    c.homeroomTeacher?.name ?? '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      value={editCertProfileId}
                      onChange={(e) => setEditCertProfileId(e.target.value)}
                    >
                      <option value="">{he.classCertProfileDefault}</option>
                      {certProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatCertificateProfileLabel(p)}
                        </option>
                      ))}
                    </select>
                  ) : c.certificateProfileId ? (
                    certProfileLabel(c.certificateProfileId)
                  ) : (
                    <span
                      title={he.certClassMissingProfileHint}
                      style={{
                        display: 'inline-block',
                        background: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'help',
                      }}
                    >
                      {he.certClassMissingProfile}
                    </span>
                  )}
                </td>
                <td>
                  {!isEditing && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setExpandedClassId(expandedClassId === c.id ? null : c.id)
                      }
                    >
                      {he.manageGroups} ({c.groups?.length ?? 0})
                    </button>
                  )}
                </td>
                <td>
                  <RowActions
                    isEditing={isEditing}
                    onEdit={() => startEditClass(c)}
                    onSave={() =>
                      updateClass.mutate({
                        id: c.id,
                        name: editClassName.trim(),
                        year: editYear,
                        yearHebrew: editYearHebrew.trim() || null,
                        homeroomTeacherId: editHomeroomId || null,
                        certificateProfileId: editCertProfileId || null,
                      })
                    }
                    onCancel={() => setEditingClassId(null)}
                    onDelete={() => deleteClass.mutate(c.id)}
                    saveDisabled={!editClassName.trim()}
                  />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>

        {expandedClassId && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>{he.classGroupsTitle}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.classGroupsHint}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newGroupName.trim() && newGroupSubjectId) {
                  addGroup.mutate({
                    classId: expandedClassId,
                    name: newGroupName.trim(),
                    subjectId: newGroupSubjectId,
                  });
                }
              }}
            >
              <label>
                {he.groupSubjectLabel}
                <select
                  value={newGroupSubjectId}
                  onChange={(e) => setNewGroupSubjectId(e.target.value)}
                  required
                >
                  <option value="">{he.selectPlaceholder}</option>
                  {sortHebrew(subjects, (s) => s.name).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={he.groupNamePlaceholder}
                style={{ marginTop: '0.5rem' }}
              />
              <button
                type="submit"
                style={{ marginTop: '0.5rem' }}
                disabled={!newGroupSubjectId}
              >
                {he.addGroup}
              </button>
            </form>
            {addGroup.isError && (
              <p className="error">{translateApiError((addGroup.error as Error).message)}</p>
            )}
            <ul>
              {(
                sortedClasses.find((x) => x.id === expandedClassId)?.groups ?? []
              ).map((g) => (
                <li key={g.id} style={{ marginTop: '0.35rem' }}>
                  {editingGroupId === g.id ? (
                    <input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                    />
                  ) : (
                    <>
                      {g.name}
                      {g.subject?.name ? (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {' '}
                          ({g.subject.name})
                        </span>
                      ) : null}
                    </>
                  )}{' '}
                  <RowActions
                    isEditing={editingGroupId === g.id}
                    onEdit={() => {
                      setEditingGroupId(g.id);
                      setEditGroupName(g.name);
                    }}
                    onSave={() =>
                      updateGroup.mutate({
                        classId: expandedClassId,
                        id: g.id,
                        name: editGroupName.trim(),
                      })
                    }
                    onCancel={() => setEditingGroupId(null)}
                    onDelete={() =>
                      deleteGroup.mutate({ classId: expandedClassId, id: g.id })
                    }
                    saveDisabled={!editGroupName.trim()}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
