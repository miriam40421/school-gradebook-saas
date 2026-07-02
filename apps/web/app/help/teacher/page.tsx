'use client';

import Link from 'next/link';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { he } from '@/lib/he';

type Step = { text: string; href: string | null };

function StepList({ steps }: { steps: Step[] }) {
  return (
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
  );
}

export default function TeacherHelpPage() {
  return (
    <AppShell>
      <PageHeader title={he.teacherHelpTitle} description={he.teacherHelpDesc} />

      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              1
            </span>
            <h2 className="text-base font-semibold text-text">{he.teacherPhase1Title}</h2>
          </div>
          <StepList steps={he.teacherPhase1Steps} />
        </Card>

        <Alert variant="info">
          <p className="mb-3 font-semibold">{he.helpFaqTitle}</p>
          <ul className="space-y-2">
            {he.teacherFaqItems.map((item, i) => (
              <li key={i}>
                <span className="font-medium">{item.q}</span>
                <span className="text-text-muted"> — {item.a}</span>
              </li>
            ))}
          </ul>
        </Alert>
      </div>
    </AppShell>
  );
}
