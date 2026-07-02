'use client';

import Link from 'next/link';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { he } from '@/lib/he';

type Step = { text: string; href: string | null };

function PhaseCard({
  number,
  title,
  badge,
  badgeVariant,
  steps,
}: {
  number: number;
  title: string;
  badge: string;
  badgeVariant: 'success' | 'primary';
  steps: Step[];
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {number}
          </span>
          <h2 className="text-base font-semibold text-text">{title}</h2>
        </div>
        <Badge variant={badgeVariant} className="shrink-0 text-xs">
          {badge}
        </Badge>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <span className="flex-1 text-sm text-text-muted">{step.text}</span>
            {step.href && (
              <Link
                href={step.href}
                className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary no-underline hover:text-primary-hover"
              >
                <ChevronLeft className="h-3 w-3" aria-hidden />
                עברי
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function AdminHelpPage() {
  return (
    <AdminShell>
      <PageHeader title={he.adminHelpTitle} description={he.adminHelpDesc} />

      <div className="space-y-4">
        <PhaseCard
          number={1}
          title={he.adminPhase1Title}
          badge={he.helpBadgeOnce}
          badgeVariant="success"
          steps={he.adminPhase1Steps}
        />
        <PhaseCard
          number={2}
          title={he.adminPhase2Title}
          badge={he.helpBadgeOnce}
          badgeVariant="success"
          steps={he.adminPhase2Steps}
        />
        <PhaseCard
          number={3}
          title={he.adminPhase3Title}
          badge={he.helpBadgePeriod}
          badgeVariant="primary"
          steps={he.adminPhase3Steps}
        />
        <PhaseCard
          number={4}
          title={he.adminPhase4Title}
          badge={he.helpBadgePeriod}
          badgeVariant="primary"
          steps={he.adminPhase4Steps}
        />

        <Alert variant="info">
          <p className="mb-3 font-semibold">{he.helpFaqTitle}</p>
          <ul className="space-y-2">
            {he.adminFaqItems.map((item, i) => (
              <li key={i}>
                <span className="font-medium">{item.q}</span>
                <span className="text-text-muted"> — {item.a}</span>
              </li>
            ))}
          </ul>
        </Alert>
      </div>
    </AdminShell>
  );
}
