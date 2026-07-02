import type { CertificatePrefs } from './certificate';

export type CertificateFillMode = 'handwritten' | 'computer';

/** Lines shown for handwritten evaluation on certificates. */
export const EVALUATION_HANDWRITTEN_LINE_COUNT = 3;

export type CertificateFillView = {
  gradesHandwritten: boolean;
  gradeCommentsHandwritten: boolean;
  attendanceHandwritten: boolean;
  evaluationHandwritten: boolean;
  signaturesHandwritten: boolean;
  studentNameHandwritten: boolean;
  classNameHandwritten: boolean;
  classYearHebrewHandwritten: boolean;
  termNameHandwritten: boolean;
  dateHandwritten: boolean;
};

function normalizeCommentPerGradeCategoryIds(
  raw: string[] | null | undefined,
): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id) => typeof id === 'string' && id.trim().length > 0);
}

/** Whether a parent category gets a per-grade comment column. */
export function commentPerGradeForCategory(
  prefs: CertificatePrefs,
  categoryId: string,
): boolean {
  const p = normalizeCertificatePrefs(prefs);
  if (!p.commentPerGrade) return false;
  const ids = p.commentPerGradeCategoryIds;
  if (ids === undefined) return true;
  return ids.includes(categoryId);
}

/** Merge legacy `homeroomComment` into `evaluation`. */
export function normalizeCertificatePrefs(
  raw: CertificatePrefs,
): CertificatePrefs {
  const evaluation = raw.evaluation ?? raw.homeroomComment ?? false;
  const commentPerGradeCategoryIds =
    raw.commentPerGradeCategoryIds !== undefined
      ? normalizeCommentPerGradeCategoryIds(raw.commentPerGradeCategoryIds)
      : undefined;
  return {
    ...raw,
    evaluation,
    showSubCategoriesOnCertificate: raw.showSubCategoriesOnCertificate ?? true,
    commentPerGradeCategoryIds,
    gradesFillMode: raw.gradesFillMode ?? 'computer',
    gradeCommentsFillMode: raw.gradeCommentsFillMode ?? 'handwritten',
    attendanceFillMode: raw.attendanceFillMode ?? 'handwritten',
    evaluationFillMode: raw.evaluationFillMode ?? 'handwritten',
    signaturesFillMode: raw.signaturesFillMode ?? 'handwritten',
    studentNameFillMode: raw.studentNameFillMode ?? 'computer',
    classNameFillMode: raw.classNameFillMode ?? 'computer',
    classYearHebrewFillMode: raw.classYearHebrewFillMode ?? 'computer',
    termNameFillMode: raw.termNameFillMode ?? 'computer',
    dateFillMode: raw.dateFillMode ?? 'computer',
    signatureHomeroom: raw.signatureHomeroom ?? true,
    signaturePrincipal: raw.signaturePrincipal ?? true,
    signatureParent: raw.signatureParent ?? true,
    evaluationBorder: raw.evaluationBorder ?? false,
    attendanceBorder: raw.attendanceBorder ?? false,
    attendanceFieldBorder: raw.attendanceFieldBorder ?? false,
    signaturesBorder: raw.signaturesBorder ?? false,
    signatureFieldBorder: raw.signatureFieldBorder ?? false,
    dateBorder: raw.dateBorder ?? false,
    showStudentNameOnCertificate: raw.showStudentNameOnCertificate ?? true,
    showClassNameOnCertificate: raw.showClassNameOnCertificate ?? true,
    showTermNameOnCertificate: raw.showTermNameOnCertificate ?? true,
  };
}

export type SignatureType = 'homeroom' | 'principal' | 'parent';

/** Whether a specific signature line is enabled on the certificate. */
export function signatureTypeEnabled(
  prefs: CertificatePrefs,
  type: SignatureType,
): boolean {
  const p = normalizeCertificatePrefs(prefs);
  if (!p.signatures) return false;
  switch (type) {
    case 'homeroom':
      return p.signatureHomeroom !== false;
    case 'principal':
      return p.signaturePrincipal !== false;
    case 'parent':
      return p.signatureParent !== false;
  }
}

export function certificateFillView(prefs: CertificatePrefs): CertificateFillView {
  const p = normalizeCertificatePrefs(prefs);
  return {
    gradesHandwritten: p.gradesFillMode === 'handwritten',
    gradeCommentsHandwritten: p.gradeCommentsFillMode === 'handwritten',
    attendanceHandwritten: p.attendanceFillMode === 'handwritten',
    evaluationHandwritten: p.evaluationFillMode === 'handwritten',
    signaturesHandwritten: p.signaturesFillMode === 'handwritten',
    studentNameHandwritten: p.studentNameFillMode === 'handwritten',
    classNameHandwritten: p.classNameFillMode === 'handwritten',
    classYearHebrewHandwritten: p.classYearHebrewFillMode === 'handwritten',
    termNameHandwritten: p.termNameFillMode === 'handwritten',
    dateHandwritten: p.dateFillMode === 'handwritten',
  };
}

/** Whether a dynamic header `field` block renders as a blank line for handwriting. */
export function certificateFieldHandwritten(
  fill: CertificateFillView,
  fieldKey: string,
): boolean {
  switch (fieldKey) {
    case 'studentName':
      return fill.studentNameHandwritten;
    case 'className':
      return fill.classNameHandwritten;
    case 'classYearHebrew':
    case 'cohort':
      return fill.classYearHebrewHandwritten;
    case 'termName':
      return fill.termNameHandwritten;
    default:
      return false;
  }
}
