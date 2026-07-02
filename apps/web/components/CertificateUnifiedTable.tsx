'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CertificateSnapshotSummaryDto,
  CertificateSupplementContextDto,
  CertificateSupplementDto,
  GradebookMatrixDto,
  UpsertCertificateSupplementItemDto,
} from '@school/shared';
import { normalizeCertificatePrefs } from '@school/shared';
import { apiFetch } from '@/lib/api';
import { formatStudentDisplayName } from '@/lib/sort';
import {
  buildGridColumns,
  buildNestedCategoryHeaders,
  columnHeaderLabel,
  hasCertificateColumns,
} from '@/lib/gradebook-columns.util';
import { CategoryTableHeaderRows } from '@/components/CategoryTableHeaderRows';
import { he, translateApiError } from '@/lib/he';

type RowState = UpsertCertificateSupplementItemDto & { studentName: string };

function toRowState(supplements: CertificateSupplementDto[]): Map<string, RowState> {
  const map = new Map<string, RowState>();
  for (const s of supplements) {
    map.set(s.studentId, {
      studentId: s.studentId,
      studentName: s.studentName ?? '',
      absences: s.absences ?? null,
      lateness: s.lateness ?? null,
      hourAbsences: s.hourAbsences ?? null,
      hourLateness: s.hourLateness ?? null,
      evaluation: s.evaluation ?? null,
      homeroomSignature: s.homeroomSignature ?? null,
      principalSignature: s.principalSignature ?? null,
      gradeComments: s.gradeComments ?? {},
    });
  }
  return map;
}

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: '4rem',
  padding: '0.25rem 0.35rem',
  fontSize: '0.85rem',
};

type Props = {
  classId: string;
  termId: string;
  canEdit: boolean;
  termLocked: boolean;
  snapshots: CertificateSnapshotSummaryDto[];
  onGenerateOne: (studentId: string) => void;
  generatingStudentId: string | null;
  generatePending: boolean;
  onPreview: (snapshotId: string, studentName: string) => void;
  onNikudEdit?: (
    snapshotId: string,
    studentName: string,
    studentId: string,
    supplement: CertificateSupplementDto,
    prefs: import('@school/shared').CertificatePrefs,
    subjectNames: Record<string, string>,
  ) => void;
};

export function CertificateUnifiedTable({
  classId,
  termId,
  canEdit,
  termLocked,
  snapshots,
  onGenerateOne,
  generatingStudentId,
  generatePending,
  onPreview,
  onNikudEdit,
}: Props) {
  const qc = useQueryClient();

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['gradebook', classId, termId, 'cert-unified'],
    queryFn: () =>
      apiFetch<GradebookMatrixDto>(
        `/gradebook?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  const { data: certContext, isLoading: certLoading } = useQuery({
    queryKey: ['certificate-supplement-context', classId, termId],
    queryFn: () =>
      apiFetch<CertificateSupplementContextDto>(
        `/certificates/supplement-context?classId=${classId}&termId=${termId}`,
      ),
    enabled: Boolean(classId && termId),
  });

  const prefs = useMemo(
    () => (certContext ? normalizeCertificatePrefs(certContext.certificatePrefs) : null),
    [certContext],
  );

  const columns = useMemo(
    () => buildGridColumns(matrix?.subjects ?? [], prefs ?? undefined),
    [matrix?.subjects, prefs],
  );
  const showSubCategories =
    prefs?.showSubCategoriesOnCertificate !== false &&
    matrix?.showSubCategoriesOnCertificate !== false;
  const nestedHeaders = useMemo(
    () => buildNestedCategoryHeaders(columns, showSubCategories),
    [columns, showSubCategories],
  );
  const showCertSection = prefs ? hasCertificateColumns(prefs) : false;

  const entryMap = useMemo(
    () =>
      new Map(
        (matrix?.entries ?? []).map((e) => [`${e.studentId}:${e.subjectId}`, e.value]),
      ),
    [matrix?.entries],
  );

  const snapshotByStudent = useMemo(
    () => new Map(snapshots.map((s) => [s.studentId, s])),
    [snapshots],
  );

  const [rows, setRows] = useState<Map<string, RowState>>(new Map());

  useEffect(() => {
    if (certContext?.supplements) {
      setRows(toRowState(certContext.supplements));
    }
  }, [certContext]);

  const save = useMutation({
    mutationFn: (items: UpsertCertificateSupplementItemDto[]) =>
      apiFetch<CertificateSupplementDto[]>('/certificates/supplements', {
        method: 'PUT',
        body: JSON.stringify({ classId, termId, items }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['certificate-supplement-context', classId, termId],
      });
    },
  });

  const ensureRow = useCallback(
    (prev: Map<string, RowState>, studentId: string): RowState => {
      const existing = prev.get(studentId);
      if (existing) return existing;
      const student = matrix?.students.find((s) => s.id === studentId);
      return {
        studentId,
        studentName: student?.fullName ?? '',
        gradeComments: {},
      };
    },
    [matrix?.students],
  );

  const updateRow = useCallback(
    (studentId: string, patch: Partial<Omit<RowState, 'studentId' | 'studentName'>>) => {
      setRows((prev) => {
        const next = new Map(prev);
        const current = ensureRow(prev, studentId);
        next.set(studentId, { ...current, ...patch });
        return next;
      });
    },
    [ensureRow],
  );

  const updateComment = useCallback(
    (studentId: string, subjectId: string, value: string) => {
      setRows((prev) => {
        const next = new Map(prev);
        const current = ensureRow(prev, studentId);
        next.set(studentId, {
          ...current,
          gradeComments: {
            ...(current.gradeComments ?? {}),
            [subjectId]: value.trim() || null,
          },
        });
        return next;
      });
    },
    [ensureRow],
  );

  const handleSave = () => {
    const items = [...rows.values()].map(
      ({
        studentId,
        absences,
        lateness,
        hourAbsences,
        hourLateness,
        evaluation,
        homeroomSignature,
        principalSignature,
        gradeComments,
      }) => ({
        studentId,
        absences,
        lateness,
        hourAbsences,
        hourLateness,
        evaluation,
        homeroomSignature,
        principalSignature,
        gradeComments,
      }),
    );
    save.mutate(items);
  };

  type SupplementKind = Exclude<
    (typeof columns)[number]['kind'],
    'grade' | 'comment'
  >;

  const getSupplementValue = (row: RowState, kind: SupplementKind): string => {
    switch (kind) {
      case 'evaluation':
        return row.evaluation ?? '';
      case 'absences':
        return row.absences ?? '';
      case 'lateness':
        return row.lateness ?? '';
      case 'hourAbsences':
        return row.hourAbsences ?? '';
      case 'hourLateness':
        return row.hourLateness ?? '';
      case 'homeroomSignature':
        return row.homeroomSignature ?? '';
      case 'principalSignature':
        return row.principalSignature ?? '';
      default:
        return '';
    }
  };

  const setSupplementValue = (
    studentId: string,
    kind: SupplementKind,
    value: string,
  ) => {
    const patch: Partial<RowState> = {};
    switch (kind) {
      case 'evaluation':
        patch.evaluation = value || null;
        break;
      case 'absences':
        patch.absences = value || null;
        break;
      case 'lateness':
        patch.lateness = value || null;
        break;
      case 'hourAbsences':
        patch.hourAbsences = value || null;
        break;
      case 'hourLateness':
        patch.hourLateness = value || null;
        break;
      case 'homeroomSignature':
        patch.homeroomSignature = value || null;
        break;
      case 'principalSignature':
        patch.principalSignature = value || null;
        break;
    }
    updateRow(studentId, patch);
  };

  if (!classId || !termId || matrixLoading || certLoading || !matrix || !certContext) {
    return null;
  }

  const students = matrix.students;
  const cohortMissing =
    Boolean(prefs?.showClassYearHebrew) && !certContext.class.yearHebrew?.trim();

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>{he.certUnifiedTableTitle}</h2>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{he.certUnifiedTableHint}</p>
      {cohortMissing && (
        <p style={{ fontSize: '0.85rem', color: '#b45309' }}>{he.certCohortMissingHint}</p>
      )}
      {showCertSection && canEdit && (
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
          {he.certSupplementSaveHint}
        </p>
      )}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '48rem' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <CategoryTableHeaderRows
              parentSpans={nestedHeaders.parentSpans}
              subSpans={nestedHeaders.subSpans}
              trailingEmptyCols={1}
            />
            <tr>
              <th style={{ padding: '0.5rem', textAlign: 'right', minWidth: 120 }}>
                {he.studentName}
              </th>
              {columns.map((col, idx) => (
                <th
                  key={`${col.kind}-${idx}`}
                  style={{
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    background:
                      col.kind !== 'grade' && col.kind !== 'comment'
                        ? '#f0f9ff'
                        : undefined,
                  }}
                >
                  {columnHeaderLabel(col)}
                </th>
              ))}
              <th style={{ padding: '0.5rem', minWidth: 140 }}>{he.certificatesActions}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const row = rows.get(student.id) ?? {
                studentId: student.id,
                studentName: student.fullName,
                gradeComments: {},
              };
              const snapshot = snapshotByStudent.get(student.id);
              return (
                <tr key={student.id}>
                  <td style={{ padding: '0.35rem 0.5rem', whiteSpace: 'nowrap' }}>
                    {formatStudentDisplayName(student.fullName)}
                  </td>
                  {columns.map((col, idx) => {
                    if (col.kind === 'grade') {
                      const val = entryMap.get(`${student.id}:${col.subjectId}`) ?? '';
                      return (
                        <td
                          key={`${col.kind}-${idx}`}
                          style={{
                            padding: '0.35rem',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            background: '#fafafa',
                          }}
                        >
                          {val || '—'}
                        </td>
                      );
                    }
                    if (col.kind === 'comment') {
                      return (
                        <td key={`${col.kind}-${idx}`} style={{ padding: '0.25rem' }}>
                          <input
                            type="text"
                            style={inputStyle}
                            disabled={!canEdit}
                            value={row.gradeComments?.[col.subjectId] ?? ''}
                            onChange={(e) =>
                              updateComment(student.id, col.subjectId, e.target.value)
                            }
                          />
                        </td>
                      );
                    }
                    return (
                      <td
                        key={`${col.kind}-${idx}`}
                        style={{ padding: '0.25rem', background: '#f8fafc' }}
                      >
                        {col.kind === 'evaluation' ? (
                          <textarea
                            style={{
                              ...inputStyle,
                              minHeight: '3.5rem',
                              resize: 'vertical',
                              whiteSpace: 'pre-wrap',
                            }}
                            rows={3}
                            disabled={!canEdit}
                            value={getSupplementValue(row, col.kind)}
                            onChange={(e) =>
                              setSupplementValue(student.id, col.kind, e.target.value)
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            style={inputStyle}
                            disabled={!canEdit}
                            value={getSupplementValue(row, col.kind)}
                            onChange={(e) =>
                              setSupplementValue(student.id, col.kind, e.target.value)
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '0.35rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {canEdit && (
                        <button
                          type="button"
                          disabled={
                            !termLocked ||
                            generatePending ||
                            generatingStudentId === student.id
                          }
                          onClick={() => onGenerateOne(student.id)}
                        >
                          {generatingStudentId === student.id && generatePending
                            ? he.certificatesGenerating
                            : he.certificatesGenerateOne}
                        </button>
                      )}
                      {snapshot?.hasPdf && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => onPreview(snapshot.id, student.fullName)}
                        >
                          {he.certificatesPreview}
                        </button>
                      )}
                      {snapshot?.hasPdf && onNikudEdit && prefs?.nikud && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            const sup = certContext?.supplements.find((s) => s.studentId === student.id)
                              ?? { studentId: student.id };
                            const subjectNames: Record<string, string> = {};
                            for (const subj of certContext?.subjects ?? []) {
                              subjectNames[subj.id] = subj.name;
                            }
                            onNikudEdit(
                              snapshot.id,
                              student.fullName,
                              student.id,
                              sup as CertificateSupplementDto,
                              prefs,
                              subjectNames,
                            );
                          }}
                        >
                          ✏️ ניקוד
                        </button>
                      )}
                    </div>
                    {snapshot && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          marginTop: '0.25rem',
                        }}
                      >
                        {new Date(snapshot.createdAt).toLocaleString('he-IL')}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showCertSection && canEdit && (
        <div style={{ marginTop: '0.75rem' }}>
          <button type="button" disabled={save.isPending} onClick={handleSave}>
            {save.isPending ? he.saving : he.certSupplementSave}
          </button>
          {save.isSuccess && (
            <span style={{ marginRight: '0.75rem', fontSize: '0.85rem' }}>{he.saved}</span>
          )}
          {save.error && (
            <p className="error" style={{ marginTop: '0.5rem' }}>
              {translateApiError((save.error as Error).message)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
