import type { CertificateFillMode } from './certificate-fill';

export type { CertificateFillMode } from './certificate-fill';

export type CertificatePrefs = {
  commentPerGrade?: boolean;
  /** Parent category ids with a comment column when `commentPerGrade` is on; omitted = all categories. */
  commentPerGradeCategoryIds?: string[];
  absences?: boolean;
  lateness?: boolean;
  hourAbsences?: boolean;
  hourLateness?: boolean;
  /** Overall evaluation section (הערכה). */
  evaluation?: boolean;
  /** @deprecated use `evaluation` */
  homeroomComment?: boolean;
  showClassYearHebrew?: boolean;
  signatures?: boolean;
  /** Which signature lines appear when `signatures` is on (default: all). */
  signatureHomeroom?: boolean;
  signaturePrincipal?: boolean;
  signatureParent?: boolean;
  dateOnCertificate?: boolean;
  /** When true, the class profile name (e.g. «א–ד») appears below the certificate title. */
  showProfileNameOnCertificate?: boolean;
  showSubjectGroupOnCertificate?: boolean;
  /** Grade values in PDF table. */
  gradesFillMode?: CertificateFillMode;
  /** When true, nested grading categories appear as sub-headings; when false, subjects group under parent only. */
  showSubCategoriesOnCertificate?: boolean;
  /** Per-grade comment column when enabled. */
  gradeCommentsFillMode?: CertificateFillMode;
  /** Attendance numeric fields. */
  attendanceFillMode?: CertificateFillMode;
  /** Evaluation text block. */
  evaluationFillMode?: CertificateFillMode;
  /** Signature area. */
  signaturesFillMode?: CertificateFillMode;
  /** Draw a border around the evaluation block on the certificate. */
  evaluationBorder?: boolean;
  /** Draw a group border around all attendance fields on the certificate. */
  attendanceBorder?: boolean;
  /** Draw a border around each attendance field on the certificate. */
  attendanceFieldBorder?: boolean;
  /** Draw a group border around signature fields and date on the certificate. */
  signaturesBorder?: boolean;
  /** Draw a border around each signature field on the certificate. */
  signatureFieldBorder?: boolean;
  /** Draw a border around the date field on the certificate. */
  dateBorder?: boolean;
  /** When true, PDF uses Noto Serif Hebrew font with increased line-height for nikud (vowel marks). */
  nikud?: boolean;
  /** Show student name in the certificate header (default: on). */
  showStudentNameOnCertificate?: boolean;
  /** Show class name in the certificate header (default: on). */
  showClassNameOnCertificate?: boolean;
  /** Show term name in the certificate header (default: on). */
  showTermNameOnCertificate?: boolean;
  /** Header / meta fields on custom templates and built-in PDF. */
  studentNameFillMode?: CertificateFillMode;
  classNameFillMode?: CertificateFillMode;
  classYearHebrewFillMode?: CertificateFillMode;
  termNameFillMode?: CertificateFillMode;
  dateFillMode?: CertificateFillMode;
  /** Per-profile overrides for static certificate label text (e.g. "מקצוע", "ציון"). */
  labelOverrides?: Record<string, string>;
};

/** Default label texts for the built-in certificate template. Keys match `CertificatePrefs.labelOverrides`. */
export const CERTIFICATE_LABEL_DEFAULTS: Record<string, string> = {
  besiata: 'בסיעתא דשמיא',
  title: 'תעודת הערכה',
  studentNameLabel: 'שם התלמידה:',
  classLabel: 'כיתה:',
  termLabel: 'מחצית:',
  cohortLabel: 'מחזור:',
  gradesSection: 'ציונים',
  subject: 'מקצוע',
  grade: 'ציון',
  comment: 'הערה',
  attendance: 'נוכחות',
  absences: 'חיסורים',
  lateness: 'איחורים',
  hourAbsences: 'חיסורי שעות',
  hourLateness: 'איחורי שעות',
  evaluation: 'הערכה',
  homeroomSig: 'חתימת המחנכת',
  principalSig: 'חתימת המנהלת',
  parentSig: 'חתימת ההורים',
  date: 'תאריך',
  generatedAt: 'נוצר:',
};

/** Pre-nikud'd label texts matching the built-in template when `CertificatePrefs.nikud` is true. */
export const CERTIFICATE_LABEL_DEFAULTS_NIKUD: Record<string, string> = {
  besiata: 'בְּסִיַּעְתָּא דִּשְׁמַיָּא',
  title: 'תְּעוּדַת הַעֲרָכָה',
  studentNameLabel: 'שֵׁם הַתַּלְמִידָה:',
  classLabel: 'כִּיתָּה:',
  termLabel: 'מַחֲצִית:',
  cohortLabel: 'מַחֲזוֹר:',
  gradesSection: 'צִיּוּנִים',
  subject: 'מִקְצוֹעַ',
  grade: 'צִיּוּן',
  comment: 'הֶעָרָה',
  attendance: 'נוֹכְחוּת',
  absences: 'חִסּוּרִים',
  lateness: 'אִחוּרִים',
  hourAbsences: 'חִסּוּרֵי שָׁעוֹת',
  hourLateness: 'אִחוּרֵי שָׁעוֹת',
  evaluation: 'הַעֲרָכָה',
  homeroomSig: 'חֲתִימַת הַמְּחַנֶּכֶת',
  principalSig: 'חֲתִימַת הַמְּנַהֶלֶת',
  parentSig: 'חֲתִימַת הַהוֹרִים',
  date: 'תַּאֲרִיךְ',
  generatedAt: 'נוֹצַר:',
};

export const CERTIFICATE_LABEL_DISPLAY_NAMES: Record<string, string> = {
  besiata: 'בסיעתא דשמיא',
  title: 'כותרת התעודה',
  studentNameLabel: 'תווית שם תלמידה',
  classLabel: 'תווית כיתה',
  termLabel: 'תווית מחצית',
  cohortLabel: 'תווית מחזור',
  gradesSection: 'כותרת טבלת ציונים',
  subject: 'עמודת מקצוע',
  grade: 'עמודת ציון',
  comment: 'עמודת הערה',
  attendance: 'כותרת נוכחות',
  absences: 'חיסורים',
  lateness: 'איחורים',
  hourAbsences: 'חיסורי שעות',
  hourLateness: 'איחורי שעות',
  evaluation: 'כותרת הערכה',
  homeroomSig: 'חתימת המחנכת',
  principalSig: 'חתימת המנהלת',
  parentSig: 'חתימת ההורים',
  date: 'תאריך',
  generatedAt: 'שורת תאריך יצירה',
};

export function certificateSubjectLabel(
  subjectName: string,
  groupName: string | null | undefined,
  showGroup: boolean,
): string {
  const subject = subjectName.trim();
  const group = groupName?.trim();
  if (showGroup && group) {
    return `${subject}-${group}`;
  }
  return subject;
}
