import type { CertificatePrefs, CertificateSnapshotJsonV1 } from '@school/shared';
import {
  buildGradingTypeMap,
  certificateFillView,
  commentPerGradeForCategory,
  normalizeCertificatePrefs,
  resolveSubjectCategoryPlacement,
  type CertificateSnapshotCategoryDto,
  type CertificateSnapshotSubjectDto,
} from '@school/shared';

const DEMO_GRADES = ['מצוין', 'טוב מאוד', 'טוב', 'מספיק', 'טוב'];

export type DemoSnapshotSchoolData = {
  schoolName?: string;
  profileName?: string;
  gradingSetTypes?: Array<{ id: string; label: string; parentId: string | null }>;
  subjects?: Array<{
    id: string;
    name: string;
    gradingSetTypeId: string;
    gradingSetTypeLabel: string;
  }>;
};

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
    if (s.showComment) cat.showComment = true;

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
    if (cat.subCategories?.length === 0) delete cat.subCategories;
    return cat;
  });
}

function buildSubjectsFromSchool(
  prefs: CertificatePrefs,
  schoolData?: DemoSnapshotSchoolData,
): {
  subjects: CertificateSnapshotSubjectDto[];
  subjectCategories: CertificateSnapshotCategoryDto[];
} {
  const showSubCategories = prefs.showSubCategoriesOnCertificate !== false;
  const typeMap = buildGradingTypeMap(schoolData?.gradingSetTypes ?? []);
  const rawSubjects = schoolData?.subjects ?? [];

  if (rawSubjects.length === 0) {
    return buildFallbackSubjects(prefs);
  }

  const subjects: CertificateSnapshotSubjectDto[] = rawSubjects.map((s, index) => {
    const placement = resolveSubjectCategoryPlacement(
      s.gradingSetTypeId,
      s.gradingSetTypeLabel,
      typeMap,
      showSubCategories,
    );
    const showComment = commentPerGradeForCategory(prefs, placement.categoryId);
    return {
      subjectId: s.id,
      subjectName: s.name,
      value: DEMO_GRADES[index % DEMO_GRADES.length] ?? 'טוב',
      categoryId: placement.categoryId,
      categoryLabel: placement.categoryLabel,
      subCategoryId: placement.subCategoryId,
      subCategoryLabel: placement.subCategoryLabel,
      showComment,
      ...(showComment ? { comment: 'התקדמות טובה' } : {}),
    };
  });

  return { subjects, subjectCategories: groupSubjectsByCategory(subjects) };
}

function buildFallbackSubjects(prefs: CertificatePrefs): {
  subjects: CertificateSnapshotSubjectDto[];
  subjectCategories: CertificateSnapshotCategoryDto[];
} {
  const subjects: CertificateSnapshotSubjectDto[] = [
    {
      subjectId: 's1',
      subjectName: 'מתמטיקה',
      value: 'טוב',
      categoryId: 'c1',
      categoryLabel: 'לימודי חול',
      showComment: commentPerGradeForCategory(prefs, 'c1'),
      ...(commentPerGradeForCategory(prefs, 'c1') && prefs.gradeCommentsFillMode === 'computer'
        ? { comment: 'מצטיין' }
        : {}),
    },
    {
      subjectId: 's2',
      subjectName: 'אנגלית',
      value: 'מצוין',
      categoryId: 'c1',
      categoryLabel: 'לימודי חול',
      showComment: commentPerGradeForCategory(prefs, 'c1'),
      ...(commentPerGradeForCategory(prefs, 'c1') && prefs.gradeCommentsFillMode === 'computer'
        ? { comment: 'שולט בשפה' }
        : {}),
    },
    {
      subjectId: 's3',
      subjectName: 'חומש',
      value: 'טוב מאוד',
      categoryId: 'c2',
      categoryLabel: 'לימודי קודש',
      showComment: commentPerGradeForCategory(prefs, 'c2'),
      ...(commentPerGradeForCategory(prefs, 'c2') && prefs.gradeCommentsFillMode === 'computer'
        ? { comment: 'שולט בחומר' }
        : {}),
    },
    {
      subjectId: 's4',
      subjectName: 'התנהגות',
      value: 'טוב מאוד',
      categoryId: 'c3',
      categoryLabel: 'הליכות',
      showComment: commentPerGradeForCategory(prefs, 'c3'),
      ...(commentPerGradeForCategory(prefs, 'c3') && prefs.gradeCommentsFillMode === 'computer'
        ? { comment: 'מצטיינת' }
        : {}),
    },
  ];

  return { subjects, subjectCategories: groupSubjectsByCategory(subjects) };
}

/** Demo snapshot for template preview — respects school certificate profile prefs. */
export function buildDemoCertificateSnapshot(
  prefsInput?: CertificatePrefs,
  schoolData?: DemoSnapshotSchoolData,
): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs(
    prefsInput ?? {
      commentPerGrade: true,
      absences: true,
      lateness: true,
      evaluation: true,
      signatures: true,
      dateOnCertificate: true,
      showClassYearHebrew: true,
      gradesFillMode: 'computer',
      attendanceFillMode: 'handwritten',
      evaluationFillMode: 'computer',
      signaturesFillMode: 'handwritten',
      gradeCommentsFillMode: 'handwritten',
    },
  );
  const fill = certificateFillView(prefs);
  const { subjects, subjectCategories } = buildSubjectsFromSchool(prefs, schoolData);

  return {
    schemaVersion: 1,
    templateKey: 'custom',
    generatedAt: new Date().toISOString(),
    displayDate: prefs.dateOnCertificate ? 'י״ד בסיון תשפ״ה' : null,
    school: { id: 'demo-school', name: schoolData?.schoolName ?? 'בית ספר לדוגמה' },
    class: {
      id: 'demo-class',
      name: 'ג׳1',
      year: 2025,
      yearHebrew: prefs.showClassYearHebrew ? 'תשפ״ה' : null,
      cohort: prefs.showClassYearHebrew ? 'תשפ״ה' : null,
    },
    term: { id: 'demo-term', name: 'מחצית א׳' },
    student: { id: 'demo-student', fullName: 'ישראל ישראלי' },
    ...(prefs.showProfileNameOnCertificate && schoolData?.profileName?.trim()
      ? { certificateProfileName: schoolData.profileName.trim() }
      : {}),
    evaluation: prefs.evaluation ? 'תלמיד מצטיין, משתתף בשיעור באופן פעיל.' : null,
    fill,
    certificatePrefs: prefs,
    showAnyGradeComment: subjects.some((s) => s.showComment),
    subjects,
    subjectCategories,
    attendance:
      prefs.absences || prefs.lateness || prefs.hourAbsences || prefs.hourLateness
        ? {
            absences: prefs.absences ? '2' : null,
            lateness: prefs.lateness ? '1' : null,
            hourAbsences: prefs.hourAbsences ? '3' : null,
            hourLateness: prefs.hourLateness ? '1' : null,
          }
        : undefined,
    signatures: prefs.signatures
      ? {
          homeroom: prefs.signatureHomeroom !== false ? 'מורה כיתה' : null,
          principal: prefs.signaturePrincipal !== false ? 'מנהלת' : null,
          parent: prefs.signatureParent !== false ? '' : null,
        }
      : undefined,
  };
}
