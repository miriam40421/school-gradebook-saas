'use client';

import { cn } from '@/lib/cn';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  id?: string;
  'aria-label'?: string;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  id,
  'aria-label': ariaLabel,
  className,
}: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        'ui-toggle relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-border',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all duration-200',
          checked ? 'start-0.5' : 'start-[calc(100%-1.375rem)]',
        )}
      />
    </button>
  );
}
