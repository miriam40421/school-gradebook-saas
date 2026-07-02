'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { normalizeCertificateProfiles } from '@school/shared';
import type { CertificateTemplateSummaryDto } from '@school/shared';
import { apiFetch } from '@/lib/api';
import { he } from '@/lib/he';
import { cn } from '@/lib/cn';

type ClassRow = { id: string; certificateProfileId: string | null };
type SchoolSettings = { settingsJson?: Record<string, unknown> };

export function CertificateSetupBanner() {
  const { data: school } = useQuery({
    queryKey: ['school'],
    queryFn: () => apiFetch<SchoolSettings>('/school'),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => apiFetch<CertificateTemplateSummaryDto[]>('/certificate-templates'),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => apiFetch<ClassRow[]>('/classes'),
  });

  const { profiles } = normalizeCertificateProfiles(school?.settingsJson);
  const hasProfile = profiles.length > 0;
  const hasLinkedTemplate = profiles.some((p) => p.templateId && templates.some((t) => t.id === p.templateId));
  const allClassesHaveProfile = classes.length > 0 && classes.every((c) => c.certificateProfileId);

  if (hasProfile && hasLinkedTemplate && allClassesHaveProfile) return null;

  const steps = [
    {
      done: hasProfile,
      label: he.certSetupStep1,
      hint: he.certSetupStep1Hint,
      link: '/school',
      linkLabel: he.certSetupStep1Link,
    },
    {
      done: hasLinkedTemplate,
      label: he.certSetupStep2,
      hint: he.certSetupStep2Hint,
      link: '/certificate-templates',
      linkLabel: he.certSetupStep2Link,
    },
    {
      done: allClassesHaveProfile,
      label: he.certSetupStep3,
      hint: he.certSetupStep3Hint,
      link: '/classes',
      linkLabel: he.certSetupStep3Link,
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="mb-3 text-sm font-semibold text-primary">{he.certSetupBannerTitle}</p>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            )}
            <div className="min-w-0">
              <span className={cn('text-sm font-medium', step.done ? 'text-text-muted line-through' : 'text-text')}>
                {i + 1}. {step.label}
              </span>
              {!step.done && (
                <>
                  <span className="mx-1 text-sm text-text-muted">—</span>
                  <span className="text-xs text-text-muted">{step.hint}</span>
                  <Link href={step.link} className="mr-2 text-xs text-primary underline hover:no-underline">
                    {step.linkLabel} ←
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
