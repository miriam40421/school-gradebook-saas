import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="mb-3 h-10 w-10 text-secondary" aria-hidden />
      <p className="max-w-md text-sm text-text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
