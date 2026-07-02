import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        primary:   'bg-primary-light text-primary',
        secondary: 'bg-slate-100 text-slate-600',
        success:   'bg-success-light text-emerald-800',
        warning:   'bg-warning-light text-amber-800',
        danger:    'bg-danger-light text-danger',
        info:      'bg-info-light text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
