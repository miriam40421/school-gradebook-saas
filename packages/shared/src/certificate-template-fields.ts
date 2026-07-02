import type { CertificatePrefs } from './certificate';
import type { AttendanceFieldKey, SignatureFieldKey } from './certificate-templates';

export const CERTIFICATE_FIELD_LABELS: Record<string, string> = {
  studentName: 'שם התלמידה',
  className: 'כיתה',
  classYearHebrew: 'מחזור',
  cohort: 'מחזור',
  termName: 'מחצית',
  date: 'תאריך',
};

export const CERTIFICATE_FIELD_LABELS_NIKUD: Record<string, string> = {
  studentName: 'שֵׁם הַתַּלְמִידָה',
  className: 'כִּיתָּה',
  classYearHebrew: 'מַחֲזוֹר',
  cohort: 'מַחֲזוֹר',
  termName: 'מַחֲצִית',
  date: 'תַּאֲרִיךְ',
};

/** Fields rendered left-to-right in `header_meta_row` (RTL: student name on the right). */
export const HEADER_META_ROW_FIELD_KEYS = [
  'studentName',
  'className',
  'termName',
  'classYearHebrew',
] as const;

export type HeaderMetaRowFieldKey = (typeof HEADER_META_ROW_FIELD_KEYS)[number];

export function certificateFieldLabel(fieldKey: string, nikud?: boolean): string | null {
  if (nikud) return CERTIFICATE_FIELD_LABELS_NIKUD[fieldKey] ?? CERTIFICATE_FIELD_LABELS[fieldKey] ?? null;
  return CERTIFICATE_FIELD_LABELS[fieldKey] ?? null;
}

export function headerMetaFieldVisible(
  prefs: CertificatePrefs,
  fieldKey: string,
): boolean {
  switch (fieldKey) {
    case 'studentName':
      return prefs.showStudentNameOnCertificate !== false;
    case 'className':
      return prefs.showClassNameOnCertificate !== false;
    case 'termName':
      return prefs.showTermNameOnCertificate !== false;
    case 'classYearHebrew':
    case 'cohort':
      return Boolean(prefs.showClassYearHebrew);
    default:
      return true;
  }
}

export function attendanceFieldEnabled(
  prefs: CertificatePrefs,
  fieldKey: AttendanceFieldKey,
): boolean {
  return Boolean(prefs[fieldKey]);
}

export function resolveAttendanceFieldValue(
  fieldKey: AttendanceFieldKey,
  attendance: {
    absences?: string | null;
    lateness?: string | null;
    hourAbsences?: string | null;
    hourLateness?: string | null;
  } | undefined,
): string | null | undefined {
  if (!attendance) return null;
  return attendance[fieldKey] ?? null;
}
