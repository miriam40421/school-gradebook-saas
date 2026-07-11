import type { CertificatePrefs } from './certificate';

export type CertificateSupplementDto = {
  studentId: string;
  studentName?: string;
  absences?: string | null;
  lateness?: string | null;
  hourAbsences?: string | null;
  hourLateness?: string | null;
  evaluation?: string | null;
  homeroomSignature?: string | null;
  principalSignature?: string | null;
  gradeComments?: Record<string, string | null>;
  /** Per-student nikud overrides: keys like "student.fullName", "grade.<id>" */
  nikudOverrides?: Record<string, string>;
  updatedAt?: string;
};

export type CertificateSupplementSubjectDto = {
  id: string;
  name: string;
  gradingSetTypeId: string;
  gradingSetTypeLabel: string;
  categoryId: string;
  categoryLabel: string;
  subCategoryId: string | null;
  subCategoryLabel: string | null;
};

export type CertificateSupplementContextDto = {
  certificatePrefs: CertificatePrefs;
  certificateProfileId: string | null;
  certificateProfileName: string | null;
  class: {
    id: string;
    name: string;
    year: number;
    yearHebrew: string | null;
  };
  term: {
    id: string;
    name: string;
  };
  subjects: CertificateSupplementSubjectDto[];
  supplements: CertificateSupplementDto[];
  customTextBlocks?: Array<{ id: string; text: string }>;
  /** Class-wide nikud overrides: subject names, category names, class/term name */
  nikudClassOverrides?: Record<string, string>;
};

export type UpsertCertificateSupplementItemDto = {
  studentId: string;
  absences?: string | null;
  lateness?: string | null;
  hourAbsences?: string | null;
  hourLateness?: string | null;
  evaluation?: string | null;
  homeroomSignature?: string | null;
  principalSignature?: string | null;
  gradeComments?: Record<string, string | null>;
  nikudOverrides?: Record<string, string>;
};

export type UpsertCertificateSupplementsDto = {
  classId: string;
  termId: string;
  items: UpsertCertificateSupplementItemDto[];
};

export type CertificateSnapshotSignaturesDto = {
  homeroom?: string | null;
  principal?: string | null;
  parent?: string | null;
};

export type CertificateSupplementInput = {
  absences?: string | null;
  lateness?: string | null;
  hourAbsences?: string | null;
  hourLateness?: string | null;
  evaluation?: string | null;
  homeroomSignature?: string | null;
  principalSignature?: string | null;
  gradeComments?: Record<string, string | null>;
  nikudOverrides?: Record<string, string>;
};
