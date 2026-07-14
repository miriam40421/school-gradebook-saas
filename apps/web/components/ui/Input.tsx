import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'ui-input mb-0 h-9 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm text-text transition-colors duration-150',
        'placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
