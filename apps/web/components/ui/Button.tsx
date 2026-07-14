import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 rounded-md',
  {
    variants: {
      variant: {
        primary:   'border border-primary/40 text-primary bg-transparent hover:bg-primary/10 hover:border-primary',
        cta:       'border border-primary/40 text-primary bg-transparent hover:bg-primary/10 hover:border-primary',
        secondary: 'border border-border text-text-muted bg-transparent hover:bg-surface-raised hover:text-text',
        ghost:     'border-0 text-text-muted bg-transparent hover:bg-surface-raised hover:text-text',
        danger:    'border border-danger/30 text-danger bg-transparent hover:bg-danger-light hover:border-danger',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-xs',
        lg: 'h-9 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
