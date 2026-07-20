'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Role } from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { RowActions } from '@/components/RowActions';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { groupSubjectId, groupsForSubjectInClass } from '@/lib/class-group';
import { sortHebrew } from '@/lib/sort';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type CategoryRef = { id: string; label: string };
type SubjectRef = {
  id: string;
  name: string;
  gradingSetType?: CategoryRef;
  gradingSetTypeId?: string;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  subjects: SubjectRef[];
  homeroomClassLabels: string[];
};

function subjectsByCategory(types: CategoryRef[], subjects: SubjectRef[]) {
  const map = new Map<string, { category: CategoryRef; subjects: SubjectRef[] }>();
  for (const t of types) {
    map.set(t.id, { category: t, subjects: [] });
  }
  for (const s of subjects) {
    const typeId = s.gradingSetType?.id ?? s.gradingSetTypeId;
    if (!typeId) continue;
    const entry = map.get(typeId);
    if (entry) {
      entry.subjects.push(s);
    }
  }
  for (const [, entry] of map) {
    entry.subjects = sortHebrew(entry.subjects, (x) => x.name);
  }
  return [...map.values()].filter((x) => x.subjects.length > 0);
}

function SubjectCheckboxes({
  sections,
  selectedIds,
  onToggle,
}: {
  sections: { category: CategoryRef; subjects: SubjectRef[] }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {sections.map(({ category, subjects }) => (
        <div key={category.id} style={{ marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.9rem' }}>{category.label}</strong>
          {subjects.map((s) => (
            <label key={s.id} style={{ display: 'block', marginBottom: '0.25rem' }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(s.id)}
                onChange={() => onToggle(s.id)}
              />{' '}
              {s.name}
            </label>
          ))}
        </div>
      ))}
    </>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserRow[]>('/users'),
  });
  const { data: types = [] } = useQuery({
    queryKey: ['grading-set-types'],
    queryFn: () => apiFetch<CategoryRef[]>('/grading-set-types'),
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiFetch<SubjectRef[]>('/subjects'),
  });

  const sortedTypes = useMemo(() => sortHebrew(types, (t) => t.label), [types]);
  const subjectSections = useMemo(
    () => subjectsByCategory(sortedTypes, subjects),
    [sortedTypes, subjects],
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('TempPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(Role.HomeroomTeacher);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const admins = useMemo(
    () => sortHebrew(users.filter((u) => u.role === Role.Admin), (u) => u.name),
    [users],
  );
  const homeroomTeachers = useMemo(
    () =>
      sortHebrew(
        users.filter((u) => u.role === Role.HomeroomTeacher),
        (u) => u.name,
      ),
    [users],
  );

  const subjectTeachersByCategory = useMemo(() => {
    const subjectTeachers = users.filter((u) => u.role === Role.SubjectTeacher);
    const map = new Map<string, { category: CategoryRef; teachers: UserRow[] }>();
    for (const t of sortedTypes) {
      map.set(t.id, { category: t, teachers: [] });
    }
    const unassigned: UserRow[] = [];
    for (const teacher of subjectTeachers) {
      if (!teacher.subjects.length) {
        unassigned.push(teacher);
        continue;
      }
      const seen = new Set<string>();
      for (const sub of teacher.subjects) {
        const typeId = sub.gradingSetType?.id;
        if (!typeId || seen.has(typeId)) continue;
        seen.add(typeId);
        const entry = map.get(typeId);
        if (entry && !entry.teachers.some((x) => x.id === teacher.id)) {
          entry.teachers.push(teacher);
        }
      }
    }
    for (const [, entry] of map) {
      entry.teachers = sortHebrew(entry.teachers, (t) => t.name);
    }
    return {
      sections: [...map.values()].filter((x) => x.teachers.length > 0),
      unassigned: sortHebrew(unassigned, (t) => t.name),
    };
  }, [users, sortedTypes]);

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          subjectIds: role === Role.SubjectTeacher ? subjectIds : undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setName('');
      setEmail('');
      setSubjectIds([]);
    },
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<Role>(Role.HomeroomTeacher);
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([]);

  const startEditUser = (u: UserRow) => {
    setEditingUserId(u.id);
    setEditUserName(u.name);
    setEditUserPassword('');
    setEditUserRole(u.role as Role);
    setEditSubjectIds(u.subjects.map((s) => s.id));
  };

  const updateUser = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        name: editUserName.trim(),
        role: editUserRole,
      };
      if (editUserPassword.trim()) {
        body.password = editUserPassword.trim();
      }
      if (editUserRole === Role.SubjectTeacher) {
        body.subjectIds = editSubjectIds;
      }
      return apiFetch(`/users/${editingUserId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setEditUserPassword('');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const toggleEditSubject = (id: string) => {
    setEditSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <AppShell>
      <h1>{he.usersTitle}</h1>
      <p style={{ fontSize: '0.9rem', color: '#475569' }}>{he.usersGroupedHint}</p>

      <div className="card">
        <h2>{he.createUser}</h2>
        <form
          className="max-w-sm space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-text">{he.name}</label>
            <input
              placeholder={he.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">{he.email}</label>
            <input
              type="email"
              placeholder={he.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">{he.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={he.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 left-2 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">{he.role ?? 'תפקיד'}</label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role);
                setSubjectIds([]);
              }}
            >
              <option value={Role.Admin}>{he.roleAdmin}</option>
              <option value={Role.HomeroomTeacher}>{he.roleHomeroom}</option>
              <option value={Role.SubjectTeacher}>{he.roleSubject}</option>
            </select>
          </div>
          {role === Role.SubjectTeacher && (
            <div>
              <p className="mb-2 text-xs text-text-muted">{he.subjectTeacherPickSubjects}</p>
              {subjectSections.length === 0 ? (
                <p className="error">{he.subjectTeacherNeedSubjects}</p>
              ) : (
                <SubjectCheckboxes
                  sections={subjectSections}
                  selectedIds={subjectIds}
                  onToggle={toggleSubject}
                />
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={
              role === Role.SubjectTeacher &&
              (subjectIds.length === 0 || subjectSections.length === 0)
            }
          >
            {he.createUser}
          </button>
        </form>
        {create.isError && (
          <p className="error">{translateApiError((create.error as Error).message)}</p>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {isLoading && <Skeleton className="h-8 w-full mb-2" />}
        {error && (
          <p className="error">{translateApiError((error as Error).message)}</p>
        )}
        {updateUser.isError && (
          <p className="error">
            {translateApiError((updateUser.error as Error).message)}
          </p>
        )}

        <div className="card" style={{ marginTop: '0.75rem' }}>
          <h3>{he.roleAdmin}</h3>
          {admins.length === 0 ? (
            <p>{he.noUsersInRole}</p>
          ) : (
            <UserTable
              users={admins}
              editingUserId={editingUserId}
              editUserName={editUserName}
              editUserPassword={editUserPassword}
              onEditUserName={setEditUserName}
              onEditUserPassword={setEditUserPassword}
              onStartEdit={startEditUser}
              onCancelEdit={() => setEditingUserId(null)}
              onSaveEdit={() => updateUser.mutate()}
              onDelete={(id) => remove.mutate(id)}
            />
          )}
        </div>

        <div className="card" style={{ marginTop: '0.75rem' }}>
          <h3>{he.roleHomeroom}</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.homeroomListHint}</p>
          {homeroomTeachers.length === 0 ? (
            <p>{he.noUsersInRole}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{he.name}</th>
                  <th>{he.email}</th>
                  <th>{he.homeroomClassCol}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {homeroomTeachers.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    extraCol={
                      u.homeroomClassLabels.length
                        ? u.homeroomClassLabels.join(' · ')
                        : '—'
                    }
                    editingUserId={editingUserId}
                    editUserName={editUserName}
                    editUserPassword={editUserPassword}
                    onEditUserName={setEditUserName}
                    onEditUserPassword={setEditUserPassword}
                    onStartEdit={startEditUser}
                    onCancelEdit={() => setEditingUserId(null)}
                    onSaveEdit={() => updateUser.mutate()}
                    onDelete={() => remove.mutate(u.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ marginTop: '0.75rem' }}>
          <h3>{he.subjectTeachersByCategory}</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.subjectTeachersListHint}</p>
          {subjectTeachersByCategory.sections.map(({ category, teachers }) => (
            <div key={category.id} style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0.5rem 0' }}>{category.label}</h4>
              <table>
                <thead>
                  <tr>
                    <th>{he.name}</th>
                    <th>{he.email}</th>
                    <th>{he.teacherSubjectsCol}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      extraCol={
                        editingUserId === u.id ? (
                          <SubjectCheckboxes
                            sections={subjectSections}
                            selectedIds={editSubjectIds}
                            onToggle={toggleEditSubject}
                          />
                        ) : (
                          sortHebrew(u.subjects, (s) => s.name)
                            .map((s) => s.name)
                            .join(' · ')
                        )
                      }
                      editingUserId={editingUserId}
                      editUserName={editUserName}
                      editUserPassword={editUserPassword}
                      onEditUserName={setEditUserName}
                      onEditUserPassword={setEditUserPassword}
                      onStartEdit={startEditUser}
                      onCancelEdit={() => setEditingUserId(null)}
                      onSaveEdit={() => updateUser.mutate()}
                      onDelete={() => remove.mutate(u.id)}
                      saveDisabled={
                        u.role === Role.SubjectTeacher &&
                        editingUserId === u.id &&
                        editSubjectIds.length === 0
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {subjectTeachersByCategory.unassigned.length > 0 && (
            <div>
              <h4>{he.noSubjectsAssigned}</h4>
              <table>
                <thead>
                  <tr>
                    <th>{he.name}</th>
                    <th>{he.email}</th>
                    <th>{he.teacherSubjectsCol}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {subjectTeachersByCategory.unassigned.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      extraCol={
                        editingUserId === u.id ? (
                          <SubjectCheckboxes
                            sections={subjectSections}
                            selectedIds={editSubjectIds}
                            onToggle={toggleEditSubject}
                          />
                        ) : (
                          '—'
                        )
                      }
                      editingUserId={editingUserId}
                      editUserName={editUserName}
                      editUserPassword={editUserPassword}
                      onEditUserName={setEditUserName}
                      onEditUserPassword={setEditUserPassword}
                      onStartEdit={startEditUser}
                      onCancelEdit={() => setEditingUserId(null)}
                      onSaveEdit={() => updateUser.mutate()}
                      onDelete={() => remove.mutate(u.id)}
                      saveDisabled={
                        editingUserId === u.id && editSubjectIds.length === 0
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <TeacherAssignmentsSection users={users} />
      </div>
    </AppShell>
  );
}

function TeacherAssignmentsSection({ users }: { users: UserRow[] }) {
  const qc = useQueryClient();
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () =>
      apiFetch<
        {
          id: string;
          name: string;
          year: number;
          yearHebrew: string | null;
          groups?: {
            id: string;
            name: string;
            subjectId?: string | null;
            subject?: { id: string; name: string } | null;
          }[];
        }[]
      >('/classes'),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () =>
      apiFetch<
        {
          id: string;
          user: { name: string };
          subject: { name: string };
          class: {
            id: string;
            name: string;
            year: number;
            yearHebrew: string | null;
          };
          classGroup: { id: string; name: string } | null;
        }[]
      >('/teacher-assignments'),
  });

  const subjectTeachers = sortHebrew(
    users.filter((u) => u.role === Role.SubjectTeacher),
    (u) => u.name,
  );
  const [userId, setUserId] = useState('');
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [classId, setClassId] = useState('');
  /** Per-subject optional class group when the class has groups */
  const [groupBySubjectId, setGroupBySubjectId] = useState<Record<string, string>>(
    {},
  );

  const selectedTeacher = subjectTeachers.find((u) => u.id === userId);
  const teacherSubjects = useMemo(
    () => (selectedTeacher ? sortHebrew(selectedTeacher.subjects, (s) => s.name) : []),
    [selectedTeacher],
  );

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        setGroupBySubjectId((g) => {
          const copy = { ...g };
          delete copy[id];
          return copy;
        });
        return next;
      }
      return [...prev, id];
    });
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/teacher-assignments', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          classId,
          items: subjectIds.map((subjectId) => ({
            subjectId,
            classGroupId: groupBySubjectId[subjectId] || null,
          })),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] });
      setSubjectIds([]);
      setGroupBySubjectId({});
    },
  });

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editAssignmentClassId, setEditAssignmentClassId] = useState('');
  const [editAssignmentGroupId, setEditAssignmentGroupId] = useState('');

  const updateAssignment = useMutation({
    mutationFn: () =>
      apiFetch(`/teacher-assignments/${editingAssignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          classId: editAssignmentClassId,
          classGroupId: editAssignmentGroupId || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] });
      setEditingAssignmentId(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/teacher-assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-assignments'] }),
  });

  const classLabel = (c: { name: string; year: number; yearHebrew: string | null }) =>
    `${c.name} · ${c.year}${c.yearHebrew ? ` (${c.yearHebrew})` : ''}`;

  const selectedClass = classes.find((c) => c.id === classId);

  const groupsForSubject = (subjectId: string) =>
    groupsForSubjectInClass(selectedClass?.groups, subjectId);

  const unlinkedGroups = (selectedClass?.groups ?? []).filter(
    (g) => !groupSubjectId(g),
  );

  const groupsBySubjectPreview = useMemo(() => {
    if (!selectedClass?.groups?.length) return [];
    const map = new Map<string, string[]>();
    for (const g of selectedClass.groups) {
      const sid = groupSubjectId(g);
      if (!sid) continue;
      const name = g.subject?.name ?? sid;
      const list = map.get(name) ?? [];
      list.push(g.name);
      map.set(name, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'));
  }, [selectedClass]);

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <h3>{he.teacherAssignmentsTitle}</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.teacherAssignmentsHint}</p>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.assignmentPerSubjectGroupHint}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label>
          {he.assignmentTeacher}
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setSubjectIds([]);
            }}
            required
          >
            <option value="" />
            {subjectTeachers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {he.assignmentClass}
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setGroupBySubjectId({});
            }}
            required
          >
            <option value="" />
            {sortHebrew(classes, (c) => c.name).map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
              </option>
            ))}
          </select>
        </label>
        {classes.length === 0 && (
          <p className="error">{he.assignmentNeedClass}</p>
        )}
        {classId && groupsBySubjectPreview.length > 0 && (
          <div
            style={{
              marginBottom: '0.75rem',
              padding: '0.5rem',
              background: '#f1f5f9',
              borderRadius: 6,
              fontSize: '0.85rem',
            }}
          >
            <strong>{he.assignmentGroupsInClassTitle}</strong>
            <ul style={{ margin: '0.35rem 0 0', paddingRight: '1.25rem' }}>
              {groupsBySubjectPreview.map(([subjectName, names]) => (
                <li key={subjectName}>
                  {subjectName}: {names.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {classId && unlinkedGroups.length > 0 && (
          <p className="error">{he.assignmentUnlinkedGroups}</p>
        )}
        {selectedTeacher && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem' }}>
              {he.assignmentPickTeacherSubjects}
            </p>
            {!classId && (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {he.assignmentPickClassFirst}
              </p>
            )}
            {teacherSubjects.length === 0 ? (
              <p className="error">{he.assignmentNoTeacherSubjects}</p>
            ) : (
              teacherSubjects.map((s) => {
                const checked = subjectIds.includes(s.id);
                const subjectGroups = groupsForSubject(s.id);
                const hasGroups = subjectGroups.length > 0;
                const showGroupPicker = checked && hasGroups;
                return (
                  <div
                    key={s.id}
                    style={{
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      borderBottom: '1px solid #e2e8f0',
                      background: showGroupPicker ? '#f0fdf4' : undefined,
                      borderRadius: showGroupPicker ? 6 : 0,
                    }}
                  >
                    <label style={{ display: 'block' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!classId}
                        onChange={() => toggleSubject(s.id)}
                      />{' '}
                      {s.name}
                    </label>
                    {checked && classId && !hasGroups && (
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                        {he.assignmentNoGroupsForSubject(s.name)}
                      </p>
                    )}
                    {showGroupPicker && (
                      <label
                        style={{
                          display: 'block',
                          marginTop: '0.5rem',
                          marginRight: '1.25rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      >
                        {he.assignmentGroupForSubject(s.name)}
                        <select
                          value={groupBySubjectId[s.id] ?? ''}
                          onChange={(e) =>
                            setGroupBySubjectId((g) => ({
                              ...g,
                              [s.id]: e.target.value,
                            }))
                          }
                          required
                          style={{ display: 'block', marginTop: '0.25rem', minWidth: 200 }}
                        >
                          <option value="">{he.selectPlaceholder}</option>
                          {subjectGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {!groupBySubjectId[s.id] && (
                          <span style={{ color: '#b91c1c', fontSize: '0.8rem' }}>
                            {he.assignmentPickGroupRequired}
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={
            create.isPending ||
            subjectIds.length === 0 ||
            !classId ||
            !userId ||
            subjectIds.some(
              (sid) =>
                groupsForSubject(sid).length > 0 && !groupBySubjectId[sid],
            )
          }
        >
          {he.addAssignment}
        </button>
      </form>
      {create.isError && (
        <p className="error">{translateApiError((create.error as Error).message)}</p>
      )}
      <h4 style={{ marginTop: '1rem' }}>{he.assignmentsList}</h4>
      {assignments.length === 0 ? (
        <p style={{ color: '#64748b' }}>—</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{he.assignmentTeacher}</th>
              <th>{he.assignmentSubject}</th>
              <th>{he.assignmentClass}</th>
              <th>{he.assignmentGroup}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const isEditing = editingAssignmentId === a.id;
              const editClass = classes.find((c) => c.id === editAssignmentClassId);
              return (
              <tr key={a.id}>
                <td>{a.user.name}</td>
                <td>{a.subject.name}</td>
                <td>
                  {isEditing ? (
                    <select
                      value={editAssignmentClassId}
                      onChange={(e) => {
                        setEditAssignmentClassId(e.target.value);
                        setEditAssignmentGroupId('');
                      }}
                    >
                      {sortHebrew(classes, (c) => c.name).map((c) => (
                        <option key={c.id} value={c.id}>
                          {classLabel(c)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    classLabel(a.class)
                  )}
                </td>
                <td>
                  {isEditing ? (
                    (editClass?.groups?.length ?? 0) > 0 ? (
                      <select
                        value={editAssignmentGroupId}
                        onChange={(e) => setEditAssignmentGroupId(e.target.value)}
                      >
                        <option value="">{he.assignmentWholeClass}</option>
                        {editClass!.groups!.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      he.assignmentWholeClass
                    )
                  ) : (
                    a.classGroup?.name ?? he.assignmentWholeClass
                  )}
                </td>
                <td>
                  <RowActions
                    isEditing={isEditing}
                    onEdit={() => {
                      setEditingAssignmentId(a.id);
                      setEditAssignmentClassId(a.class.id);
                      setEditAssignmentGroupId(a.classGroup?.id ?? '');
                    }}
                    onSave={() => updateAssignment.mutate()}
                    onCancel={() => setEditingAssignmentId(null)}
                    onDelete={() => remove.mutate(a.id)}
                    saveDisabled={!editAssignmentClassId}
                  />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

type UserEditProps = {
  editingUserId: string | null;
  editUserName: string;
  editUserPassword: string;
  onEditUserName: (v: string) => void;
  onEditUserPassword: (v: string) => void;
  onStartEdit: (u: UserRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
  saveDisabled?: boolean;
};

function UserRow({
  user,
  extraCol,
  editingUserId,
  editUserName,
  editUserPassword,
  onEditUserName,
  onEditUserPassword,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  saveDisabled,
}: {
  user: UserRow;
  extraCol?: ReactNode;
} & UserEditProps) {
  const isEditing = editingUserId === user.id;
  const [showEditPassword, setShowEditPassword] = useState(false);
  return (
    <tr>
      <td>
        {isEditing ? (
          <>
            <input
              value={editUserName}
              onChange={(e) => onEditUserName(e.target.value)}
              required
            />
            <div className="relative" style={{ marginTop: '0.25rem' }}>
              <input
                type={showEditPassword ? 'text' : 'password'}
                placeholder={he.passwordLeaveBlank}
                value={editUserPassword}
                onChange={(e) => onEditUserPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowEditPassword((v) => !v)}
                className="absolute inset-y-0 left-2 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </>
        ) : (
          user.name
        )}
      </td>
      <td>{user.email}</td>
      {extraCol !== undefined && <td>{extraCol}</td>}
      <td>
        <RowActions
          isEditing={isEditing}
          onEdit={() => onStartEdit(user)}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onDelete={() => onDelete(user.id)}
          saveDisabled={saveDisabled ?? !editUserName.trim()}
        />
      </td>
    </tr>
  );
}

function UserTable({
  users,
  editingUserId,
  editUserName,
  editUserPassword,
  onEditUserName,
  onEditUserPassword,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: { users: UserRow[] } & UserEditProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>{he.name}</th>
          <th>{he.email}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            editingUserId={editingUserId}
            editUserName={editUserName}
            editUserPassword={editUserPassword}
            onEditUserName={onEditUserName}
            onEditUserPassword={onEditUserPassword}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onDelete={() => onDelete(u.id)}
          />
        ))}
      </tbody>
    </table>
  );
}
