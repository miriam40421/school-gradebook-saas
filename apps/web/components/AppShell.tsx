'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Role } from '@school/shared';
import { useAuth } from '@/lib/auth';
import { he } from '@/lib/he';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type NavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { href: '/dashboard', label: he.navDashboard, icon: LayoutDashboard },
  { href: '/grading-sets', label: he.navGradingSets, icon: Settings },
  { href: '/subjects', label: he.navSubjects, icon: BookOpen },
  { href: '/school', label: he.navSchool, icon: School },
  { href: '/classes', label: he.navClasses, icon: GraduationCap },
  { href: '/users', label: he.navUsers, icon: Users },
  { href: '/gradebook', label: he.navAdminGradebook, icon: ClipboardList },
  { href: '/certificate-templates', label: he.navCertificateTemplates, icon: Award },
  { href: '/certificates', label: he.navCertificates, icon: Award },
  { href: '/help', label: he.navHelp, icon: HelpCircle },
];

const homeroomNav: NavItem[] = [
  { href: '/teacher', label: he.navGradebook, icon: ClipboardList },
  { href: '/teacher/certificates', label: he.navTeacherCertificates, icon: Award },
  { href: '/my-students', label: he.navMyStudents, icon: Users },
  { href: '/help/homeroom', label: he.navHelp, icon: HelpCircle },
];

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200',
              active
                ? 'bg-primary/15 font-semibold text-primary'
                : 'text-text-muted hover:bg-primary/8 hover:text-text',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="aurora-bg flex min-h-screen items-center justify-center">
        <Spinner label={he.loading} />
      </div>
    );
  }
  if (!user) return null;

  const nav =
    user.role === Role.HomeroomTeacher
      ? homeroomNav
      : user.role === Role.Admin
        ? adminNav
        : [
            { href: '/teacher', label: he.navGradebook, icon: ClipboardList },
            { href: '/help/teacher', label: he.navHelp, icon: HelpCircle },
          ];

  const title =
    user.role === Role.HomeroomTeacher ? he.homeroomPortal : he.schoolAdmin;

  const sidebar = (
    <>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{user.name}</p>
        <p className="mt-1 text-xs text-text-muted/80">{he.switchUserHint}</p>
      </div>
      <NavLinks
        items={nav}
        pathname={pathname}
        onNavigate={() => setMobileOpen(false)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-6 w-full justify-start gap-2 text-text-muted hover:text-text"
        onClick={logout}
      >
        <LogOut className="h-5 w-5" aria-hidden />
        {he.logout}
      </Button>
    </>
  );

  return (
    <div className="aurora-bg flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-sidebar hidden w-64 shrink-0 flex-col p-4 lg:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-text/20 backdrop-blur-sm"
            aria-label="סגור תפריט"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="glass-sidebar absolute inset-y-4 start-4 z-10 flex w-[min(280px,calc(100%-2rem))] flex-col rounded-2xl p-4 shadow-elevation4">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-lg p-2 text-text-muted hover:bg-primary/10"
                onClick={() => setMobileOpen(false)}
                aria-label="סגור"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="glass-panel sticky top-4 z-40 mx-4 mt-4 flex items-center justify-between rounded-xl px-4 py-3 lg:hidden">
          <button
            type="button"
            className="cursor-pointer rounded-lg p-2 text-text hover:bg-primary/10"
            onClick={() => setMobileOpen(true)}
            aria-label="פתח תפריט"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-semibold text-text">{title}</span>
          <span className="w-10" aria-hidden />
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto p-4 pt-4 lg:p-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
