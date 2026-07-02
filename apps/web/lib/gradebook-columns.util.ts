import {
  normalizeCertificatePrefs,
  commentPerGradeForCategory,
  type CertificatePrefs,
  type GradebookSubjectDto,
} from '@school/shared';

export type GridColumn =
  | { kind: 'grade'; subjectId: string; subject: GradebookSubjectDto }
  | { kind: 'comment'; subjectId: string; subject: GradebookSubjectDto }
  | { kind: 'evaluation' }
  | { kind: 'absences' }
  | { kind: 'lateness' }
  | { kind: 'hourAbsences' }
  | { kind: 'hourLateness' }
  | { kind: 'homeroomSignature' }
  | { kind: 'principalSignature' };

export type CategoryHeaderSpan = {
  label: string;
  count: number;
  kind: 'subject-parent' | 'subject-sub' | 'subject-category' | 'certificate';
};

export type NestedCategoryHeaders = {
  parentSpans: CategoryHeaderSpan[];
  subSpans: CategoryHeaderSpan[] | null;
};

type SubjectGridColumn = Extract<GridColumn, { kind: 'grade' | 'comment' }>;

function isSubjectColumn(col: GridColumn): col is SubjectGridColumn {
  return col.kind === 'grade' || col.kind === 'comment';
}

export function buildNestedCategoryHeaders(
  columns: GridColumn[],
  showSubCategories: boolean,
): NestedCategoryHeaders {
  if (!showSubCategories) {
    return {
      parentSpans: buildCategoryHeaderSpans(columns).map((s) => ({
        ...s,
        kind:
          s.kind === 'certificate'
            ? ('certificate' as const)
            : ('subject-parent' as const),
      })),
      subSpans: null,
    };
  }

  const parentSpans: CategoryHeaderSpan[] = [];
  const subSpans: CategoryHeaderSpan[] = [];
  let i = 0;

  while (i < columns.length) {
    const col = columns[i]!;
    if (isSubjectColumn(col)) {
      const parentId = col.subject.parentCategoryGroupId;
      const parentLabel = col.subject.parentCategoryGroupLabel;
      const blockStart = i;
      while (i < columns.length) {
        const c = columns[i]!;
        if (!isSubjectColumn(c)) break;
        if (c.subject.parentCategoryGroupId !== parentId) break;
        i += 1;
      }
      parentSpans.push({
        label: parentLabel,
        count: i - blockStart,
        kind: 'subject-parent',
      });

      let j = blockStart;
      while (j < i) {
        const subCol = columns[j]!;
        if (!isSubjectColumn(subCol)) break;
        const subId = subCol.subject.categoryGroupId;
        const subLabel =
          subCol.subject.categoryGroupId !== subCol.subject.parentCategoryGroupId
            ? subCol.subject.categoryGroupLabel
            : '';
        const subStart = j;
        while (j < i) {
          const c = columns[j]!;
          if (!isSubjectColumn(c)) break;
          if (c.subject.categoryGroupId !== subId) break;
          j += 1;
        }
        subSpans.push({
          label: subLabel,
          count: j - subStart,
          kind: 'subject-sub',
        });
      }
    } else {
      let count = 0;
      while (i < columns.length) {
        const c = columns[i]!;
        if (isSubjectColumn(c)) break;
        count += 1;
        i += 1;
      }
      if (count > 0) {
        parentSpans.push({ label: 'תעודה', count, kind: 'certificate' });
        subSpans.push({ label: '', count, kind: 'certificate' });
      }
    }
  }

  return { parentSpans, subSpans };
}

export function hasCertificateColumns(prefs: CertificatePrefs | null | undefined): boolean {
  if (!prefs) return false;
  const p = normalizeCertificatePrefs(prefs);
  const isComputer = (mode?: string) => mode === 'computer';
  const attendanceOn =
    p.absences || p.lateness || p.hourAbsences || p.hourLateness;
  const gradeCommentsOn =
    Boolean(p.commentPerGrade) &&
    isComputer(p.gradeCommentsFillMode) &&
    (p.commentPerGradeCategoryIds === undefined || p.commentPerGradeCategoryIds.length > 0);
  return (
    gradeCommentsOn ||
    (Boolean(p.evaluation) && isComputer(p.evaluationFillMode)) ||
    (Boolean(attendanceOn) && isComputer(p.attendanceFillMode)) ||
    (Boolean(p.signatures) && isComputer(p.signaturesFillMode))
  );
}

export function buildGridColumns(
  subjects: GradebookSubjectDto[],
  prefs: CertificatePrefs | null | undefined,
): GridColumn[] {
  const p = prefs ? normalizeCertificatePrefs(prefs) : null;
  const showCommentGlobal = Boolean(
    p?.commentPerGrade && p.gradeCommentsFillMode === 'computer',
  );
  const cols: GridColumn[] = [];

  for (const subject of subjects) {
    cols.push({ kind: 'grade', subjectId: subject.id, subject });
    if (
      showCommentGlobal &&
      p &&
      commentPerGradeForCategory(p, subject.parentCategoryGroupId)
    ) {
      cols.push({ kind: 'comment', subjectId: subject.id, subject });
    }
  }

  if (!p) return cols;

  if (p.evaluation && p.evaluationFillMode === 'computer') {
    cols.push({ kind: 'evaluation' });
  }
  if (p.attendanceFillMode === 'computer') {
    if (p.absences) cols.push({ kind: 'absences' });
    if (p.lateness) cols.push({ kind: 'lateness' });
    if (p.hourAbsences) cols.push({ kind: 'hourAbsences' });
    if (p.hourLateness) cols.push({ kind: 'hourLateness' });
  }
  if (p.signatures && p.signaturesFillMode === 'computer') {
    if (p.signatureHomeroom !== false) cols.push({ kind: 'homeroomSignature' });
    if (p.signaturePrincipal !== false) cols.push({ kind: 'principalSignature' });
  }

  return cols;
}

export function buildCategoryHeaderSpans(columns: GridColumn[]): CategoryHeaderSpan[] {
  const spans: CategoryHeaderSpan[] = [];
  let i = 0;

  while (i < columns.length) {
    const col = columns[i]!;
    if (col.kind === 'grade' || col.kind === 'comment') {
      const typeId = col.subject.categoryGroupId;
      const label = col.subject.categoryGroupLabel;
      let count = 0;
      while (i < columns.length) {
        const c = columns[i]!;
        if (c.kind !== 'grade' && c.kind !== 'comment') break;
        if (c.subject.categoryGroupId !== typeId) break;
        count += 1;
        i += 1;
      }
      spans.push({ label, count, kind: 'subject-category' });
    } else {
      let count = 0;
      while (i < columns.length) {
        const c = columns[i]!;
        if (c.kind === 'grade' || c.kind === 'comment') break;
        count += 1;
        i += 1;
      }
      if (count > 0) {
        spans.push({ label: 'תעודה', count, kind: 'certificate' });
      }
    }
  }

  return spans;
}

export function gradeColumnIndicesInCategory(
  columns: GridColumn[],
  categoryGroupId: string,
): number[] {
  const indices: number[] = [];
  columns.forEach((col, idx) => {
    if (col.kind === 'grade' && col.subject.categoryGroupId === categoryGroupId) {
      indices.push(idx);
    }
  });
  return indices;
}

/** Snap fill drag to grade columns only — never onto comment / certificate cells. */
export function clampFillColIndex(
  colIdx: number,
  columns: GridColumn[],
  categoryGroupId: string,
): number {
  const allowed = gradeColumnIndicesInCategory(columns, categoryGroupId);
  if (allowed.length === 0) return colIdx;
  if (allowed.includes(colIdx)) return colIdx;
  let nearest = allowed[0]!;
  let minDist = Math.abs(colIdx - nearest);
  for (const idx of allowed) {
    const dist = Math.abs(colIdx - idx);
    if (dist < minDist) {
      minDist = dist;
      nearest = idx;
    }
  }
  return nearest;
}

export function columnHeaderLabel(col: GridColumn): string {
  switch (col.kind) {
    case 'grade':
      return col.subject.name;
    case 'comment':
      return `הערה · ${col.subject.name}`;
    case 'evaluation':
      return 'הערכה';
    case 'absences':
      return 'חיסורים';
    case 'lateness':
      return 'איחורים';
    case 'hourAbsences':
      return 'חיסורי שעות';
    case 'hourLateness':
      return 'איחורי שעות';
    case 'homeroomSignature':
      return 'חתימת מחנך/ת';
    case 'principalSignature':
      return 'חתימת מנהל/ת';
    default:
      return '';
  }
}

export function isSupplementColumn(col: GridColumn): boolean {
  return col.kind !== 'grade';
}

/** True when fill-drag should stay on this column only (supplement text fields). */
export function isSupplementFillColumn(col: GridColumn): boolean {
  return col.kind !== 'grade';
}

export type SupplementFieldKey =
  | 'evaluation'
  | 'absences'
  | 'lateness'
  | 'hourAbsences'
  | 'hourLateness'
  | 'homeroomSignature'
  | 'principalSignature';

const supplementFieldByKind: Record<
  Exclude<GridColumn['kind'], 'grade' | 'comment'>,
  SupplementFieldKey
> = {
  evaluation: 'evaluation',
  absences: 'absences',
  lateness: 'lateness',
  hourAbsences: 'hourAbsences',
  hourLateness: 'hourLateness',
  homeroomSignature: 'homeroomSignature',
  principalSignature: 'principalSignature',
};

export function readSupplementCellValue(
  row: {
    gradeComments?: Record<string, string | null>;
    evaluation?: string | null;
    absences?: string | null;
    lateness?: string | null;
    hourAbsences?: string | null;
    hourLateness?: string | null;
    homeroomSignature?: string | null;
    principalSignature?: string | null;
  },
  col: GridColumn,
): string {
  if (col.kind === 'grade') return '';
  if (col.kind === 'comment') {
    return row.gradeComments?.[col.subjectId] ?? '';
  }
  const field = supplementFieldByKind[col.kind];
  const raw = row[field];
  return typeof raw === 'string' ? raw : '';
}

export function writeSupplementCellPatch(
  col: GridColumn,
  value: string | null,
): Partial<{
  gradeComments: Record<string, string | null>;
  evaluation: string | null;
  absences: string | null;
  lateness: string | null;
  hourAbsences: string | null;
  hourLateness: string | null;
  homeroomSignature: string | null;
  principalSignature: string | null;
}> {
  const stored =
    col.kind === 'evaluation' || col.kind === 'comment'
      ? value || null
      : value?.trim() || null;
  if (col.kind === 'comment') {
    return { gradeComments: { [col.subjectId]: stored } };
  }
  if (col.kind === 'grade') return {};
  return { [supplementFieldByKind[col.kind]]: stored };
}
