import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AlertVariant = 'error' | 'success' | 'info' | 'warning';

const styles: Record<AlertVariant, string> = {
  error:   'bg-danger-light text-red-800 border-inline-start-[4px] border-danger',
  success: 'bg-success-light text-emerald-800 border-inline-start-[4px] border-success',
  info:    'bg-info-light text-blue-900 border-inline-start-[4px] border-info',
  warning: 'bg-warning-light text-amber-800 border-inline-start-[4px] border-warning',
};

const icons: Record<AlertVariant, ReactNode> = {
  error:   <AlertCircle   className="h-4 w-4 shrink-0" aria-hidden />,
  success: <CheckCircle2  className="h-4 w-4 shrink-0" aria-hidden />,
  info:    <Info          className="h-4 w-4 shrink-0" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />,
};

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-lg px-4 py-3 text-sm',
        styles[variant],
        className,
      )}
    >
      {icons[variant]}
      <div>{children}</div>
    </div>
  );
}
