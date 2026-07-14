'use client';

import { Pencil, Save, Trash2, X, Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { he } from '@/lib/he';

type IconBtnProps = {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'danger' | 'primary' | 'ghost';
  disabled?: boolean;
};

function IconBtn({ onClick, icon, label, variant = 'default', disabled }: IconBtnProps) {
  return (
    <span className="relative inline-flex group/btn">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'ui-icon-action flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-40',
          variant === 'default' &&
            'border-border bg-transparent text-text-muted hover:border-border-strong hover:bg-surface-raised hover:text-text',
          variant === 'primary' &&
            'border-primary/30 bg-transparent text-primary hover:border-primary hover:bg-primary/10',
          variant === 'danger' &&
            'border-danger/20 bg-transparent text-danger/70 hover:border-danger/60 hover:bg-danger-light hover:text-danger',
          variant === 'ghost' &&
            'border-transparent bg-transparent text-text-muted hover:bg-surface-raised hover:text-text',
        )}
      >
        {icon}
      </button>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/btn:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

type Props = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saveDisabled?: boolean;
  deleteDisabled?: boolean;
};

export function RowActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  saveDisabled,
  deleteDisabled,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        <IconBtn
          onClick={onSave}
          icon={<Check className="h-3.5 w-3.5" />}
          label={he.save}
          variant="primary"
          disabled={saveDisabled}
        />
        <IconBtn
          onClick={onCancel}
          icon={<X className="h-3.5 w-3.5" />}
          label={he.cancel}
          variant="ghost"
        />
      </span>
    );
  }

  if (confirmDelete) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-xs text-text-muted">{he.deleteConfirm ?? 'בטוח?'}</span>
        <IconBtn
          onClick={() => { onDelete?.(); setConfirmDelete(false); }}
          icon={<Check className="h-3.5 w-3.5" />}
          label={he.confirmYes ?? 'כן, מחק'}
          variant="danger"
          disabled={deleteDisabled}
        />
        <IconBtn
          onClick={() => setConfirmDelete(false)}
          icon={<X className="h-3.5 w-3.5" />}
          label={he.confirmNo ?? 'ביטול'}
          variant="ghost"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <IconBtn
        onClick={onEdit}
        icon={<Pencil className="h-3.5 w-3.5" />}
        label={he.edit}
        variant="default"
      />
      {onDelete && (
        <IconBtn
          onClick={() => setConfirmDelete(true)}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label={he.delete}
          variant="danger"
        />
      )}
    </span>
  );
}
