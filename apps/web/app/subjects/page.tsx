'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RowActions } from '@/components/RowActions';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { sortHebrew } from '@/lib/sort';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type GradingSetType = { id: string; key: string; label: string };
type Subject = {
  id: string;
  name: string;
  gradingSetTypeId: string;
  gradingSetType: GradingSetType;
};

export default function SubjectsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiFetch<Subject[]>('/subjects'),
  });
  const { data: types = [] } = useQuery({
    queryKey: ['grading-set-types'],
    queryFn: () => apiFetch<GradingSetType[]>('/grading-set-types'),
  });

  const [name, setName] = useState('');
  const [gradingSetTypeId, setGradingSetTypeId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTypeId, setEditTypeId] = useState('');

  const sortedTypes = useMemo(() => sortHebrew(types, (t) => t.label), [types]);

  const subjectsByCategory = useMemo(() => {
    const map = new Map<string, { type: GradingSetType; subjects: Subject[] }>();
    for (const t of sortedTypes) {
      map.set(t.id, { type: t, subjects: [] });
    }
    for (const s of subjects) {
      const entry = map.get(s.gradingSetTypeId);
      if (entry) {
        entry.subjects.push(s);
      }
    }
    for (const [, entry] of map) {
      entry.subjects = sortHebrew(entry.subjects, (x) => x.name);
    }
    return [...map.values()];
  }, [subjects, sortedTypes]);

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name, gradingSetTypeId }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subjects'] });
      setName('');
      toast(he.toastCreated, 'success');
    },
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; name: string; gradingSetTypeId: string }) =>
      apiFetch(`/subjects/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          gradingSetTypeId: payload.gradingSetTypeId,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subjects'] });
      setEditingId(null);
      toast(he.toastSaved, 'success');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/subjects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['subjects'] });
      toast(he.toastDeleted, 'success');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <AppShell>
      <PageHeader title={he.subjectsTitle} description={he.subjectsHint} />
      <Card className="mb-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>{he.subjectName}</Label>
            <Input
              placeholder={he.subjectName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{he.selectSubjectCategory}</Label>
            <Select
              value={gradingSetTypeId}
              onChange={(e) => setGradingSetTypeId(e.target.value)}
              required
            >
              <option value="">{he.selectSubjectCategory}</option>
              {sortedTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={!gradingSetTypeId}>
            {he.addSubject}
          </Button>
        </form>
      </Card>

      <p className="mb-4 text-sm text-text-muted">{he.subjectsGroupedHint}</p>
      <div className="space-y-4">
      {isLoading && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-elevation1">
          <table className="w-full border-collapse text-sm">
            <tbody><SkeletonTableRows rows={5} cols={2} /></tbody>
          </table>
        </div>
      )}
      {!isLoading && subjectsByCategory.map(({ type, subjects: list }) => (
        <Card key={type.id}>
          <h3 className="mb-3 mt-0 text-lg font-semibold text-text">{type.label}</h3>
          {list.length === 0 ? (
            <p className="text-text-muted">{he.noSubjectsInCategory}</p>
          ) : (
            <DataTable compact>
              <thead>
                <tr>
                  <th>{he.name}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const isEditing = editingId === s.id;
                  return (
                  <tr key={s.id}>
                    <td>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                      ) : (
                        s.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Select
                          value={editTypeId}
                          onChange={(e) => setEditTypeId(e.target.value)}
                        >
                          {sortedTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                      <RowActions
                        isEditing={isEditing}
                        onEdit={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                          setEditTypeId(s.gradingSetTypeId);
                        }}
                        onSave={() =>
                          update.mutate({
                            id: s.id,
                            name: editName.trim(),
                            gradingSetTypeId: editTypeId,
                          })
                        }
                        onCancel={() => setEditingId(null)}
                        onDelete={() => remove.mutate(s.id)}
                        saveDisabled={!editName.trim() || !editTypeId}
                      />
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </DataTable>
          )}
        </Card>
      ))}
      </div>
    </AppShell>
  );
}
