'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RowActions } from '@/components/RowActions';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';

type Value = { id: string; label: string; order: number };
type GradingSetType = { id: string; key: string; label: string; parentId?: string | null };
type GradingSet = {
  id: string;
  name: string;
  gradingSetTypeId: string;
  gradingSetType: GradingSetType;
  values: Value[];
};

export default function GradingSetsPage() {
  const qc = useQueryClient();
  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ['grading-set-types'],
    queryFn: () => apiFetch<GradingSetType[]>('/grading-set-types'),
  });
  const { data: sets = [], isLoading, error } = useQuery({
    queryKey: ['grading-sets'],
    queryFn: () => apiFetch<GradingSet[]>('/grading-sets'),
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () =>
      apiFetch<{ id: string; gradingSetTypeId: string }[]>('/subjects'),
  });

  const subjectCountByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subjects) {
      map.set(s.gradingSetTypeId, (map.get(s.gradingSetTypeId) ?? 0) + 1);
    }
    return map;
  }, [subjects]);

  const [typeLabel, setTypeLabel] = useState('');
  const [newTypeParentId, setNewTypeParentId] = useState('');
  const [newLabels, setNewLabels] = useState<Record<string, string>>({});
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeLabel, setEditTypeLabel] = useState('');
  const [editingValueKey, setEditingValueKey] = useState<string | null>(null);
  const [editValueLabel, setEditValueLabel] = useState('');

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.label.localeCompare(b.label, 'he')),
    [types],
  );

  const displayTypes = useMemo(() => {
    const roots = sortedTypes.filter((t) => !t.parentId);
    const rows: Array<GradingSetType & { depth: number }> = [];
    const visit = (type: GradingSetType, depth: number) => {
      rows.push({ ...type, depth });
      for (const child of sortedTypes.filter((c) => c.parentId === type.id)) {
        visit(child, depth + 1);
      }
    };
    for (const root of roots) visit(root, 0);
    for (const t of sortedTypes) {
      if (!rows.some((r) => r.id === t.id)) {
        rows.push({ ...t, depth: 0 });
      }
    }
    return rows;
  }, [sortedTypes]);

  const setsByType = useMemo(() => {
    const map = new Map<string, GradingSet[]>();
    for (const t of sortedTypes) {
      map.set(t.id, []);
    }
    for (const s of sets) {
      const list = map.get(s.gradingSetTypeId);
      if (list) {
        list.push(s);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
    return map;
  }, [sets, sortedTypes]);

  const createType = useMutation({
    mutationFn: () =>
      apiFetch<GradingSetType>('/grading-set-types', {
        method: 'POST',
        body: JSON.stringify({
          label: typeLabel,
          ...(newTypeParentId ? { parentId: newTypeParentId } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-set-types'] });
      setTypeLabel('');
      setNewTypeParentId('');
    },
  });

  const updateType = useMutation({
    mutationFn: ({ id, label: lbl }: { id: string; label: string }) =>
      apiFetch(`/grading-set-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: lbl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-set-types'] });
      setEditingTypeId(null);
    },
  });

  const deleteType = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/grading-set-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-set-types'] });
      qc.invalidateQueries({ queryKey: ['grading-sets'] });
    },
  });

  const deleteSet = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/grading-sets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-sets'] });
    },
  });

  const addLabelForCategory = useMutation({
    mutationFn: async ({
      typeId,
      typeLabel: tLabel,
      label,
      existingSetId,
    }: {
      typeId: string;
      typeLabel: string;
      label: string;
      existingSetId?: string;
    }) => {
      let setId = existingSetId;
      if (!setId) {
        const created = await apiFetch<GradingSet>('/grading-sets', {
          method: 'POST',
          body: JSON.stringify({ name: tLabel, gradingSetTypeId: typeId }),
        });
        setId = created.id;
      }
      return apiFetch(`/grading-sets/${setId}/values`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['grading-sets'] });
      setNewLabels((prev) => ({ ...prev, [vars.typeId]: '' }));
    },
  });

  const updateValue = useMutation({
    mutationFn: ({ setId, valueId, label: lbl }: { setId: string; valueId: string; label: string }) =>
      apiFetch(`/grading-sets/${setId}/values/${valueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: lbl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grading-sets'] });
      setEditingValueKey(null);
    },
  });

  const deleteValue = useMutation({
    mutationFn: ({ setId, valueId }: { setId: string; valueId: string }) =>
      apiFetch(`/grading-sets/${setId}/values/${valueId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grading-sets'] }),
  });

  return (
    <AppShell>
      <PageHeader title={he.gradingSetsTitle} description={he.gradingSetsClarify} />

      <Card className="mb-6 max-w-lg">
        <h3 className="mb-1 mt-0 text-base font-semibold text-text">{he.gradingTypesTitle}</h3>
        <p className="mb-4 text-sm text-text-muted">{he.gradingTypesHint}</p>
        {typesLoading && <p className="text-sm text-text-muted">{he.loading}</p>}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createType.mutate();
          }}
        >
          <div>
            <Label>{he.gradingTypeName}</Label>
            <Input
              placeholder={he.gradingTypeName}
              value={typeLabel}
              onChange={(e) => setTypeLabel(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{he.gradingTypeParent}</Label>
            <Select
              value={newTypeParentId}
              onChange={(e) => setNewTypeParentId(e.target.value)}
            >
              <option value="">{he.gradingTypeParentNone}</option>
              {sortedTypes
                .filter((t) => !t.parentId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </Select>
          </div>
          <Button type="submit" disabled={!typeLabel.trim()}>
            {he.addGradingType}
          </Button>
        </form>
        {createType.isError && (
          <p className="mt-2 text-sm text-danger">
            {translateApiError((createType.error as Error).message)}
          </p>
        )}
      </Card>

      {error && (
        <p className="mb-4 text-sm text-danger">
          {translateApiError((error as Error).message)}
        </p>
      )}
      {!typesLoading && sortedTypes.length === 0 && (
        <p className="mb-4 text-sm text-danger">{he.gradingTypesEmpty}</p>
      )}

      <p className="mb-4 text-sm text-text-muted">{he.setsByCategoryTitle}</p>
      <div className="max-w-lg space-y-4">
        {isLoading && (
          <Card>
            <p className="text-sm text-text-muted">{he.loading}</p>
          </Card>
        )}
        {!isLoading &&
          displayTypes.map((t) => {
            const typeSets = setsByType.get(t.id) ?? [];
            const primarySet = typeSets[0];
            const extraSets = typeSets.slice(1);
            const draft = newLabels[t.id] ?? '';
            const values = primarySet?.values ?? [];
            const linkedSubjects = subjectCountByType.get(t.id) ?? 0;
            const allValuesCount = typeSets.reduce((n, s) => n + s.values.length, 0);

            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editingTypeId === t.id ? (
                      <Input
                        value={editTypeLabel}
                        onChange={(e) => setEditTypeLabel(e.target.value)}
                      />
                    ) : (
                      <>
                        <h3
                          className="mt-0 text-base font-semibold text-text"
                          style={{ paddingRight: `${t.depth * 1.25}rem` }}
                        >
                          {t.depth > 0 ? `${he.gradingTypeSubCategory}: ` : ''}
                          {t.label}
                        </h3>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {he.categorySubjectsLinked(linkedSubjects)}
                        </p>
                      </>
                    )}
                  </div>
                  <RowActions
                    isEditing={editingTypeId === t.id}
                    onEdit={() => {
                      setEditingTypeId(t.id);
                      setEditTypeLabel(t.label);
                    }}
                    onSave={() => updateType.mutate({ id: t.id, label: editTypeLabel.trim() })}
                    onCancel={() => setEditingTypeId(null)}
                    onDelete={() => deleteType.mutate(t.id)}
                    saveDisabled={!editTypeLabel.trim()}
                  />
                </div>

                {linkedSubjects > 0 && allValuesCount === 0 && (
                  <p className="mt-2 text-sm text-warning">
                    {he.categoryEmptyGradesWarning(linkedSubjects)}
                  </p>
                )}

                {extraSets.length > 0 && (
                  <p className="mt-2 text-sm text-danger">{he.duplicateGradingSetsWarning}</p>
                )}

                {extraSets.map((s) => (
                  <div key={s.id} className="mt-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-text-muted">
                      רשימה כפולה: {s.values.map((v) => v.label).join(', ') || '—'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => deleteSet.mutate(s.id)}
                    >
                      {he.delete}
                    </Button>
                  </div>
                ))}

                <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {he.gradesInCategory}
                </h4>

                {values.length === 0 ? (
                  <p className="text-sm text-text-muted">{he.noGradesInCategory}</p>
                ) : (
                  <DataTable compact>
                    <thead>
                      <tr>
                        <th>{he.name}</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {values.map((v) => {
                        const setId = primarySet!.id;
                        const valueKey = `${setId}:${v.id}`;
                        const isEditing = editingValueKey === valueKey;
                        return (
                          <tr key={v.id}>
                            <td>
                              {isEditing ? (
                                <Input
                                  value={editValueLabel}
                                  onChange={(e) => setEditValueLabel(e.target.value)}
                                />
                              ) : (
                                v.label
                              )}
                            </td>
                            <td>
                              <RowActions
                                isEditing={isEditing}
                                onEdit={() => {
                                  setEditingValueKey(valueKey);
                                  setEditValueLabel(v.label);
                                }}
                                onSave={() =>
                                  updateValue.mutate({
                                    setId,
                                    valueId: v.id,
                                    label: editValueLabel.trim(),
                                  })
                                }
                                onCancel={() => setEditingValueKey(null)}
                                onDelete={() => deleteValue.mutate({ setId, valueId: v.id })}
                                saveDisabled={!editValueLabel.trim()}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                )}

                <form
                  className="mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const lbl = draft.trim();
                    if (!lbl) return;
                    addLabelForCategory.mutate({
                      typeId: t.id,
                      typeLabel: t.label,
                      label: lbl,
                      existingSetId: primarySet?.id,
                    });
                  }}
                >
                  <p className="mb-1.5 text-xs text-text-muted">{he.createSetHint}</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={he.gradeNamePlaceholder}
                      value={draft}
                      onChange={(e) =>
                        setNewLabels((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      required
                      className="flex-1 !max-w-none !mb-0"
                    />
                    <Button type="submit" disabled={addLabelForCategory.isPending}>
                      {he.addGradeLabel}
                    </Button>
                  </div>
                </form>
                {addLabelForCategory.isError && (
                  <p className="mt-2 text-sm text-danger">
                    {translateApiError((addLabelForCategory.error as Error).message)}
                  </p>
                )}
              </Card>
            );
          })}
      </div>
    </AppShell>
  );
}
