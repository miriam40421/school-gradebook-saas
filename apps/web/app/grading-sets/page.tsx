'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { RowActions } from '@/components/RowActions';
import { apiFetch } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';

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
      typeLabel,
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
          body: JSON.stringify({
            name: typeLabel,
            gradingSetTypeId: typeId,
          }),
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
      setNewLabels((prev) => ({
        ...prev,
        [vars.typeId]: '',
      }));
    },
  });

  const updateValue = useMutation({
    mutationFn: ({
      setId,
      valueId,
      label: lbl,
    }: {
      setId: string;
      valueId: string;
      label: string;
    }) =>
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
    <AdminShell>
      <h1>{he.gradingSetsTitle}</h1>
      <p style={{ fontSize: '0.9rem', color: '#475569' }}>{he.gradingSetsClarify}</p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>{he.gradingTypesTitle}</h2>
        <p style={{ fontSize: '0.9rem', color: '#475569' }}>{he.gradingTypesHint}</p>
        {typesLoading && <p>{he.loading}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createType.mutate();
          }}
        >
          <input
            placeholder={he.gradingTypeName}
            value={typeLabel}
            onChange={(e) => setTypeLabel(e.target.value)}
            required
          />
          <label style={{ display: 'block', marginTop: '0.5rem' }}>
            {he.gradingTypeParent}
            <select
              value={newTypeParentId}
              onChange={(e) => setNewTypeParentId(e.target.value)}
              style={{ display: 'block', marginTop: '0.25rem' }}
            >
              <option value="">{he.gradingTypeParentNone}</option>
              {sortedTypes
                .filter((t) => !t.parentId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit">{he.addGradingType}</button>
        </form>
        {createType.isError && (
          <p className="error">{translateApiError((createType.error as Error).message)}</p>
        )}
      </div>

      {isLoading && <p>{he.loading}</p>}
      {error && (
        <p className="error">{translateApiError((error as Error).message)}</p>
      )}

      {!typesLoading && sortedTypes.length === 0 && (
        <p className="error">{he.gradingTypesEmpty}</p>
      )}

      <h2>{he.setsByCategoryTitle}</h2>
      {displayTypes.map((t) => {
        const typeSets = setsByType.get(t.id) ?? [];
        const primarySet = typeSets[0];
        const extraSets = typeSets.slice(1);
        const draft = newLabels[t.id] ?? '';
        const values = primarySet?.values ?? [];
        const linkedSubjects = subjectCountByType.get(t.id) ?? 0;
        const allValuesCount = typeSets.reduce((n, s) => n + s.values.length, 0);

        return (
          <div key={t.id} className="card" style={{ marginTop: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <div style={{ flex: 1 }}>
                {editingTypeId === t.id ? (
                  <input
                    value={editTypeLabel}
                    onChange={(e) => setEditTypeLabel(e.target.value)}
                  />
                ) : (
                  <>
                    <h3 style={{ margin: 0, paddingRight: `${t.depth * 1.25}rem` }}>
                      {t.depth > 0 ? `${he.gradingTypeSubCategory}: ` : ''}
                      {t.label}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#64748b',
                        margin: '0.2rem 0 0',
                      }}
                    >
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
                onSave={() =>
                  updateType.mutate({ id: t.id, label: editTypeLabel.trim() })
                }
                onCancel={() => setEditingTypeId(null)}
                onDelete={() => deleteType.mutate(t.id)}
                saveDisabled={!editTypeLabel.trim()}
              />
            </div>

            {linkedSubjects > 0 && allValuesCount === 0 && (
              <p className="error" style={{ marginTop: '0.5rem' }}>
                {he.categoryEmptyGradesWarning(linkedSubjects)}
              </p>
            )}

            {extraSets.length > 0 && (
              <p className="error" style={{ marginTop: '0.5rem' }}>
                {he.duplicateGradingSetsWarning}
              </p>
            )}

            {extraSets.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.35rem',
                  fontSize: '0.85rem',
                }}
              >
                <span>
                  רשימה כפולה: {s.values.map((v) => v.label).join(', ') || '—'}
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => deleteSet.mutate(s.id)}
                >
                  {he.delete}
                </button>
              </div>
            ))}

            <h4 style={{ marginTop: '0.75rem', marginBottom: '0.35rem' }}>
              {he.gradesInCategory}
            </h4>

            {values.length === 0 ? (
              <p style={{ color: '#64748b' }}>{he.noGradesInCategory}</p>
            ) : (
              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                {values.map((v) => {
                  const setId = primarySet!.id;
                  const valueKey = `${setId}:${v.id}`;
                  const isEditing = editingValueKey === valueKey;
                  return (
                    <li key={v.id} style={{ marginBottom: '0.35rem' }}>
                      {isEditing ? (
                        <input
                          value={editValueLabel}
                          onChange={(e) => setEditValueLabel(e.target.value)}
                        />
                      ) : (
                        <span>{v.label}</span>
                      )}{' '}
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
                        onDelete={() =>
                          deleteValue.mutate({ setId, valueId: v.id })
                        }
                        saveDisabled={!editValueLabel.trim()}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <form
              style={{ marginTop: '0.75rem' }}
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
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.35rem' }}>
                {he.createSetHint}
              </p>
              <input
                placeholder={he.gradeNamePlaceholder}
                value={draft}
                onChange={(e) =>
                  setNewLabels((prev) => ({
                    ...prev,
                    [t.id]: e.target.value,
                  }))
                }
                required
              />
              <button type="submit" disabled={addLabelForCategory.isPending}>
                {he.addGradeLabel}
              </button>
            </form>
            {addLabelForCategory.isError && (
              <p className="error">
                {translateApiError((addLabelForCategory.error as Error).message)}
              </p>
            )}
          </div>
        );
      })}
    </AdminShell>
  );
}
