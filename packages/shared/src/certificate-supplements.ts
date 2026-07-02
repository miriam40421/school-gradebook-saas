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
  updatedAt?: string;
};

export type CertificateSupplementSubjectDto = {
  id: string;
  name: string;
  gradingSetTypeLabel: string;
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
  subjects: CertificateSupplementSubjectDto[];
  supplements: CertificateSupplementDto[];
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
};
