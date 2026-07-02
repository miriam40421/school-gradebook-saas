import type { CertificateSnapshotJsonV1 } from './certificates';
import type { SchoolCertificateSettingsJson } from './certificate-profiles';
import { resolveCertificateProfile } from './certificate-profiles';

export type CertificateTemplateOrientation = 'portrait' | 'landscape';

/** Default body font size (pt) for new certificate layout blocks. */
export const DEFAULT_CERTIFICATE_FONT_SIZE_PT = 13;

export type CertificatePageBackgroundImageMode = 'none' | 'full' | 'corner';
export type CertificatePageBackgroundImageFit = 'cover' | 'contain';

export type CertificateTemplatePageV1 = {
  orientation: CertificateTemplateOrientation;
  backgroundColor: string;
  paddingMm: { top: number; right: number; bottom: number; left: number };
  backgroundImageStorageKey?: string | null;
  backgroundImageMode?: CertificatePageBackgroundImageMode;
  backgroundImageFit?: CertificatePageBackgroundImageFit;
};

/** Apply defaults for optional page background fields. */
export function normalizeCertificateTemplatePage(
  page: CertificateTemplatePageV1,
): CertificateTemplatePageV1 & {
  backgroundImageStorageKey: string | null;
  backgroundImageMode: CertificatePageBackgroundImageMode;
  backgroundImageFit: CertificatePageBackgroundImageFit;
} {
  const key = page.backgroundImageStorageKey?.trim() || null;
  const requestedMode = page.backgroundImageMode ?? 'none';
  const mode: CertificatePageBackgroundImageMode = key
    ? requestedMode === 'corner'
      ? 'corner'
      : requestedMode === 'full'
        ? 'full'
        : 'full'
    : 'none';
  return {
    ...page,
    backgroundImageStorageKey: key,
    backgroundImageMode: mode,
    backgroundImageFit: page.backgroundImageFit === 'contain' ? 'contain' : 'cover',
  };
}

export type LayoutBoxMm = {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
};

export type LayoutBlockStyle = {
  fontFamily: string;
  fontSizePt: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  textAlign: 'right' | 'center' | 'left';
  backgroundColor: string;
};

export type StaticTextBlockProps = { text: string };
export type LogoBlockProps = {
  storageKey: string | null;
  objectFit: 'contain' | 'cover';
};
export type FieldBlockProps = {
  fieldKey:
    | 'studentName'
    | 'className'
    | 'termName'
    | 'schoolName'
    | 'classYearHebrew'
    | 'cohort'
    | 'profileName';
};
export type GradesTableBlockProps = {
  showHeader: boolean;
  headerLabels: { subject: string; grade: string; comment: string };
  /** When set, table shows only this parent category (one table per category). */
  categoryId?: string | null;
  /** Show category title row inside table (default false when categoryId set). */
  showCategoryTitle?: boolean;
  /**
   * When true, sub-category heading rows appear inside the table (in addition to parent subjects).
   * When omitted, follows school pref `showSubCategoriesOnCertificate`.
   */
  showSubCategoryRows?: boolean;
};

export const DEFAULT_GRADES_TABLE_HEADER_LABELS = {
  subject: 'מקצוע',
  grade: 'ציון',
  comment: 'הערה',
} as const;

export const DEFAULT_GRADES_TABLE_HEADER_LABELS_NIKUD = {
  subject: 'מִקְצוֹעַ',
  grade: 'צִיּוּן',
  comment: 'הֶעָרָה',
} as const;

export type AttendanceBlockProps = {
  showAbsences: boolean;
  showLateness: boolean;
  showHourAbsences: boolean;
  showHourLateness: boolean;
};

export const ATTENDANCE_FIELD_KEYS = [
  'absences',
  'lateness',
  'hourAbsences',
  'hourLateness',
] as const;
export type AttendanceFieldKey = (typeof ATTENDANCE_FIELD_KEYS)[number];

export const DEFAULT_ATTENDANCE_FIELD_LABELS: Record<AttendanceFieldKey, string> = {
  absences: 'חיסורים',
  lateness: 'איחורים',
  hourAbsences: 'חיסורי שעות',
  hourLateness: 'איחורי שעות',
};

export const DEFAULT_ATTENDANCE_FIELD_LABELS_NIKUD: Record<AttendanceFieldKey, string> = {
  absences: 'חִסּוּרִים',
  lateness: 'אִחוּרִים',
  hourAbsences: 'חִסּוּרֵי שָׁעוֹת',
  hourLateness: 'אִחוּרֵי שָׁעוֹת',
};

export type AttendanceFieldBlockProps = {
  fieldKey: AttendanceFieldKey;
  label: string;
};

export type EvaluationBlockProps = { title: string };
export type SignaturesBlockProps = {
  labels: { homeroom: string; principal: string; parent: string };
};

export const SIGNATURE_FIELD_KEYS = ['homeroom', 'principal', 'parent'] as const;
export type SignatureFieldKey = (typeof SIGNATURE_FIELD_KEYS)[number];

export const DEFAULT_SIGNATURE_FIELD_LABELS: Record<SignatureFieldKey, string> = {
  homeroom: 'חתימת המחנכת',
  principal: 'חתימת המנהלת',
  parent: 'חתימת ההורים',
};

export type SignatureFieldBlockProps = {
  signatureKey: SignatureFieldKey;
  label: string;
};

export type DateBlockProps = { format: 'hebrew' };

/** Single RTL row: student name, class, term, cohort — fill mode per school prefs. */
export type HeaderMetaRowBlockProps = Record<string, never>;

export type LayoutBlockType =
  | 'static_text'
  | 'logo'
  | 'field'
  | 'header_meta_row'
  | 'grades_table'
  | 'attendance'
  | 'attendance_field'
  | 'evaluation'
  | 'signatures'
  | 'signature_field'
  | 'date';

export type LayoutBlockBase = {
  id: string;
  type: LayoutBlockType;
  box: LayoutBoxMm;
  style: LayoutBlockStyle;
};

export type LayoutBlock =
  | (LayoutBlockBase & { type: 'static_text'; props: StaticTextBlockProps })
  | (LayoutBlockBase & { type: 'logo'; props: LogoBlockProps })
  | (LayoutBlockBase & { type: 'field'; props: FieldBlockProps })
  | (LayoutBlockBase & { type: 'header_meta_row'; props: HeaderMetaRowBlockProps })
  | (LayoutBlockBase & { type: 'grades_table'; props: GradesTableBlockProps })
  | (LayoutBlockBase & { type: 'attendance'; props: AttendanceBlockProps })
  | (LayoutBlockBase & { type: 'attendance_field'; props: AttendanceFieldBlockProps })
  | (LayoutBlockBase & { type: 'evaluation'; props: EvaluationBlockProps })
  | (LayoutBlockBase & { type: 'signatures'; props: SignaturesBlockProps })
  | (LayoutBlockBase & { type: 'signature_field'; props: SignatureFieldBlockProps })
  | (LayoutBlockBase & { type: 'date'; props: DateBlockProps });

export type CertificateTemplateLayoutV1 = {
  layoutSchemaVersion: 1;
  page: CertificateTemplatePageV1;
  blocks: LayoutBlock[];
};

export type CertificateTemplateSummaryDto = {
  id: string;
  name: string;
  orientation: CertificateTemplateOrientation;
  layoutVersion: number;
  updatedAt: string;
};

export type CertificateTemplateDetailDto = CertificateTemplateSummaryDto & {
  layoutJson: CertificateTemplateLayoutV1;
  layoutSchemaVersion: number;
  logoStorageKey?: string | null;
};

export type CreateCertificateTemplateDto = {
  name: string;
  orientation: CertificateTemplateOrientation;
};

export type UpdateCertificateTemplateDto = {
  name?: string;
  layoutJson?: CertificateTemplateLayoutV1;
};

export type CertificateTemplateLogoUploadResultDto = {
  storageKey: string;
};

export type ResolvedCertificateTemplate = {
  templateId: string | null;
  templateKey: string;
  useBuiltIn: boolean;
};

export function resolveCertificateTemplateForProfile(
  settings: SchoolCertificateSettingsJson | Record<string, unknown> | null | undefined,
  certificateProfileId?: string | null,
): ResolvedCertificateTemplate {
  const profile = resolveCertificateProfile(settings, certificateProfileId);
  const templateId =
    profile?.templateId && profile.templateId.trim()
      ? profile.templateId.trim()
      : null;
  const templateKey = profile?.templateKey?.trim() || 'default-rtl';
  return {
    templateId,
    templateKey,
    useBuiltIn: !templateId,
  };
}

export const A4_DIMENSIONS_MM: Record<
  CertificateTemplateOrientation,
  { width: number; height: number }
> = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
};
