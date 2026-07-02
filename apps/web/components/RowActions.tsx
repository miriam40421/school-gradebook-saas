'use client';

import { Pencil, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { he } from '@/lib/he';
import { Button } from '@/components/ui/Button';

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
      <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap">
        <Button type="button" size="sm" variant="cta" onClick={onSave} disabled={saveDisabled}>
          <Save className="h-3.5 w-3.5" aria-hidden />
          {he.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" aria-hidden />
          {he.cancel}
        </Button>
      </span>
    );
  }

  if (confirmDelete) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap">
        <span className="text-xs text-text-muted">{he.deleteConfirm ?? 'בטוח למחוק?'}</span>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={deleteDisabled}
          onClick={() => {
            onDelete?.();
            setConfirmDelete(false);
          }}
        >
          {he.confirmYes ?? 'כן'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
          {he.confirmNo ?? 'ביטול'}
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap">
      <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {he.edit}
      </Button>
      {onDelete && (
        <Button type="button" size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {he.delete}
        </Button>
      )}
    </span>
  );
}
