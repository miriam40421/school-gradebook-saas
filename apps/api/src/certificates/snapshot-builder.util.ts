import type {
  CertificatePrefs,
  CertificateSnapshotCategoryDto,
  CertificateSnapshotJsonV1,
  CertificateSnapshotSubjectDto,
  CertificateSupplementInput,
} from '@school/shared';
import {
  certificateFillView,
  normalizeCertificatePrefs,
  commentPerGradeForCategory,
  buildGradingTypeMap,
  resolveSubjectCategoryPlacement,
} from '@school/shared';
import { certificateSubjectLabel } from '@school/shared';

export type SnapshotBuilderInput = {
  templateKey: string;
  school: { id: string; name: string };
  class: {
    id: string;
    name: string;
    year: number;
    yearHebrew?: string | null;
  };
  term: { id: string; name: string };
  student: { id: string; fullName: string };
  subjects: Array<{
    id: string;
    name: string;
    gradingSetTypeId: string;
    gradingSetTypeLabel: string;
  }>;
  gradingSetTypes?: Array<{ id: string; label: string; parentId: string | null }>;
  entries: Map<string, string | null>;
  classGroups: Array<{ id: string; name: string; subjectId: string | null }>;
  studentGroupIds: string[];
  certificatePrefs: CertificatePrefs;
  certificateProfileName?: string | null;
  supplement?: CertificateSupplementInput;
  generatedAt?: string;
};

function groupNameForSubject(
  subjectId: string,
  classGroups: SnapshotBuilderInput['classGroups'],
  studentGroupIds: string[],
): string | null {
  const groups = classGroups.filter(
    (g) => g.subjectId === subjectId && studentGroupIds.includes(g.id),
  );
  return groups[0]?.name ?? null;
}

const GEMATRIA_MAP: [number, string][] = [
  [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
  [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
  [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
  [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'],
  [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
];

function toGematria(n: number): string {
  let remaining = n;
  let letters = '';
  for (const [val, letter] of GEMATRIA_MAP) {
    while (remaining >= val) { letters += letter; remaining -= val; }
    if (remaining === 0) break;
  }
  letters = letters.replace('יה', 'טו').replace('יו', 'טז');
  if (letters.length === 1) return letters + '׳';
  return letters.slice(0, -1) + '״' + letters.slice(-1);
}

function formatDisplayDate(iso: string): string {
  try {
    const date = new Date(iso);
    const fmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(date);
    const dayNum = parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10);
    const monthName = parts.find((p) => p.type === 'month')?.value ?? '';
    const yearNum = parseInt(parts.find((p) => p.type === 'year')?.value ?? '5786', 10);
    return `${toGematria(dayNum)} ${monthName} ${toGematria(yearNum - 5000)}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function groupSubjectsByCategory(
  subjects: CertificateSnapshotSubjectDto[],
): CertificateSnapshotCategoryDto[] {
  const order: string[] = [];
  const map = new Map<string, CertificateSnapshotCategoryDto>();

  for (const s of subjects) {
    const categoryId = s.categoryId ?? 'unknown';
    const categoryLabel = s.categoryLabel ?? 'כללי';
    if (!map.has(categoryId)) {
      order.push(categoryId);
      map.set(categoryId, {
        categoryId,
        categoryLabel,
        showComment: Boolean(s.showComment),
        subjects: [],
        subCategories: [],
      });
    }
    const cat = map.get(categoryId)!;
    if (s.showComment) {
      cat.showComment = true;
    }

    if (s.subCategoryId && s.subCategoryLabel) {
      const subs = cat.subCategories ?? (cat.subCategories = []);
      let sub = subs.find((sc) => sc.subCategoryId === s.subCategoryId);
      if (!sub) {
        sub = {
          subCategoryId: s.subCategoryId,
          subCategoryLabel: s.subCategoryLabel,
          subjects: [],
        };
        subs.push(sub);
      }
      sub.subjects.push(s);
    } else {
      cat.subjects.push(s);
    }
  }

  return order.map((id) => {
    const cat = map.get(id)!;
    if (cat.subCategories?.length === 0) {
      delete cat.subCategories;
    }
    return cat;
  });
}

function buildAttendance(prefs: CertificatePrefs, supplement?: CertificateSupplementInput) {
  const hasAny =
    prefs.absences ||
    prefs.lateness ||
    prefs.hourAbsences ||
    prefs.hourLateness;
  if (!hasAny) return undefined;

  return {
    ...(prefs.absences
      ? { absences: supplement?.absences?.trim() || null }
      : {}),
    ...(prefs.lateness
      ? { lateness: supplement?.lateness?.trim() || null }
      : {}),
    ...(prefs.hourAbsences
      ? { hourAbsences: supplement?.hourAbsences?.trim() || null }
      : {}),
    ...(prefs.hourLateness
      ? { hourLateness: supplement?.hourLateness?.trim() || null }
      : {}),
  };
}

export function buildSnapshotJson(
  input: SnapshotBuilderInput,
): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs(input.certificatePrefs);
  const showGroup = Boolean(prefs.showSubjectGroupOnCertificate);
  const showSubCategories = prefs.showSubCategoriesOnCertificate !== false;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const supplement = input.supplement;
  const gradeComments = supplement?.gradeComments ?? {};
  const typeMap = buildGradingTypeMap(input.gradingSetTypes ?? []);

  const nkoForSubjects = supplement?.nikudOverrides ?? {};
  const subjects: CertificateSnapshotSubjectDto[] = input.subjects.map((s) => {
    const groupName = groupNameForSubject(
      s.id,
      input.classGroups,
      input.studentGroupIds,
    );
    const commentRaw = gradeComments[s.id];
    const placement = resolveSubjectCategoryPlacement(
      s.gradingSetTypeId,
      s.gradingSetTypeLabel,
      typeMap,
      showSubCategories,
    );
    const showComment = commentPerGradeForCategory(prefs, placement.categoryId);
    const rawSubjectLabel = certificateSubjectLabel(s.name, groupName, showGroup);
    const resolvedSubjectName = nkoForSubjects[`subject.${s.id}`] || rawSubjectLabel;
    const resolvedCategoryLabel = nkoForSubjects[`category.${placement.categoryId}`] || placement.categoryLabel;
    const resolvedSubCategoryLabel = placement.subCategoryId
      ? (nkoForSubjects[`subcategory.${placement.subCategoryId}`] || placement.subCategoryLabel)
      : placement.subCategoryLabel;
    const rawGrade = input.entries.get(s.id) ?? null;
    const resolvedGrade = rawGrade ? (nkoForSubjects[`grade.${s.id}`] || rawGrade) : null;
    return {
      subjectId: s.id,
      subjectName: resolvedSubjectName,
      value: resolvedGrade,
      categoryId: placement.categoryId,
      categoryLabel: resolvedCategoryLabel,
      subCategoryId: placement.subCategoryId,
      subCategoryLabel: resolvedSubCategoryLabel,
      showComment,
      ...(showComment
        ? {
            comment:
              typeof commentRaw === 'string' ? commentRaw.trim() || null : null,
          }
        : {}),
    };
  });

  const subjectCategories = groupSubjectsByCategory(subjects);
  const attendance = buildAttendance(prefs, supplement);
  const cohortValue = input.class.yearHebrew?.trim() || null;

  // Apply per-student nikud overrides (set via the nikud modal) to raw field values.
  // If a field already has nikud marks, nikudSnapshot will skip re-processing it.
  const nko = supplement?.nikudOverrides ?? {};
  const resolvedStudentName = nko['student.fullName'] || input.student.fullName;
  const resolvedClassName = nko['class.name'] || input.class.name;
  const resolvedTermName = nko['term.name'] || input.term.name;
  const resolvedCohort = cohortValue ? (nko['class.cohort'] || cohortValue) : null;

  const snapshot: CertificateSnapshotJsonV1 = {
    schemaVersion: 1,
    templateKey: input.templateKey,
    generatedAt,
    displayDate: prefs.dateOnCertificate ? formatDisplayDate(generatedAt) : null,
    school: { id: input.school.id, name: input.school.name },
    class: {
      id: input.class.id,
      name: resolvedClassName,
      year: input.class.year,
      ...(prefs.showClassYearHebrew
        ? { yearHebrew: resolvedCohort, cohort: resolvedCohort }
        : {}),
    },
    term: { id: input.term.id, name: resolvedTermName },
    student: { id: input.student.id, fullName: resolvedStudentName },
    ...(prefs.showProfileNameOnCertificate && input.certificateProfileName?.trim()
      ? { certificateProfileName: input.certificateProfileName.trim() }
      : {}),
    subjects,
    subjectCategories,
    showAnyGradeComment: subjects.some((s) => s.showComment),
    certificatePrefs: prefs,
    fill: certificateFillView(prefs),
    ...(prefs.evaluation
      ? { evaluation: supplement?.evaluation?.trim() || null }
      : {}),
    attendance,
  };

  if (prefs.signatures) {
    snapshot.signatures = {
      homeroom: supplement?.homeroomSignature?.trim() || null,
      principal: supplement?.principalSignature?.trim() || null,
      parent: null,
    };
  }

  return snapshot;
}

/** Attach profile display name for PDF render when the school pref is enabled. */
export function enrichSnapshotProfileName(
  snapshot: CertificateSnapshotJsonV1,
  profileName?: string | null,
): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs(snapshot.certificatePrefs);
  if (!prefs.showProfileNameOnCertificate) {
    return { ...snapshot, certificatePrefs: prefs };
  }
  const name = profileName?.trim() || snapshot.certificateProfileName?.trim();
  if (!name) {
    return { ...snapshot, certificatePrefs: prefs };
  }
  return {
    ...snapshot,
    certificatePrefs: prefs,
    certificateProfileName: name,
  };
}

/** Apply latest saved supplement data onto an existing snapshot before PDF render. */
export function mergeSupplementIntoSnapshot(
  snapshot: CertificateSnapshotJsonV1,
  supplement?: CertificateSupplementInput,
  certificatePrefs?: CertificatePrefs,
  classNikudOverrides?: Record<string, string>,
): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs(
    certificatePrefs ?? snapshot.certificatePrefs,
  );
  const showSubCategories = prefs.showSubCategoriesOnCertificate !== false;
  const gradeComments = supplement?.gradeComments ?? {};

  // class-level overrides win over any stale per-student data for the same key
  const nko = { ...(supplement?.nikudOverrides ?? {}), ...(classNikudOverrides ?? {}) };
  const subjects: CertificateSnapshotSubjectDto[] = snapshot.subjects.map((s) => {
    const subjectId = s.subjectId;
    const commentRaw = subjectId ? gradeComments[subjectId] : undefined;
    const subCategoryId = showSubCategories ? (s.subCategoryId ?? null) : null;
    const subCategoryLabel = showSubCategories
      ? (s.subCategoryLabel ?? null)
      : null;
    const categoryId = s.categoryId ?? 'unknown';
    const showComment = commentPerGradeForCategory(prefs, categoryId);
    const resolvedSubjectName = (subjectId && nko[`subject.${subjectId}`]) || s.subjectName;
    const resolvedCategoryLabel = nko[`category.${categoryId}`] || s.categoryLabel;
    const resolvedSubCategoryLabel = subCategoryId
      ? (nko[`subcategory.${subCategoryId}`] || subCategoryLabel)
      : subCategoryLabel;
    const resolvedGrade = s.value ? (nko[`grade.${subjectId}`] || s.value) : s.value;
    return {
      ...s,
      subjectName: resolvedSubjectName,
      value: resolvedGrade,
      categoryLabel: resolvedCategoryLabel,
      subCategoryId,
      subCategoryLabel: resolvedSubCategoryLabel,
      showComment,
      ...(showComment
        ? {
            comment:
              typeof commentRaw === 'string'
                ? commentRaw.trim() || null
                : (s.comment ?? null),
          }
        : { comment: undefined }),
    };
  });

  const next: CertificateSnapshotJsonV1 = {
    ...snapshot,
    student: { ...snapshot.student, fullName: nko['student.fullName'] || snapshot.student.fullName },
    class: {
      ...snapshot.class,
      name: nko['class.name'] || snapshot.class.name,
      ...((snapshot.class.cohort != null || nko['class.cohort'])
        ? { cohort: nko['class.cohort'] || snapshot.class.cohort || null }
        : {}),
      ...((snapshot.class.yearHebrew != null || nko['class.cohort'])
        ? { yearHebrew: nko['class.cohort'] || snapshot.class.yearHebrew || null }
        : {}),
    },
    term: { ...snapshot.term, name: nko['term.name'] || snapshot.term.name },
    certificatePrefs: prefs,
    fill: certificateFillView(prefs),
    subjects,
    subjectCategories: groupSubjectsByCategory(subjects),
    showAnyGradeComment: subjects.some((s) => s.showComment),
    displayDate: prefs.dateOnCertificate ? formatDisplayDate(snapshot.generatedAt) : null,
    ...(prefs.evaluation
      ? { evaluation: supplement?.evaluation?.trim() || null }
      : {}),
    attendance: buildAttendance(prefs, supplement),
  };

  if (prefs.signatures) {
    next.signatures = {
      homeroom: supplement?.homeroomSignature?.trim() || null,
      principal: supplement?.principalSignature?.trim() || null,
      parent: snapshot.signatures?.parent ?? null,
    };
  }

  return next;
}
