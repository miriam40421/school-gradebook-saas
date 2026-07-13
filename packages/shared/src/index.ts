import type { LockStatusDto } from './locks';

export enum Role {
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  HomeroomTeacher = 'homeroom_teacher',
  SubjectTeacher = 'subject_teacher',
}

export const ROLES = [Role.SuperAdmin, Role.Admin, Role.HomeroomTeacher, Role.SubjectTeacher] as const;

export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUserDto;
};

export type SchoolSummary = {
  id: string;
  name: string;
};

export type GradingTermDto = {
  id: string;
  name: string;
  isLocked: boolean;
};

export type GradebookSubjectDto = {
  id: string;
  name: string;
  gradingSetTypeId: string;
  gradingSetTypeLabel: string;
  /** Header group for gradebook / certificate fill table (parent or sub-category). */
  categoryGroupId: string;
  categoryGroupLabel: string;
  /** Root category when subject sits under a sub-category. */
  parentCategoryGroupId: string;
  parentCategoryGroupLabel: string;
  allowedLabels: string[];
};

export type GradebookStudentDto = {
  id: string;
  fullName: string;
  classGroupId?: string | null;
};

export type GradebookEntryDto = {
  studentId: string;
  subjectId: string;
  value: string | null;
  version: number;
  updatedAt: string;
  teacherId: string;
};

export type GradebookMatrixDto = {
  term: GradingTermDto;
  class: { id: string; name: string; year: number };
  classGroupId?: string | null;
  showSubCategoriesOnCertificate?: boolean;
  subjects: GradebookSubjectDto[];
  students: GradebookStudentDto[];
  entries: GradebookEntryDto[];
  editableSubjectIds: string[];
  locks?: LockStatusDto[];
};

export type BulkGradeUpdateItemDto = {
  studentId: string;
  subjectId: string;
  value: string | null;
};

export type BulkGradeUpdateDto = {
  classId: string;
  termId: string;
  updates: BulkGradeUpdateItemDto[];
};

export type BulkGradeUpdateResultDto = {
  entries: GradebookEntryDto[];
};

export {
  LOCK_TTL_MINUTES,
  LOCK_HEARTBEAT_INTERVAL_SEC,
  type LockScopeDto,
  type LockStatusDto,
  type AcquireLockRequestDto,
  type AcquireLockResultDto,
  type LockConflictDto,
  type LockHolderDto,
  type ReleaseLockRequestDto,
  type HeartbeatLockRequestDto,
} from './locks';

export {
  certificateSubjectLabel,
  CERTIFICATE_LABEL_DEFAULTS,
  CERTIFICATE_LABEL_DEFAULTS_NIKUD,
  CERTIFICATE_LABEL_DISPLAY_NAMES,
  type CertificatePrefs,
} from './certificate';

export {
  type CertificateFillMode,
  type CertificateFillView,
  EVALUATION_HANDWRITTEN_LINE_COUNT,
  normalizeCertificatePrefs,
  commentPerGradeForCategory,
  certificateFillView,
  certificateFieldHandwritten,
  signatureTypeEnabled,
  type SignatureType,
} from './certificate-fill';

export {
  attendanceFieldEnabled,
  resolveAttendanceFieldValue,
  CERTIFICATE_FIELD_LABELS,
  CERTIFICATE_FIELD_LABELS_NIKUD,
  HEADER_META_ROW_FIELD_KEYS,
  certificateFieldLabel,
  headerMetaFieldVisible,
  type HeaderMetaRowFieldKey,
} from './certificate-template-fields';

export {
  buildGradingTypeMap,
  buildGradingTypeAncestorChain,
  resolveSubjectCategoryPlacement,
  subjectCategoryGroup,
  subjectCategoryColumns,
  type GradingSetTypeNode,
} from './grading-category.util';

export {
  DEFAULT_CERTIFICATE_PROFILE_ID,
  normalizeCertificateProfiles,
  resolveCertificatePrefsForClass,
  resolveCertificateProfile,
  formatCertificateProfileLabel,
  resolveCertificateTemplateKeyForClass,
  resolveProfileSubjects,
  type CertificateProfileDto,
  type SchoolCertificateSettingsJson,
} from './certificate-profiles';

export {
  type CertificateTemplateOrientation,
  type CertificateTemplateSummaryDto,
  type CertificateTemplateDetailDto,
  type CertificateTemplateLayoutV1,
  type LayoutBlock,
  type LayoutBlockType,
  type AttendanceFieldKey,
  type SignatureFieldKey,
  ATTENDANCE_FIELD_KEYS,
  SIGNATURE_FIELD_KEYS,
  DEFAULT_ATTENDANCE_FIELD_LABELS,
  DEFAULT_ATTENDANCE_FIELD_LABELS_NIKUD,
  DEFAULT_GRADES_TABLE_HEADER_LABELS,
  DEFAULT_GRADES_TABLE_HEADER_LABELS_NIKUD,
  DEFAULT_SIGNATURE_FIELD_LABELS,
  type CreateCertificateTemplateDto,
  type UpdateCertificateTemplateDto,
  type CertificateTemplateLogoUploadResultDto,
  type CertificateTemplatePageV1,
  type CertificatePageBackgroundImageMode,
  type CertificatePageBackgroundImageFit,
  normalizeCertificateTemplatePage,
  type ResolvedCertificateTemplate,
  resolveCertificateTemplateForProfile,
  A4_DIMENSIONS_MM,
  DEFAULT_CERTIFICATE_FONT_SIZE_PT,
} from './certificate-templates';

export {
  type GenerateCertificatesDto,
  type GenerateCertificateResultItemDto,
  type GenerateCertificatesResultDto,
  type CertificateSnapshotSummaryDto,
  type CertificateSnapshotSubjectDto,
  type CertificateSnapshotSubCategoryDto,
  type CertificateSnapshotCategoryDto,
  type CertificateSnapshotJsonV1,
  type CertificateSnapshotDetailDto,
  type TermLockedErrorDto,
  TERM_LOCKED_CODE,
} from './certificates';

export {
  type CertificateSupplementDto,
  type CertificateSupplementSubjectDto,
  type CertificateSupplementContextDto,
  type UpsertCertificateSupplementItemDto,
  type UpsertCertificateSupplementsDto,
  type CertificateSnapshotSignaturesDto,
  type CertificateSupplementInput,
} from './certificate-supplements';

export {
  compareByFamilyName,
  familyNameSortKey,
  formatStudentDisplayName,
  formatStudentFullName,
  normalizeStudentFullName,
  sortByFamilyName,
  splitStudentFullName,
} from './student-name';
