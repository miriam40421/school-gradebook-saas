'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { HelpCircle, Save, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { apiFetch } from '@/lib/api';
import type { CertificateFillMode, CertificatePrefs, CertificateProfileDto, CertificateTemplateSummaryDto } from '@school/shared';
import {
  DEFAULT_CERTIFICATE_PROFILE_ID,
  commentPerGradeForCategory,
  formatCertificateProfileLabel,
  normalizeCertificatePrefs,
  normalizeCertificateProfiles,
} from '@school/shared';
import { he, translateApiError } from '@/lib/he';
import { randomUUID } from '@/lib/uuid';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox, CheckboxGroup } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

type School = {
  id: string;
  name: string;
  settingsJson: Record<string, unknown> & { certificate?: CertificatePrefs };
};

type SubjectRef = {
  id: string;
  name: string;
  gradingSetTypeId: string;
  gradingSetType: { id: string; label: string };
};

type GradingSetTypeRef = {
  id: string;
  label: string;
  parentId?: string | null;
};

type ProfileSubjectSubGroup = {
  subCategoryId: string | null;
  subCategoryLabel: string | null;
  subjects: SubjectRef[];
};

type ProfileSubjectParentGroup = {
  parentId: string;
  parentLabel: string;
  subGroups: ProfileSubjectSubGroup[];
};

function isProfileSubjectSelected(profile: CertificateProfileDto, subjectId: string): boolean {
  const ids = profile.subjectIds;
  if (ids === undefined) return true;
  return ids.includes(subjectId);
}

function countProfileSubjects(profile: CertificateProfileDto, total: number): number {
  if (profile.subjectIds === undefined) return total;
  return profile.subjectIds.length;
}

function isCommentCategorySelected(cert: CertificatePrefs, categoryId: string): boolean {
  return commentPerGradeForCategory(cert, categoryId);
}

function countCommentCategories(cert: CertificatePrefs, total: number): number {
  if (!cert.commentPerGrade) return 0;
  const ids = cert.commentPerGradeCategoryIds;
  if (ids === undefined) return total;
  return ids.length;
}

const defaultCert: CertificatePrefs = normalizeCertificatePrefs({
  commentPerGrade: true,
  absences: true,
  lateness: true,
  hourAbsences: true,
  hourLateness: true,
  evaluation: true,
  showClassYearHebrew: true,
  signatures: true,
  dateOnCertificate: true,
  showSubjectGroupOnCertificate: false,
  showSubCategoriesOnCertificate: true,
  gradesFillMode: 'computer',
  gradeCommentsFillMode: 'handwritten',
  attendanceFillMode: 'handwritten',
  evaluationFillMode: 'handwritten',
  signaturesFillMode: 'handwritten',
  studentNameFillMode: 'computer',
  classNameFillMode: 'computer',
  classYearHebrewFillMode: 'computer',
  termNameFillMode: 'computer',
  dateFillMode: 'computer',
});

function FillModeToggle({
  groupName,
  value,
  onChange,
}: {
  groupName: string;
  value: CertificateFillMode;
  onChange: (mode: CertificateFillMode) => void;
}) {
  const options: { mode: CertificateFillMode; label: string }[] = [
    { mode: 'computer', label: he.certFillComputer },
    { mode: 'handwritten', label: he.certFillHandwritten },
  ];
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-border bg-surface-raised p-0.5">
      {options.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          name={groupName}
          onClick={() => onChange(opt.mode)}
          aria-pressed={value === opt.mode}
          className={cn(
            'ui-segment px-3 py-1 text-xs font-semibold transition-colors',
            value === opt.mode ? 'is-selected' : 'text-text-muted',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-b border-border pb-2 pt-5 text-sm font-semibold text-text first:pt-0">
      {children}
    </h3>
  );
}

function FieldRow({
  label,
  description,
  toggleable,
  enabled,
  onToggle,
  showFillMode,
  fillGroupName,
  fillMode,
  onFillModeChange,
  children,
}: {
  label: string;
  description?: string;
  toggleable?: boolean;
  enabled?: boolean;
  onToggle?: () => void;
  showFillMode?: boolean;
  fillGroupName?: string;
  fillMode?: CertificateFillMode;
  onFillModeChange?: (m: CertificateFillMode) => void;
  children?: ReactNode;
}) {
  const isOn = toggleable ? !!enabled : true;
  return (
    <div className={cn('border-b border-border py-3 last:border-b-0', !isOn && 'opacity-45')}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {toggleable && onToggle && (
            <ToggleSwitch checked={isOn} onChange={onToggle} aria-label={label} />
          )}
          <div className="min-w-0">
            <span className="text-sm text-text">{label}</span>
            {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
          </div>
        </div>
        {showFillMode && isOn && fillMode && onFillModeChange && (
          <FillModeToggle
            groupName={fillGroupName ?? label}
            value={fillMode}
            onChange={onFillModeChange}
          />
        )}
      </div>
      {isOn && children && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

export default function CertificateProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['school'],
    queryFn: () => apiFetch<School>('/school'),
  });

  const [cert, setCert] = useState<CertificatePrefs>(defaultCert);
  const [profiles, setProfiles] = useState<CertificateProfileDto[]>([]);
  const [activeProfileId, setActiveProfileId] = useState(DEFAULT_CERTIFICATE_PROFILE_ID);
  const [defaultProfileId, setDefaultProfileId] = useState<string | null>(
    DEFAULT_CERTIFICATE_PROFILE_ID,
  );
  const [newProfileName, setNewProfileName] = useState('');
  const [copyFromProfileId, setCopyFromProfileId] = useState('');

  const { data: schoolSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiFetch<SubjectRef[]>('/subjects'),
  });

  const { data: gradingSetTypes = [] } = useQuery({
    queryKey: ['grading-set-types'],
    queryFn: () => apiFetch<GradingSetTypeRef[]>('/grading-set-types'),
  });

  const { data: certTemplates = [] } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => apiFetch<CertificateTemplateSummaryDto[]>('/certificate-templates'),
  });

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const subjectsByParentCategory = useMemo((): ProfileSubjectParentGroup[] => {
    const typeById = new Map(gradingSetTypes.map((t) => [t.id, t]));

    const rootOf = (typeId: string): { id: string; label: string } => {
      const type = typeById.get(typeId);
      if (!type) {
        const subject = schoolSubjects.find((s) => s.gradingSetTypeId === typeId);
        return { id: typeId, label: subject?.gradingSetType.label ?? typeId };
      }
      if (!type.parentId) return { id: type.id, label: type.label };
      return rootOf(type.parentId);
    };

    const parentMap = new Map<
      string,
      { parentLabel: string; subGroups: Map<string, ProfileSubjectSubGroup> }
    >();

    for (const subject of schoolSubjects) {
      const type = typeById.get(subject.gradingSetTypeId);
      let parentId: string;
      let parentLabel: string;
      let subCategoryId: string | null;
      let subCategoryLabel: string | null;

      if (type?.parentId) {
        const root = rootOf(type.id);
        parentId = root.id;
        parentLabel = root.label;
        subCategoryId = type.id;
        subCategoryLabel = type.label;
      } else {
        parentId = subject.gradingSetTypeId;
        parentLabel = type?.label ?? subject.gradingSetType.label;
        subCategoryId = null;
        subCategoryLabel = null;
      }

      const subKey = subCategoryId ?? '__root__';
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, { parentLabel, subGroups: new Map() });
      }
      const parent = parentMap.get(parentId)!;
      if (!parent.subGroups.has(subKey)) {
        parent.subGroups.set(subKey, { subCategoryId, subCategoryLabel, subjects: [] });
      }
      parent.subGroups.get(subKey)!.subjects.push(subject);
    }

    return [...parentMap.entries()]
      .map(([parentId, { parentLabel, subGroups }]) => ({
        parentId,
        parentLabel,
        subGroups: [...subGroups.values()]
          .map((g) => ({
            ...g,
            subjects: [...g.subjects].sort((a, b) => a.name.localeCompare(b.name, 'he')),
          }))
          .sort((a, b) => {
            if (!a.subCategoryLabel) return -1;
            if (!b.subCategoryLabel) return 1;
            return a.subCategoryLabel.localeCompare(b.subCategoryLabel, 'he');
          }),
      }))
      .sort((a, b) => a.parentLabel.localeCompare(b.parentLabel, 'he'));
  }, [schoolSubjects, gradingSetTypes]);

  useEffect(() => {
    if (!data?.settingsJson) return;
    const normalized = normalizeCertificateProfiles(data.settingsJson);
    setProfiles(normalized.profiles);
    setDefaultProfileId(normalized.defaultProfileId);
    setActiveProfileId((prev) => {
      const keep = normalized.profiles.find((p) => p.id === prev);
      const nextId =
        keep?.id ?? normalized.profiles[0]?.id ?? DEFAULT_CERTIFICATE_PROFILE_ID;
      const profile = normalized.profiles.find((p) => p.id === nextId);
      if (profile) setCert(profile.certificate);
      return nextId;
    });
  }, [data?.settingsJson]);

  const syncCertToProfile = (nextCert: CertificatePrefs) => {
    setCert(nextCert);
    setProfiles((prev) =>
      prev.map((p) => (p.id === activeProfileId ? { ...p, certificate: nextCert } : p)),
    );
  };

  const selectProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setActiveProfileId(profileId);
    setCert(profile.certificate);
  };

  const addProfile = () => {
    const label = newProfileName.trim();
    if (!label) return;
    const id = randomUUID();
    const created: CertificateProfileDto = {
      id,
      name: label,
      certificate: normalizeCertificatePrefs({ ...defaultCert }),
    };
    setProfiles((prev) => [...prev, created]);
    setNewProfileName('');
    setActiveProfileId(id);
    setCert(created.certificate);
    if (profiles.length === 0) setDefaultProfileId(id);
  };

  const removeProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const next = profiles.filter((p) => p.id !== id);
    setProfiles(next);
    if (defaultProfileId === id) setDefaultProfileId(next[0]?.id ?? null);
    if (activeProfileId === id) {
      const fallback = next[0];
      if (fallback) {
        setActiveProfileId(fallback.id);
        setCert(fallback.certificate);
      }
    }
  };

  const updateActiveProfile = (
    updater: (profile: CertificateProfileDto) => CertificateProfileDto,
  ) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === activeProfileId ? updater(p) : p)),
    );
  };

  const toggleProfileSubject = (subjectId: string) => {
    const allIds = schoolSubjects.map((s) => s.id);
    updateActiveProfile((p) => {
      const current = p.subjectIds;
      if (current === undefined) {
        return { ...p, subjectIds: allIds.filter((id) => id !== subjectId) };
      }
      if (current.includes(subjectId)) {
        return { ...p, subjectIds: current.filter((id) => id !== subjectId) };
      }
      const next = [...current, subjectId];
      if (next.length === allIds.length) return { ...p, subjectIds: undefined };
      return { ...p, subjectIds: next };
    });
  };

  const selectAllProfileSubjects = () => {
    updateActiveProfile((p) => ({ ...p, subjectIds: undefined }));
  };

  const clearAllProfileSubjects = () => {
    updateActiveProfile((p) => ({ ...p, subjectIds: [] }));
  };

  const copySubjectsFromProfile = () => {
    const source = profiles.find((p) => p.id === copyFromProfileId);
    if (!source || source.id === activeProfileId) return;
    updateActiveProfile((p) => ({
      ...p,
      subjectIds: source.subjectIds ? [...source.subjectIds] : undefined,
    }));
  };

  const parentCategories = useMemo(
    () => subjectsByParentCategory.map((g) => ({ id: g.parentId, label: g.parentLabel })),
    [subjectsByParentCategory],
  );

  const toggleCommentCategory = (categoryId: string) => {
    const allIds = parentCategories.map((c) => c.id);
    const current = cert.commentPerGradeCategoryIds;
    if (current === undefined) {
      syncCertToProfile({
        ...cert,
        commentPerGradeCategoryIds: allIds.filter((id) => id !== categoryId),
      });
      return;
    }
    if (current.includes(categoryId)) {
      syncCertToProfile({ ...cert, commentPerGradeCategoryIds: current.filter((id) => id !== categoryId) });
      return;
    }
    const next = [...current, categoryId];
    if (next.length === allIds.length) {
      syncCertToProfile({ ...cert, commentPerGradeCategoryIds: undefined });
      return;
    }
    syncCertToProfile({ ...cert, commentPerGradeCategoryIds: next });
  };

  const selectAllCommentCategories = () => {
    syncCertToProfile({ ...cert, commentPerGradeCategoryIds: undefined });
  };

  const clearAllCommentCategories = () => {
    syncCertToProfile({ ...cert, commentPerGradeCategoryIds: [] });
  };

  const save = useMutation({
    mutationFn: () => {
      const mergedProfiles = profiles.map((p) =>
        p.id === activeProfileId ? { ...p, certificate: cert } : p,
      );
      const defaultProfile =
        mergedProfiles.find((p) => p.id === defaultProfileId) ?? mergedProfiles[0];
      return apiFetch<School>('/school', {
        method: 'PATCH',
        body: JSON.stringify({
          settingsJson: {
            ...(data?.settingsJson ?? {}),
            certificateProfiles: mergedProfiles,
            defaultCertificateProfileId: defaultProfileId,
            certificate: defaultProfile?.certificate ?? cert,
          },
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school'] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const toggle = (key: keyof CertificatePrefs) => {
    syncCertToProfile({ ...cert, [key]: !cert[key] });
  };

  const setFillMode = (key: keyof CertificatePrefs, mode: CertificateFillMode) => {
    syncCertToProfile({ ...cert, [key]: mode });
  };

  const hasAttendance = cert.absences || cert.lateness || cert.hourAbsences || cert.hourLateness;

  return (
    <AdminShell>
      <PageHeader
        title={he.certificatePrefsTitle}
        description={he.certificatePrefsHint}
      />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <Alert variant="error" className="mb-4">
          {translateApiError((error as Error).message)}
        </Alert>
      )}

      {data && (
        <form id="cert-profile-form" onSubmit={onSubmit} className="max-w-2xl space-y-4">
          {(save.isSuccess || save.isError) && (
            <div className="mb-2">
              {save.isSuccess && <Alert variant="success">{he.saved}</Alert>}
              {save.isError && (
                <Alert variant="error">
                  {translateApiError((save.error as Error).message)}
                </Alert>
              )}
            </div>
          )}

          <Card>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text">{he.certificatePrefsTitle}</h2>
              <span
                title={he.certProfileWhatIsIt}
                className="cursor-help text-text-muted hover:text-text"
                aria-label={he.certProfileWhatIsIt}
              >
                <HelpCircle className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <p className="mb-4 text-sm text-text-muted">{he.certProfilesHint}</p>

            <div className="rounded-md border border-dashed border-border bg-transparent p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                + פרופיל חדש
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder={he.certProfileName}
                  className="max-w-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProfile();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addProfile}
                  disabled={!newProfileName.trim()}
                >
                  {he.certProfileAdd}
                </Button>
              </div>
            </div>

            {profiles.length > 0 && (
              <div className="mt-4 rounded-md border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    הפרופיל הנבחר
                  </p>
                  {activeProfile && (
                    <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                      {activeProfile.name}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{he.certProfileSelectEdit}</Label>
                    <Select
                      value={activeProfileId}
                      onChange={(e) => selectProfile(e.target.value)}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatCertificateProfileLabel(p)}
                          {p.id === defaultProfileId ? ` (${he.certProfileDefault})` : ''}
                        </option>
                      ))}
                    </Select>
                    <Checkbox
                      checked={defaultProfileId === activeProfileId}
                      onChange={() =>
                        setDefaultProfileId((current) =>
                          current === activeProfileId ? null : activeProfileId,
                        )
                      }
                      className="mt-2"
                    >
                      {he.certProfileDefault}
                    </Checkbox>
                  </div>
                  {activeProfile && (
                    <div>
                      <Label>{he.certTemplatesProfileTemplate}</Label>
                      <Select
                        value={activeProfile.templateId ?? ''}
                        onChange={(e) => {
                          const templateId = e.target.value || null;
                          updateActiveProfile((p) => ({ ...p, templateId }));
                        }}
                      >
                        <option value="">{he.certTemplatesSystemDefault}</option>
                        {certTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (
                            {t.orientation === 'landscape'
                              ? he.certTemplatesLandscape
                              : he.certTemplatesPortrait}
                            )
                          </option>
                        ))}
                      </Select>
                      {!activeProfile.templateId && (
                        <p className="mt-1 text-xs text-text-muted">{he.certProfileNoTemplate}</p>
                      )}
                    </div>
                  )}
                </div>
                {profiles.length > 1 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeProfile(activeProfileId)}
                    >
                      {he.certProfileDelete}
                    </Button>
                    <p className="mt-1 text-xs text-text-muted">
                      {`מחיקת הפרופיל "${activeProfile?.name ?? ''}"`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {activeProfile && (
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary-light px-4 py-2.5">
              <span className="text-xs text-text-muted">עורכים כעת:</span>
              <span className="text-sm font-semibold text-primary">{activeProfile.name}</span>
              {defaultProfileId === activeProfile.id && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  ברירת מחדל
                </span>
              )}
            </div>
          )}

          {activeProfile && schoolSubjects.length > 0 && (
            <Card>
              <h2 className="mb-1 text-lg font-semibold text-text">{he.certProfileSubjectsTitle}</h2>
              <p className="mb-3 text-sm text-text-muted">{he.certProfileSubjectsHint}</p>
              <p className="mb-3 text-sm text-text">
                {he.certProfileSubjectsCount(
                  countProfileSubjects(activeProfile, schoolSubjects.length),
                  schoolSubjects.length,
                )}
              </p>
              {activeProfile.subjectIds?.length === 0 && (
                <Alert variant="error" className="mb-3">
                  {he.certProfileSubjectsEmptyWarning}
                </Alert>
              )}
              <div className="mb-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={selectAllProfileSubjects}>
                  {he.certProfileSubjectsSelectAll}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={clearAllProfileSubjects}>
                  {he.certProfileSubjectsClearAll}
                </Button>
                {profiles.length > 1 && (
                  <>
                    <Select
                      value={copyFromProfileId}
                      onChange={(e) => setCopyFromProfileId(e.target.value)}
                      className="max-w-xs"
                    >
                      <option value="">{he.certProfileSubjectsCopyFrom}</option>
                      {profiles
                        .filter((p) => p.id !== activeProfileId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!copyFromProfileId}
                      onClick={copySubjectsFromProfile}
                    >
                      {he.certProfileSubjectsCopyApply}
                    </Button>
                  </>
                )}
              </div>
              <div className="space-y-4">
                {subjectsByParentCategory.map((parent) => (
                  <div key={parent.parentId}>
                    <p className="mb-2 text-sm font-semibold text-text">{parent.parentLabel}</p>
                    {parent.subGroups.map((sub) => (
                      <div key={sub.subCategoryId ?? `${parent.parentId}-root`} className="mb-2">
                        {sub.subCategoryLabel && (
                          <p className="mb-1 text-xs text-text-muted">{sub.subCategoryLabel}</p>
                        )}
                        <CheckboxGroup>
                          {sub.subjects.map((s) => (
                            <Checkbox
                              key={s.id}
                              checked={isProfileSubjectSelected(activeProfile, s.id)}
                              onChange={() => toggleProfileSubject(s.id)}
                            >
                              {s.name}
                            </Checkbox>
                          ))}
                        </CheckboxGroup>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-1 text-lg font-semibold text-text">{he.schoolStepFields}</h2>
            <p className="mb-4 text-sm text-text-muted">{he.certFillModeHint}</p>

            <div className="mb-4 rounded-md border border-border bg-surface-raised p-3">
              <Checkbox checked={!!cert.nikud} onChange={() => toggle('nikud')}>
                {he.certPrefNikud}
              </Checkbox>
              <p className="mt-1 text-xs text-text-muted">{he.certPrefNikudHint}</p>
            </div>

            <SectionTitle>{he.certHeaderFieldsSection}</SectionTitle>
            <FieldRow
              label={he.certShowProfileNameOnCertificate}
              description={he.certShowProfileNameOnCertificateHint}
              toggleable
              enabled={!!cert.showProfileNameOnCertificate}
              onToggle={() => toggle('showProfileNameOnCertificate')}
            />
            <FieldRow
              label={he.certStudentNameField}
              toggleable
              enabled={cert.showStudentNameOnCertificate !== false}
              onToggle={() =>
                syncCertToProfile({
                  ...cert,
                  showStudentNameOnCertificate: cert.showStudentNameOnCertificate === false,
                })
              }
              showFillMode={cert.showStudentNameOnCertificate !== false}
              fillGroupName="studentNameFill"
              fillMode={cert.studentNameFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('studentNameFillMode', m)}
            />
            <FieldRow
              label={he.certClassNameField}
              toggleable
              enabled={cert.showClassNameOnCertificate !== false}
              onToggle={() =>
                syncCertToProfile({
                  ...cert,
                  showClassNameOnCertificate: cert.showClassNameOnCertificate === false,
                })
              }
              showFillMode={cert.showClassNameOnCertificate !== false}
              fillGroupName="classNameFill"
              fillMode={cert.classNameFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('classNameFillMode', m)}
            />
            <FieldRow
              label={he.certShowClassYearHebrew}
              toggleable
              enabled={!!cert.showClassYearHebrew}
              onToggle={() => toggle('showClassYearHebrew')}
              showFillMode={!!cert.showClassYearHebrew}
              fillGroupName="classYearHebrewFill"
              fillMode={cert.classYearHebrewFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('classYearHebrewFillMode', m)}
            />
            <FieldRow
              label={he.certTermNameField}
              toggleable
              enabled={cert.showTermNameOnCertificate !== false}
              onToggle={() =>
                syncCertToProfile({
                  ...cert,
                  showTermNameOnCertificate: cert.showTermNameOnCertificate === false,
                })
              }
              showFillMode={cert.showTermNameOnCertificate !== false}
              fillGroupName="termNameFill"
              fillMode={cert.termNameFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('termNameFillMode', m)}
            />
            <FieldRow
              label={he.certDate}
              toggleable
              enabled={!!cert.dateOnCertificate}
              onToggle={() => toggle('dateOnCertificate')}
              showFillMode={!!cert.dateOnCertificate}
              fillGroupName="dateFill"
              fillMode={cert.dateFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('dateFillMode', m)}
            >
              {cert.dateOnCertificate && (
                <Checkbox checked={!!cert.dateBorder} onChange={() => toggle('dateBorder')}>
                  {he.certDateBorder}
                </Checkbox>
              )}
            </FieldRow>

            <SectionTitle>{he.certGradesSection}</SectionTitle>
            <FieldRow
              label={he.certGradesSection}
              description={he.certGradesSectionHint}
              showFillMode
              fillGroupName="gradesFill"
              fillMode={cert.gradesFillMode ?? 'computer'}
              onFillModeChange={(m) => setFillMode('gradesFillMode', m)}
            />
            <FieldRow
              label={he.certCommentPerGrade}
              toggleable
              enabled={!!cert.commentPerGrade}
              onToggle={() => toggle('commentPerGrade')}
              showFillMode={!!cert.commentPerGrade}
              fillGroupName="gradeCommentsFill"
              fillMode={cert.gradeCommentsFillMode ?? 'handwritten'}
              onFillModeChange={(m) => setFillMode('gradeCommentsFillMode', m)}
            >
              {cert.commentPerGrade && parentCategories.length > 0 && (
                <>
                  <p className="text-xs text-text-muted">
                    {he.certCommentPerGradeCategoriesCount(
                      countCommentCategories(cert, parentCategories.length),
                      parentCategories.length,
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={selectAllCommentCategories}>
                      {he.certCommentPerGradeCategoriesSelectAll}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={clearAllCommentCategories}>
                      {he.certCommentPerGradeCategoriesClearAll}
                    </Button>
                  </div>
                  <CheckboxGroup>
                    {parentCategories.map((cat) => (
                      <Checkbox
                        key={cat.id}
                        checked={isCommentCategorySelected(cert, cat.id)}
                        onChange={() => toggleCommentCategory(cat.id)}
                      >
                        {cat.label}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </>
              )}
            </FieldRow>
            <FieldRow
              label={he.certShowSubCategories}
              description={he.certShowSubCategoriesHint}
              toggleable
              enabled={cert.showSubCategoriesOnCertificate !== false}
              onToggle={() =>
                syncCertToProfile({
                  ...cert,
                  showSubCategoriesOnCertificate: cert.showSubCategoriesOnCertificate === false,
                })
              }
            />
            <FieldRow
              label={he.certShowSubjectGroup}
              description={he.certShowSubjectGroupHint}
              toggleable
              enabled={!!cert.showSubjectGroupOnCertificate}
              onToggle={() => toggle('showSubjectGroupOnCertificate')}
            />

            <SectionTitle>{he.certAttendanceSection}</SectionTitle>
            <FieldRow
              label={he.certAttendanceSection}
              toggleable
              enabled={!!hasAttendance}
              onToggle={() => {
                if (hasAttendance) {
                  syncCertToProfile({ ...cert, absences: false, lateness: false, hourAbsences: false, hourLateness: false });
                } else {
                  syncCertToProfile({ ...cert, absences: true, lateness: true, hourAbsences: true, hourLateness: true });
                }
              }}
              showFillMode={!!hasAttendance}
              fillGroupName="attendanceFill"
              fillMode={cert.attendanceFillMode ?? 'handwritten'}
              onFillModeChange={(m) => setFillMode('attendanceFillMode', m)}
            >
              <CheckboxGroup>
                <Checkbox checked={!!cert.absences} onChange={() => toggle('absences')}>
                  {he.certAbsences}
                </Checkbox>
                <Checkbox checked={!!cert.lateness} onChange={() => toggle('lateness')}>
                  {he.certLateness}
                </Checkbox>
                <Checkbox checked={!!cert.hourAbsences} onChange={() => toggle('hourAbsences')}>
                  {he.certHourAbsences}
                </Checkbox>
                <Checkbox checked={!!cert.hourLateness} onChange={() => toggle('hourLateness')}>
                  {he.certHourLateness}
                </Checkbox>
                <Checkbox checked={!!cert.attendanceBorder} onChange={() => toggle('attendanceBorder')}>
                  {he.certGroupBorder}
                </Checkbox>
                <Checkbox checked={!!cert.attendanceFieldBorder} onChange={() => toggle('attendanceFieldBorder')}>
                  {he.certFieldBorder}
                </Checkbox>
              </CheckboxGroup>
            </FieldRow>

            <SectionTitle>{he.certEvaluation}</SectionTitle>
            <FieldRow
              label={he.certEvaluation}
              toggleable
              enabled={!!cert.evaluation}
              onToggle={() => toggle('evaluation')}
              showFillMode={!!cert.evaluation}
              fillGroupName="evaluationFill"
              fillMode={cert.evaluationFillMode ?? 'handwritten'}
              onFillModeChange={(m) => setFillMode('evaluationFillMode', m)}
            >
              <Checkbox checked={!!cert.evaluationBorder} onChange={() => toggle('evaluationBorder')}>
                {he.certSectionBorder}
              </Checkbox>
            </FieldRow>

            <SectionTitle>{he.certSignatures}</SectionTitle>
            <FieldRow
              label={he.certSignatures}
              toggleable
              enabled={!!cert.signatures}
              onToggle={() => toggle('signatures')}
              showFillMode={!!cert.signatures}
              fillGroupName="signaturesFill"
              fillMode={cert.signaturesFillMode ?? 'handwritten'}
              onFillModeChange={(m) => setFillMode('signaturesFillMode', m)}
            >
              <CheckboxGroup>
                {cert.signatures && (
                  <>
                    <Checkbox
                      checked={cert.signatureHomeroom !== false}
                      onChange={() =>
                        syncCertToProfile({
                          ...cert,
                          signatureHomeroom: cert.signatureHomeroom === false,
                        })
                      }
                    >
                      {he.certSignatureHomeroom}
                    </Checkbox>
                    <Checkbox
                      checked={cert.signaturePrincipal !== false}
                      onChange={() =>
                        syncCertToProfile({
                          ...cert,
                          signaturePrincipal: cert.signaturePrincipal === false,
                        })
                      }
                    >
                      {he.certSignaturePrincipal}
                    </Checkbox>
                    <Checkbox
                      checked={cert.signatureParent !== false}
                      onChange={() =>
                        syncCertToProfile({
                          ...cert,
                          signatureParent: cert.signatureParent === false,
                        })
                      }
                    >
                      {he.certSignatureParent}
                    </Checkbox>
                  </>
                )}
                <Checkbox checked={!!cert.signaturesBorder} onChange={() => toggle('signaturesBorder')}>
                  {he.certGroupBorder}
                </Checkbox>
                <Checkbox checked={!!cert.signatureFieldBorder} onChange={() => toggle('signatureFieldBorder')}>
                  {he.certFieldBorder}
                </Checkbox>
              </CheckboxGroup>
            </FieldRow>
          </Card>

          <div className="flex justify-end pb-6">
            <Button type="submit" disabled={save.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              {he.save}
            </Button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
