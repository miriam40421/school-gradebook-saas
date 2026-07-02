'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CheckboxProps = {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Checkbox({ checked, onChange, children, className, id }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn('ui-checkbox-label group inline-flex cursor-pointer items-center gap-2', className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="ui-checkbox shrink-0"
      />
      <span className="text-sm text-text">{children}</span>
    </label>
  );
}

type CheckboxGroupProps = {
  children: ReactNode;
  className?: string;
};

export function CheckboxGroup({ children, className }: CheckboxGroupProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {children}
    </div>
  );
}
