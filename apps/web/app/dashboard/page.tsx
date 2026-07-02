'use client';

import { Role } from '@school/shared';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { he } from '@/lib/he';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DashboardPage() {
  const { user } = useAuth();
  const hint =
    user?.role === Role.HomeroomTeacher
      ? he.homeroomDashboardHint
      : he.dashboardHint;

  return (
    <AppShell>
      <PageHeader title={he.dashboardTitle} />
      <Card>
        <p className="text-text">{user?.name ? he.dashboardWelcome(user.name) : he.loading}</p>
        <p className="mt-2 text-text-muted">{hint}</p>
        <p className="mt-4 text-xs text-text-muted">{he.switchUserHint}</p>
      </Card>
    </AppShell>
  );
}
