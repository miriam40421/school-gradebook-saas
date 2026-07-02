import type { CertificatePrefs } from './certificate';
import { normalizeCertificatePrefs } from './certificate-fill';

export type CertificateProfileDto = {
  id: string;
  name: string;
  certificate: CertificatePrefs;
  templateKey?: string;
  templateId?: string | null;
  /** Explicit allow-list; omitted or empty = all school subjects (legacy). */
  subjectIds?: string[];
};

export type SchoolCertificateSettingsJson = {
  certificate?: CertificatePrefs;
  certificateProfiles?: CertificateProfileDto[];
  defaultCertificateProfileId?: string | null;
  certificateTemplateKey?: string;
};

export const DEFAULT_CERTIFICATE_PROFILE_ID = 'default';

function normalizeProfileSubjectIds(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  );
  return ids;
}

export function normalizeCertificateProfiles(
  settings: SchoolCertificateSettingsJson | Record<string, unknown> | null | undefined,
): {
  profiles: CertificateProfileDto[];
  defaultProfileId: string | null;
} {
  const raw = (settings ?? {}) as SchoolCertificateSettingsJson;
  if (Array.isArray(raw.certificateProfiles) && raw.certificateProfiles.length > 0) {
    const profiles = raw.certificateProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      templateKey: p.templateKey,
      templateId:
        p.templateId === null || p.templateId === undefined
          ? p.templateId ?? undefined
          : typeof p.templateId === 'string' && p.templateId.trim()
            ? p.templateId.trim()
            : null,
      subjectIds: normalizeProfileSubjectIds(p.subjectIds),
      certificate: normalizeCertificatePrefs(p.certificate ?? {}),
    }));
    return {
      profiles,
      defaultProfileId:
        raw.defaultCertificateProfileId ?? profiles[0]?.id ?? null,
    };
  }

  const legacy = normalizeCertificatePrefs(raw.certificate ?? {});
  return {
    profiles: [
      {
        id: DEFAULT_CERTIFICATE_PROFILE_ID,
        name: 'ברירת מחדל',
        certificate: legacy,
        templateKey:
          typeof raw.certificateTemplateKey === 'string'
            ? raw.certificateTemplateKey
            : undefined,
      },
    ],
    defaultProfileId: DEFAULT_CERTIFICATE_PROFILE_ID,
  };
}

export function resolveCertificateProfile(
  settings: SchoolCertificateSettingsJson | Record<string, unknown> | null | undefined,
  certificateProfileId?: string | null,
): CertificateProfileDto | null {
  const { profiles, defaultProfileId } = normalizeCertificateProfiles(settings);
  const profileId = certificateProfileId ?? defaultProfileId;
  return (
    profiles.find((p) => p.id === profileId) ??
    profiles.find((p) => p.id === defaultProfileId) ??
    profiles[0] ??
    null
  );
}

export function resolveCertificatePrefsForClass(
  settings: SchoolCertificateSettingsJson | Record<string, unknown> | null | undefined,
  certificateProfileId?: string | null,
): CertificatePrefs {
  const profile = resolveCertificateProfile(settings, certificateProfileId);
  return profile?.certificate ?? normalizeCertificatePrefs({});
}

/**
 * Subjects included on a certificate for the given profile.
 * `subjectIds` omitted = all subjects; explicit array filters and preserves order.
 */
export function resolveProfileSubjects<T extends { id: string }>(
  profile: CertificateProfileDto | null | undefined,
  allSubjects: T[],
): T[] {
  const ids = profile?.subjectIds;
  if (ids === undefined) return allSubjects;
  if (ids.length === 0) return [];
  const order = new Map(ids.map((id, index) => [id, index]));
  return allSubjects
    .filter((s) => order.has(s.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Short label for profile pickers — includes computer-fill sections when configured. */
export function formatCertificateProfileLabel(profile: CertificateProfileDto): string {
  const p = normalizeCertificatePrefs(profile.certificate);
  const computerParts: string[] = [];
  if (p.commentPerGrade && p.gradeCommentsFillMode === 'computer') {
    computerParts.push('הערות');
  }
  if (p.evaluation && p.evaluationFillMode === 'computer') {
    computerParts.push('הערכה');
  }
  const attendanceOn =
    p.absences || p.lateness || p.hourAbsences || p.hourLateness;
  if (attendanceOn && p.attendanceFillMode === 'computer') {
    computerParts.push('נוכחות');
  }
  if (p.signatures && p.signaturesFillMode === 'computer') {
    computerParts.push('חתימות');
  }
  const fillHint =
    computerParts.length > 0
      ? `מילוי במחשב: ${computerParts.join(', ')}`
      : 'מילוי בכתב יד';
  return `${profile.name} (${fillHint})`;
}

export function resolveCertificateTemplateKeyForClass(
  settings: SchoolCertificateSettingsJson | Record<string, unknown> | null | undefined,
  certificateProfileId?: string | null,
): string {
  const raw = (settings ?? {}) as SchoolCertificateSettingsJson;
  const profile = resolveCertificateProfile(settings, certificateProfileId);
  const fromProfile = profile?.templateKey?.trim();
  if (fromProfile) return fromProfile;
  const legacy = raw.certificateTemplateKey;
  return typeof legacy === 'string' && legacy.trim()
    ? legacy.trim()
    : 'default-rtl';
}
