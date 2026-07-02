import type { CertificatePrefs } from './certificate';
import type { CertificateFillView } from './certificate-fill';

export type GenerateCertificatesDto = {
  classId: string;
  termId: string;
  studentIds?: string[];
};

export type GenerateCertificateResultItemDto = {
  studentId: string;
  snapshotId?: string;
  ok: boolean;
  error?: string;
};

export type GenerateCertificatesResultDto = {
  results: GenerateCertificateResultItemDto[];
};

export type CertificateSnapshotSummaryDto = {
  id: string;
  studentId: string;
  studentName: string;
  createdAt: string;
  hasPdf: boolean;
};

export type CertificateSnapshotSubjectDto = {
  subjectId: string;
  subjectName: string;
  value: string | null;
  /** Placeholder for future comment field; empty when no comment stored. */
  comment?: string | null;
  /** Whether this subject row includes a per-grade comment column. */
  showComment?: boolean;
  categoryId?: string;
  categoryLabel?: string;
  subCategoryId?: string | null;
  subCategoryLabel?: string | null;
};

export type CertificateSnapshotSubCategoryDto = {
  subCategoryId: string;
  subCategoryLabel: string;
  subjects: CertificateSnapshotSubjectDto[];
};

export type CertificateSnapshotCategoryDto = {
  categoryId: string;
  categoryLabel: string;
  /** When true, grade tables for this category include a comment column. */
  showComment?: boolean;
  subjects: CertificateSnapshotSubjectDto[];
  subCategories?: CertificateSnapshotSubCategoryDto[];
};

export type CertificateSnapshotJsonV1 = {
  schemaVersion: 1;
  templateKey: string;
  /** Custom school template id when layout renderer used. */
  templateId?: string | null;
  templateLayoutVersion?: number | null;
  pageOrientation?: 'portrait' | 'landscape' | null;
  generatedAt: string;
  /** Hebrew display date when `dateOnCertificate` pref is on. */
  displayDate?: string | null;
  school: { id: string; name: string };
  class: {
    id: string;
    name: string;
    year: number | null;
    /** Hebrew year / cohort when `showClassYearHebrew` pref is on. */
    yearHebrew?: string | null;
    /** Alias for `yearHebrew` on generated certificates. */
    cohort?: string | null;
  };
  term: { id: string; name: string };
  student: { id: string; fullName: string };
  /** Profile display name when `showProfileNameOnCertificate` pref is on. */
  certificateProfileName?: string | null;
  /** Homeroom evaluation text when pref is on. */
  evaluation?: string | null;
  /** Resolved fill-mode flags for PDF template. */
  fill: CertificateFillView;
  /** Flat list (legacy / API consumers). */
  subjects: CertificateSnapshotSubjectDto[];
  /** Grouped for PDF — one table per category. */
  subjectCategories: CertificateSnapshotCategoryDto[];
  /** True when at least one subject row includes a per-grade comment column. */
  showAnyGradeComment?: boolean;
  certificatePrefs: CertificatePrefs;
  /** Attendance placeholders (data entry deferred; structure only). */
  attendance?: {
    absences?: string | null;
    lateness?: string | null;
    hourAbsences?: string | null;
    hourLateness?: string | null;
  };
  /** Signature text when computer fill mode is on. */
  signatures?: {
    homeroom?: string | null;
    principal?: string | null;
    parent?: string | null;
  };
};

export type CertificateSnapshotDetailDto = CertificateSnapshotSummaryDto & {
  snapshotJson: CertificateSnapshotJsonV1;
  classId: string;
  termId: string;
};

export type TermLockedErrorDto = {
  code: 'TERM_LOCKED';
  message: string;
};

export const TERM_LOCKED_CODE = 'TERM_LOCKED' as const;
