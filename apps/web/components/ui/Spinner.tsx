import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 p-8', className)} role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </div>
  );
}
