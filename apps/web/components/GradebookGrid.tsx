'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { AcquireLockResultDto, CertificateSupplementContextDto, CertificateSupplementDto, GradebookMatrixDto, UpsertCertificateSupplementItemDto } from '@school/shared';
import { apiFetch, getToken } from '@/lib/api';
import {
  buildGridColumns,
  buildNestedCategoryHeaders,
  clampFillColIndex,
  columnHeaderLabel,
  gradeColumnIndicesInCategory,
  hasCertificateColumns,
  writeSupplementCellPatch,
} from '@/lib/gradebook-columns.util';
import { CategoryTableHeaderRows } from '@/components/CategoryTableHeaderRows';
import {
  columnLockState,
  HEARTBEAT_MS,
  lockBadgeLabel,
  lockScopeKey,
  findMatrixLock,
} from '@/lib/gradebook-locks';
import { useGradebookStore } from '@/lib/gradebook-store';
import {
  autoScrollGrid,
  resolvePointerToCell,
} from '@/lib/gradebook-pointer.util';
import { formatStudentDisplayName } from '@/lib/sort';
import { he } from '@/lib/he';
import { normalizeCertificatePrefs } from '@school/shared';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const DEBOUNCE_MS = 500;

type Props = {
  classId: string;
  termId: string;
  matrix: GradebookMatrixDto;
  onSaved: () => void;
  readOnly?: boolean;
  userId?: string;
  getLockClassGroupId?: (subjectId: string) => string | null;
  certSupplementContext?: CertificateSupplementContextDto | null;
  canEditCertSupplements?: boolean;
  onCertSupplementsSaved?: () => void;
};

type FocusCell = { rowIdx: number; colIdx: number };

type FillDrag =
  | {
      mode: 'grade';
      startRowIdx: number;
      startColIdx: number;
      endRowIdx: number;
      endColIdx: number;
      categoryTypeId: string;
      value: string | null;
    }
  | {
      mode: 'supplement';
      startRowIdx: number;
      startColIdx: number;
      endRowIdx: number;
      endColIdx: number;
      value: string | null;
    };

type CategoryBounds = { startCol: number; endCol: number };

type Clipboard = { value: string | null; subjectId: string };

function cellKey(studentId: string, subjectId: string) {
  return `${studentId}:${subjectId}`;
}

function FillHandle({ onMouseDown }: { onMouseDown: (e: MouseEvent) => void }) {
  return (
    <div
      role="presentation"
      title={he.gradebookFillHandleTitle}
      onMouseDown={onMouseDown}
      className="absolute bottom-0.5 start-0.5 h-2 w-2 cursor-crosshair rounded-sm bg-primary"
    />
  );
}

export function GradebookGrid({
  classId,
  termId,
  matrix,
  onSaved,
  readOnly = false,
  userId = '',
  getLockClassGroupId = () => null,
  certSupplementContext = null,
  canEditCertSupplements = false,
  onCertSupplementsSaved,
}: Props) {
  const termLocked = matrix.term.isLocked;
  const effectiveReadOnly = readOnly || termLocked;
  const parentRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const heldLocksRef = useRef<Map<string, string>>(new Map());
  const clipboardRef = useRef<Clipboard | null>(null);
  const selectRefs = useRef<Map<string, HTMLSelectElement>>(new Map());
  const [blockedSubjects, setBlockedSubjects] = useState<Set<string>>(
    () => new Set(),
  );
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<FocusCell | null>(null);
  const [fillDrag, setFillDrag] = useState<FillDrag | null>(null);
  const {
    dirty,
    saveStatus,
    saveError,
    debounceTimer,
    setCell,
    applyBatch,
    undo,
    redo,
    clearDirty,
    setSaveStatus,
    setDebounceTimer,
    getDirtyUpdates,
    mergeEntries,
    getCellValue,
    setLocalEntries,
    resetHistory,
  } = useGradebookStore();

  const historyVersion = useGradebookStore((s) => s.historyVersion);
  const undoAvailable = useGradebookStore((s) => s.undoStack.length > 0);
  const redoAvailable = useGradebookStore((s) => s.redoStack.length > 0);
  void historyVersion;

  useEffect(() => {
    resetHistory();
    setLocalEntries(matrix.entries);
    heldLocksRef.current = new Map();
    setBlockedSubjects(new Set());
    setFocusedCell(null);
  }, [classId, termId, resetHistory, setLocalEntries]);

  useEffect(() => {
    setLocalEntries(matrix.entries);
  }, [matrix.entries, setLocalEntries]);

  useEffect(() => {
    return () => {
      const locks = [...heldLocksRef.current.values()];
      heldLocksRef.current = new Map();
      if (getToken() && locks.length > 0) {
        void Promise.all(
          locks.map((lockId) =>
            apiFetch('/locks/release', {
              method: 'POST',
              body: JSON.stringify({ lockId }),
            }).catch(() => undefined),
          ),
        );
      }
      useGradebookStore.getState().reset();
    };
  }, []);

  const releaseAllLocks = useCallback(async () => {
    const ids = [...heldLocksRef.current.values()];
    heldLocksRef.current = new Map();
    await Promise.all(
      ids.map((lockId) =>
        apiFetch('/locks/release', {
          method: 'POST',
          body: JSON.stringify({ lockId }),
        }).catch(() => undefined),
      ),
    );
  }, []);

  useEffect(() => {
    if (effectiveReadOnly || heldLocksRef.current.size === 0) return;
    const interval = setInterval(() => {
      for (const lockId of heldLocksRef.current.values()) {
        void apiFetch('/locks/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ lockId }),
        }).catch(() => undefined);
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [effectiveReadOnly, matrix]);

  const certPrefs = certSupplementContext?.certificatePrefs ?? null;
  const gridColumns = useMemo(
    () => buildGridColumns(matrix.subjects, certPrefs),
    [matrix.subjects, certPrefs],
  );
  const hasCertCols = hasCertificateColumns(certPrefs);
  const showSubCategories = useMemo(() => {
    if (certPrefs) {
      return normalizeCertificatePrefs(certPrefs).showSubCategoriesOnCertificate !== false;
    }
    return matrix.showSubCategoriesOnCertificate !== false;
  }, [certPrefs, matrix.showSubCategoriesOnCertificate]);

  const nestedHeaders = useMemo(
    () => buildNestedCategoryHeaders(gridColumns, showSubCategories),
    [gridColumns, showSubCategories],
  );

  type SupplementRow = UpsertCertificateSupplementItemDto;
  const [supplementRows, setSupplementRows] = useState<Map<string, SupplementRow>>(
    () => new Map(),
  );
  const [supplementSaveStatus, setSupplementSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [supplementSaveError, setSupplementSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!certSupplementContext?.supplements) {
      setSupplementRows(new Map());
      return;
    }
    const map = new Map<string, SupplementRow>();
    for (const s of certSupplementContext.supplements) {
      map.set(s.studentId, {
        studentId: s.studentId,
        absences: s.absences ?? null,
        lateness: s.lateness ?? null,
        hourAbsences: s.hourAbsences ?? null,
        hourLateness: s.hourLateness ?? null,
        evaluation: s.evaluation ?? null,
        homeroomSignature: s.homeroomSignature ?? null,
        principalSignature: s.principalSignature ?? null,
        gradeComments: s.gradeComments ?? {},
      });
    }
    setSupplementRows(map);
  }, [certSupplementContext]);

  const saveSupplements = useCallback(async () => {
    if (!canEditCertSupplements || !hasCertCols) return;
    setSupplementSaveStatus('saving');
    setSupplementSaveError(null);
    try {
      await apiFetch<CertificateSupplementDto[]>('/certificates/supplements', {
        method: 'PUT',
        body: JSON.stringify({
          classId,
          termId,
          items: [...supplementRows.values()],
        }),
      });
      setSupplementSaveStatus('saved');
      onCertSupplementsSaved?.();
    } catch (err) {
      setSupplementSaveStatus('error');
      setSupplementSaveError(err instanceof Error ? err.message : he.gradebookSaveError);
    }
  }, [
    canEditCertSupplements,
    hasCertCols,
    classId,
    termId,
    supplementRows,
    onCertSupplementsSaved,
  ]);

  const updateSupplement = useCallback(
    (studentId: string, patch: Partial<SupplementRow>) => {
      setSupplementRows((prev) => {
        const next = new Map(prev);
        const current = next.get(studentId) ?? {
          studentId,
          gradeComments: {},
        };
        next.set(studentId, { ...current, ...patch });
        return next;
      });
      setSupplementSaveStatus('idle');
    },
    [],
  );

  const editable = useMemo(
    () => new Set(matrix.editableSubjectIds),
    [matrix.editableSubjectIds],
  );

  const categoryBoundsByTypeId = useMemo(() => {
    const map = new Map<string, CategoryBounds>();
    gridColumns.forEach((col, idx) => {
      if (col.kind !== 'grade') return;
      const typeId = col.subject.categoryGroupId;
      const existing = map.get(typeId);
      if (!existing) {
        map.set(typeId, { startCol: idx, endCol: idx });
      } else {
        existing.endCol = idx;
      }
    });
    return map;
  }, [gridColumns]);

  const entryMap = useMemo(
    () =>
      new Map(
        matrix.entries.map((e) => [`${e.studentId}:${e.subjectId}`, e.value]),
      ),
    [matrix.entries],
  );

  const getColumnState = useCallback(
    (subjectId: string) => {
      const cg = getLockClassGroupId(subjectId);
      return columnLockState(
        userId,
        subjectId,
        cg,
        matrix,
        heldLocksRef.current,
      );
    },
    [userId, matrix, getLockClassGroupId],
  );

  const canEditCell = useCallback(
    (subjectId: string) => {
      if (effectiveReadOnly || !editable.has(subjectId)) return false;
      if (blockedSubjects.has(subjectId)) return false;
      return getColumnState(subjectId) !== 'locked';
    },
    [effectiveReadOnly, editable, blockedSubjects, getColumnState],
  );

  const ensureLock = useCallback(
    async (subjectId: string): Promise<boolean> => {
      if (effectiveReadOnly || !editable.has(subjectId)) return false;
      if (blockedSubjects.has(subjectId)) return false;
      const cg = getLockClassGroupId(subjectId);
      const key = lockScopeKey(subjectId, cg);
      if (heldLocksRef.current.has(key)) return true;
      const state = getColumnState(subjectId);
      if (state === 'locked') {
        const row = findMatrixLock(matrix.locks, subjectId, cg);
        setLockNotice(
          row ? he.lockHeldBy(row.lockedBy.name) : he.lockAcquireFailed,
        );
        setBlockedSubjects((prev) => new Set(prev).add(subjectId));
        return false;
      }
      try {
        const result = await apiFetch<AcquireLockResultDto>('/locks/acquire', {
          method: 'POST',
          body: JSON.stringify({
            classId,
            termId,
            subjectId,
            classGroupId: cg,
          }),
        });
        heldLocksRef.current.set(key, result.lockId);
        setLockNotice(null);
        setBlockedSubjects((prev) => {
          const next = new Set(prev);
          next.delete(subjectId);
          return next;
        });
        return true;
      } catch (err) {
        const e = err as Error & {
          statusCode?: number;
          lockedBy?: { name: string };
        };
        if (e.statusCode === 409) {
          setLockNotice(
            e.lockedBy
              ? he.lockHeldBy(e.lockedBy.name)
              : he.lockAcquireFailed,
          );
          setBlockedSubjects((prev) => new Set(prev).add(subjectId));
        }
        return false;
      }
    },
    [
      effectiveReadOnly,
      editable,
      blockedSubjects,
      getLockClassGroupId,
      getColumnState,
      matrix.locks,
      classId,
      termId,
    ],
  );

  const flushSave = useCallback(async () => {
    if (effectiveReadOnly) return;
    const updates = getDirtyUpdates();
    if (updates.length === 0) return;
    setSaveStatus('saving');
    try {
      const result = await apiFetch<{ entries: GradebookMatrixDto['entries'] }>(
        '/gradebook/bulk-update',
        {
          method: 'POST',
          body: JSON.stringify({ classId, termId, updates }),
        },
      );
      mergeEntries(result.entries);
      clearDirty(updates.map((u) => `${u.studentId}:${u.subjectId}`));
      setSaveStatus('saved');
      onSaved();
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      const msg =
        e.statusCode === 409
          ? he.lockExpiredOnSave
          : err instanceof Error
            ? err.message
            : he.gradebookSaveError;
      setSaveStatus('error', msg);
      if (e.statusCode === 409) {
        setLockNotice(he.lockExpiredOnSave);
        await releaseAllLocks();
      }
    }
  }, [
    classId,
    termId,
    getDirtyUpdates,
    setSaveStatus,
    mergeEntries,
    clearDirty,
    onSaved,
    effectiveReadOnly,
    releaseAllLocks,
  ]);

  const scheduleSave = useCallback(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      void flushSave();
    }, DEBOUNCE_MS);
    setDebounceTimer(timer);
  }, [debounceTimer, flushSave, setDebounceTimer]);

  const performUndo = useCallback(() => {
    if (useGradebookStore.getState().undoStack.length === 0) return;
    undo();
    scheduleSave();
  }, [undo, scheduleSave]);

  const performRedo = useCallback(() => {
    if (useGradebookStore.getState().redoStack.length === 0) return;
    redo();
    scheduleSave();
  }, [redo, scheduleSave]);

  const handleHistoryShortcut = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (effectiveReadOnly) return false;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return false;

      const isUndo =
        e.code === 'KeyZ' && !e.shiftKey;
      const isRedo =
        e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey);

      if (isUndo) {
        e.preventDefault();
        performUndo();
        return true;
      }
      if (isRedo) {
        e.preventDefault();
        performRedo();
        return true;
      }
      return false;
    },
    [effectiveReadOnly, performUndo, performRedo],
  );

  const readCellValue = useCallback(
    (studentId: string, subjectId: string) => {
      const serverVal = entryMap.get(cellKey(studentId, subjectId));
      return getCellValue(studentId, subjectId, serverVal);
    },
    [entryMap, getCellValue],
  );

  const onCellChange = useCallback(
    async (studentId: string, subjectId: string, value: string | null) => {
      const ok = await ensureLock(subjectId);
      if (!ok) return false;
      const before = readCellValue(studentId, subjectId);
      setCell(studentId, subjectId, value, { before });
      scheduleSave();
      return true;
    },
    [ensureLock, readCellValue, setCell, scheduleSave],
  );

  const applyFillRange = useCallback(
    async (drag: FillDrag) => {
      if (drag.mode === 'supplement') {
        if (!canEditCertSupplements || !hasCertCols) return;
        const col = gridColumns[drag.startColIdx];
        if (!col || col.kind === 'grade') return;
        const rowLo = Math.min(drag.startRowIdx, drag.endRowIdx);
        const rowHi = Math.max(drag.startRowIdx, drag.endRowIdx);
        const patchBase = writeSupplementCellPatch(col, drag.value);
        setSupplementRows((prev) => {
          const next = new Map(prev);
          for (let rowIdx = rowLo; rowIdx <= rowHi; rowIdx += 1) {
            const student = matrix.students[rowIdx];
            if (!student) continue;
            const current = next.get(student.id) ?? {
              studentId: student.id,
              gradeComments: {},
            };
            if (col.kind === 'comment') {
              const subjectId = col.subjectId;
              const commentVal = patchBase.gradeComments?.[subjectId] ?? null;
              next.set(student.id, {
                ...current,
                gradeComments: {
                  ...(current.gradeComments ?? {}),
                  [subjectId]: commentVal,
                },
              });
            } else {
              next.set(student.id, { ...current, ...patchBase });
            }
          }
          return next;
        });
        setSupplementSaveStatus('idle');
        return;
      }

      const bounds = categoryBoundsByTypeId.get(drag.categoryTypeId);
      void bounds;
      let colLo = Math.min(drag.startColIdx, drag.endColIdx);
      let colHi = Math.max(drag.startColIdx, drag.endColIdx);
      const gradeIndices = gradeColumnIndicesInCategory(
        gridColumns,
        drag.categoryTypeId,
      );
      const inRange = gradeIndices.filter((i) => i >= colLo && i <= colHi);
      if (inRange.length === 0) return;
      colLo = Math.min(...inRange);
      colHi = Math.max(...inRange);
      const rowLo = Math.min(drag.startRowIdx, drag.endRowIdx);
      const rowHi = Math.max(drag.startRowIdx, drag.endRowIdx);

      const subjectIds = new Set<string>();
      for (let colIdx = colLo; colIdx <= colHi; colIdx += 1) {
        const col = gridColumns[colIdx];
        if (col?.kind === 'grade' && canEditCell(col.subjectId)) {
          subjectIds.add(col.subjectId);
        }
      }
      for (const subjectId of subjectIds) {
        const ok = await ensureLock(subjectId);
        if (!ok) return;
      }

      const beforeValues = new Map<string, string | null>();
      const updates: {
        studentId: string;
        subjectId: string;
        value: string | null;
      }[] = [];

      for (let rowIdx = rowLo; rowIdx <= rowHi; rowIdx += 1) {
        const student = matrix.students[rowIdx];
        if (!student) continue;
        for (let colIdx = colLo; colIdx <= colHi; colIdx += 1) {
          const col = gridColumns[colIdx];
          if (!col || col.kind !== 'grade' || !canEditCell(col.subjectId)) continue;
          const sub = col.subject;
          const key = cellKey(student.id, sub.id);
          beforeValues.set(key, readCellValue(student.id, sub.id));
          if (drag.value !== null && !sub.allowedLabels.includes(drag.value)) {
            continue;
          }
          updates.push({
            studentId: student.id,
            subjectId: sub.id,
            value: drag.value,
          });
        }
      }

      if (updates.length === 0) return;
      applyBatch(updates, beforeValues);
      scheduleSave();
    },
    [
      categoryBoundsByTypeId,
      gridColumns,
      matrix.students,
      canEditCell,
      ensureLock,
      readCellValue,
      applyBatch,
      scheduleSave,
      canEditCertSupplements,
      hasCertCols,
    ],
  );

  const canEditSupplementCell = useCallback(
    () => canEditCertSupplements && hasCertCols,
    [canEditCertSupplements, hasCertCols],
  );

  const getSupplementRow = useCallback(
    (studentId: string) =>
      supplementRows.get(studentId) ?? { studentId, gradeComments: {} },
    [supplementRows],
  );

  const focusSelect = useCallback(
    (rowIdx: number, colIdx: number) => {
      const student = matrix.students[rowIdx];
      const col = gridColumns[colIdx];
      if (!student || !col) return;
      if (col.kind === 'grade') {
        const el = selectRefs.current.get(cellKey(student.id, col.subjectId));
        el?.focus();
      } else {
        const el = document.querySelector<HTMLElement>(
          `[data-supplement-cell="${student.id}:${colIdx}"] input, [data-supplement-cell="${student.id}:${colIdx}"] select`,
        );
        el?.focus();
      }
      setFocusedCell({ rowIdx, colIdx });
    },
    [matrix.students, gridColumns],
  );

  const isColumnEditable = useCallback(
    (colIdx: number) => {
      const col = gridColumns[colIdx];
      if (!col) return false;
      if (col.kind === 'grade') return canEditCell(col.subjectId);
      return canEditSupplementCell();
    },
    [gridColumns, canEditCell, canEditSupplementCell],
  );

  const findNextEditable = useCallback(
    (
      rowIdx: number,
      colIdx: number,
      direction: 'right' | 'left' | 'down' | 'up',
    ): FocusCell | null => {
      let r = rowIdx;
      let c = colIdx;
      for (
        let i = 0;
        i < matrix.students.length * gridColumns.length;
        i += 1
      ) {
        if (direction === 'right') {
          c += 1;
          if (c >= gridColumns.length) {
            c = 0;
            r += 1;
          }
        } else if (direction === 'left') {
          c -= 1;
          if (c < 0) {
            c = gridColumns.length - 1;
            r -= 1;
          }
        } else if (direction === 'down') {
          r += 1;
        } else {
          r -= 1;
        }
        if (r < 0 || r >= matrix.students.length) return null;
        if (c < 0 || c >= gridColumns.length) continue;
        if (isColumnEditable(c)) return { rowIdx: r, colIdx: c };
      }
      return null;
    },
    [matrix.students.length, gridColumns.length, isColumnEditable],
  );

  const handleShortcutKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (effectiveReadOnly) return;
      const root = gridRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (!active || !root.contains(active)) return;

      if (handleHistoryShortcut(e)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.code === 'KeyC' && focusedCell) {
        const student = matrix.students[focusedCell.rowIdx];
        const col = gridColumns[focusedCell.colIdx];
        if (!student || !col || col.kind !== 'grade') return;
        e.preventDefault();
        clipboardRef.current = {
          value: readCellValue(student.id, col.subjectId),
          subjectId: col.subjectId,
        };
        return;
      }
      if (e.code === 'KeyV' && focusedCell) {
        const clip = clipboardRef.current;
        const student = matrix.students[focusedCell.rowIdx];
        const col = gridColumns[focusedCell.colIdx];
        if (!clip || !student || !col || col.kind !== 'grade') return;
        if (clip.subjectId !== col.subjectId) return;
        e.preventDefault();
        void onCellChange(student.id, col.subjectId, clip.value);
      }
    },
    [
      effectiveReadOnly,
      handleHistoryShortcut,
      focusedCell,
      matrix.students,
      gridColumns,
      readCellValue,
      onCellChange,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleShortcutKeyDown, true);
    return () =>
      document.removeEventListener('keydown', handleShortcutKeyDown, true);
  }, [handleShortcutKeyDown]);

  useEffect(() => {
    if (!fillDrag) return;

    const onMove = (e: globalThis.MouseEvent) => {
      autoScrollGrid(parentRef.current, e.clientY);
      const resolved = resolvePointerToCell(
        e.clientX,
        e.clientY,
        parentRef.current,
        matrix.students.length,
        fillDrag.endColIdx,
      );
      if (!resolved) return;
      if (fillDrag.mode === 'supplement') {
        setFillDrag((prev) =>
          prev && prev.mode === 'supplement'
            ? {
                ...prev,
                endRowIdx: resolved.rowIdx,
                endColIdx: prev.startColIdx,
              }
            : null,
        );
        return;
      }
      const colIdx = clampFillColIndex(
        resolved.colIdx,
        gridColumns,
        fillDrag.categoryTypeId,
      );
      const gradeBounds = gradeColumnIndicesInCategory(
        gridColumns,
        fillDrag.categoryTypeId,
      );
      const clampedCol = gradeBounds.includes(colIdx)
        ? colIdx
        : clampFillColIndex(fillDrag.startColIdx, gridColumns, fillDrag.categoryTypeId);
      setFillDrag((prev) =>
        prev
          ? {
              ...prev,
              endRowIdx: resolved.rowIdx,
              endColIdx: clampedCol,
            }
          : null,
      );
    };

    const onUp = () => {
      setFillDrag((prev) => {
        if (prev) void applyFillRange(prev);
        return null;
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [fillDrag, applyFillRange, categoryBoundsByTypeId, gridColumns, matrix.students.length]);

  const rowVirtualizer = useVirtualizer({
    count: matrix.students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });

  const fillPreview =
    fillDrag &&
    (() => {
      const rowLo = Math.min(fillDrag.startRowIdx, fillDrag.endRowIdx);
      const rowHi = Math.max(fillDrag.startRowIdx, fillDrag.endRowIdx);
      if (fillDrag.mode === 'supplement') {
        return {
          mode: 'supplement' as const,
          rowLo,
          rowHi,
          colLo: fillDrag.startColIdx,
          colHi: fillDrag.startColIdx,
        };
      }
      let colLo = Math.min(fillDrag.startColIdx, fillDrag.endColIdx);
      let colHi = Math.max(fillDrag.startColIdx, fillDrag.endColIdx);
      const gradeIndices = gradeColumnIndicesInCategory(
        gridColumns,
        fillDrag.categoryTypeId,
      );
      const inRange = gradeIndices.filter((i) => i >= colLo && i <= colHi);
      if (inRange.length > 0) {
        colLo = Math.min(...inRange);
        colHi = Math.max(...inRange);
      }
      return { mode: 'grade' as const, rowLo, rowHi, colLo, colHi };
    })();

  const totalColCount = gridColumns.length + 1;

  return (
    <div ref={gridRef} className="gradebook-grid max-w-[1400px]">
      <p className="mb-2 text-sm text-text">
        {matrix.class.name} · {matrix.term.name}
        {matrix.term.isLocked && (
          <Badge variant="warning" className="me-2">
            <Lock className="h-3 w-3" aria-hidden />
            {he.lockedLabel}
          </Badge>
        )}
      </p>
      {termLocked && (
        <p className="mb-3 text-sm text-warning">{he.termLockedBanner}</p>
      )}
      {readOnly && (
        <p className="mb-3 text-sm text-text-muted">{he.gradebookViewOnlyHint}</p>
      )}
      {!effectiveReadOnly && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!undoAvailable}
            onClick={performUndo}
            title="Ctrl+Z"
          >
            {he.gradebookUndo}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!redoAvailable}
            onClick={performRedo}
            title="Ctrl+Y"
          >
            {he.gradebookRedo}
          </Button>
          <span className="text-xs text-text-muted">{he.gradebookShortcutsHint}</span>
        </div>
      )}
      {lockNotice && (
        <p className="error mb-2 text-sm">{lockNotice}</p>
      )}
      <p className="mb-3 text-sm text-text-muted">
        {!effectiveReadOnly && saveStatus === 'saving' && he.gradebookSaving}
        {!effectiveReadOnly && saveStatus === 'saved' && he.gradebookSaved}
        {!effectiveReadOnly && saveStatus === 'error' && (
          <span className="error">
            {he.gradebookSaveError}: {saveError}
          </span>
        )}
        {!effectiveReadOnly && saveStatus === 'idle' && dirty.size > 0 && he.gradebookPending}
        {hasCertCols && canEditCertSupplements && (
          <>
            {' · '}
            {supplementSaveStatus === 'saving' && he.saving}
            {supplementSaveStatus === 'saved' && he.saved}
            {supplementSaveStatus === 'error' && (
              <span className="error">{supplementSaveError}</span>
            )}
          </>
        )}
      </p>
      {hasCertCols && canEditCertSupplements && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void saveSupplements()}>
            {he.certSupplementSave}
          </Button>
          <span className="text-xs text-text-muted">{he.certSupplementSaveHint}</span>
        </div>
      )}
      <div
        ref={parentRef}
        className="max-h-[70vh] overflow-auto rounded-md border border-border bg-surface shadow-elevation1"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[2] bg-surface-raised border-b border-border">
            <CategoryTableHeaderRows
              parentSpans={nestedHeaders.parentSpans}
              subSpans={nestedHeaders.subSpans}
            />
            <tr>
              <th className="min-w-[140px] px-2 py-1.5 text-right">
                {he.studentName}
              </th>
              {gridColumns.map((col, colIdx) => {
                if (col.kind === 'grade') {
                  const sub = col.subject;
                  const showLock = effectiveReadOnly
                    ? Boolean(
                        findMatrixLock(
                          matrix.locks,
                          sub.id,
                          getLockClassGroupId(sub.id),
                        ),
                      )
                    : editable.has(sub.id);
                  const state = showLock ? getColumnState(sub.id) : 'available';
                  const holder = findMatrixLock(
                    matrix.locks,
                    sub.id,
                    getLockClassGroupId(sub.id),
                  )?.lockedBy.name;
                  return (
                    <th
                      key={`grade-${sub.id}`}
                      className="px-2 py-1.5 text-sm"
                      style={{ opacity: editable.has(sub.id) ? 1 : 0.65 }}
                    >
                      <div>{sub.name}</div>
                      {showLock && (
                        <Badge
                          variant={state === 'locked' ? 'warning' : 'secondary'}
                          className="mt-1 text-[0.7rem] font-normal"
                        >
                          <Lock className="h-3 w-3" aria-hidden />
                          {lockBadgeLabel(
                            state,
                            {
                              available: he.lockAvailable,
                              editing: he.lockYouEditing,
                              lockedBy: he.lockHeldBy,
                            },
                            holder,
                          )}
                        </Badge>
                      )}
                    </th>
                  );
                }
                return (
                  <th
                    key={`${col.kind}-${colIdx}`}
                    className="whitespace-nowrap bg-primary-light px-2 py-1.5 text-xs text-primary"
                  >
                    {columnHeaderLabel(col)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr
                aria-hidden
                style={{
                  height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0,
                  border: 'none',
                }}
              >
                <td
                  colSpan={totalColCount}
                  style={{ padding: 0, border: 'none' }}
                />
              </tr>
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const student = matrix.students[virtualRow.index];
              const rowIdx = virtualRow.index;
              return (
                <tr key={student.id} data-grade-row={rowIdx}>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    {formatStudentDisplayName(student.fullName)}
                  </td>
                  {gridColumns.map((col, colIdx) => {
                    const isFocused =
                      focusedCell?.rowIdx === rowIdx &&
                      focusedCell?.colIdx === colIdx;
                    const inFillRange =
                      fillPreview &&
                      rowIdx >= fillPreview.rowLo &&
                      rowIdx <= fillPreview.rowHi &&
                      colIdx >= fillPreview.colLo &&
                      colIdx <= fillPreview.colHi &&
                      (fillPreview.mode === 'grade'
                        ? col.kind === 'grade'
                        : col.kind !== 'grade');

                    if (col.kind === 'grade') {
                      const sub = col.subject;
                      const canEdit = canEditCell(sub.id);
                      const serverVal = entryMap.get(`${student.id}:${sub.id}`);
                      const val = getCellValue(student.id, sub.id, serverVal);
                      const refKey = cellKey(student.id, sub.id);
                      return (
                        <td
                          key={`grade-${sub.id}`}
                          data-grade-cell
                          data-grade-row={rowIdx}
                          data-grade-col={colIdx}
                          style={{
                            padding: '0.25rem',
                            position: 'relative',
                            background: inFillRange ? '#dbeafe' : undefined,
                            outline: isFocused ? '2px solid #3b82f6' : undefined,
                          }}
                        >
                          <select
                            ref={(el) => {
                              if (el) selectRefs.current.set(refKey, el);
                              else selectRefs.current.delete(refKey);
                            }}
                            value={val ?? ''}
                            disabled={!canEdit}
                            onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                            onKeyDown={(e) => {
                              if (handleHistoryShortcut(e)) return;
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                const next = findNextEditable(
                                  rowIdx,
                                  colIdx,
                                  e.shiftKey ? 'left' : 'right',
                                );
                                if (next) focusSelect(next.rowIdx, next.colIdx);
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                const next = findNextEditable(rowIdx, colIdx, 'down');
                                if (next) focusSelect(next.rowIdx, next.colIdx);
                              }
                            }}
                            onChange={(e) =>
                              void onCellChange(
                                student.id,
                                sub.id,
                                e.target.value === '' ? null : e.target.value,
                              )
                            }
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          >
                            <option value="">—</option>
                            {sub.allowedLabels.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>
                          {canEdit && isFocused && (
                            <FillHandle
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFillDrag({
                                  mode: 'grade',
                                  startRowIdx: rowIdx,
                                  startColIdx: colIdx,
                                  endRowIdx: rowIdx,
                                  endColIdx: colIdx,
                                  categoryTypeId: sub.categoryGroupId,
                                  value: val,
                                });
                              }}
                            />
                          )}
                        </td>
                      );
                    }

                    const sup = getSupplementRow(student.id);
                    const canEditSup = canEditSupplementCell();
                    const inputStyle = {
                      width: '100%',
                      fontSize: '0.85rem',
                      padding: '0.2rem 0.35rem',
                    } as const;

                    if (col.kind === 'comment') {
                      const commentVal = sup.gradeComments?.[col.subjectId] ?? '';
                      return (
                        <td
                          key={`comment-${col.subjectId}-${colIdx}`}
                          data-supplement-cell={`${student.id}:${colIdx}`}
                          style={{
                            padding: '0.25rem',
                            position: 'relative',
                            background: inFillRange ? '#dbeafe' : '#f8fafc',
                            outline: isFocused ? '2px solid #0ea5e9' : undefined,
                          }}
                        >
                          <input
                            type="text"
                            disabled={!canEditSup}
                            value={commentVal}
                            onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                            onChange={(e) =>
                              updateSupplement(student.id, {
                                gradeComments: {
                                  ...(sup.gradeComments ?? {}),
                                  [col.subjectId]: e.target.value || null,
                                },
                              })
                            }
                            style={inputStyle}
                          />
                          {canEditSup && isFocused && (
                            <FillHandle
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFillDrag({
                                  mode: 'supplement',
                                  startRowIdx: rowIdx,
                                  startColIdx: colIdx,
                                  endRowIdx: rowIdx,
                                  endColIdx: colIdx,
                                  value: commentVal || null,
                                });
                              }}
                            />
                          )}
                        </td>
                      );
                    }

                    const fieldMap = {
                      evaluation: 'evaluation',
                      absences: 'absences',
                      lateness: 'lateness',
                      hourAbsences: 'hourAbsences',
                      hourLateness: 'hourLateness',
                      homeroomSignature: 'homeroomSignature',
                      principalSignature: 'principalSignature',
                    } as const;
                    const field = fieldMap[col.kind];
                    const rawVal = sup[field as keyof typeof sup];
                    const strVal = typeof rawVal === 'string' ? rawVal : '';

                    return (
                      <td
                        key={`${col.kind}-${colIdx}`}
                        data-supplement-cell={`${student.id}:${colIdx}`}
                        style={{
                          padding: '0.25rem',
                          position: 'relative',
                          background: inFillRange ? '#dbeafe' : '#f8fafc',
                          outline: isFocused ? '2px solid #0ea5e9' : undefined,
                        }}
                      >
                        {field === 'evaluation' ? (
                          <textarea
                            disabled={!canEditSup}
                            value={strVal}
                            rows={3}
                            onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                            onChange={(e) =>
                              updateSupplement(student.id, {
                                evaluation: e.target.value || null,
                              })
                            }
                            style={{
                              ...inputStyle,
                              minHeight: '3.5rem',
                              resize: 'vertical',
                              whiteSpace: 'pre-wrap',
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            disabled={!canEditSup}
                            value={strVal}
                            onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                            onChange={(e) =>
                              updateSupplement(student.id, {
                                [field]: e.target.value || null,
                              })
                            }
                            style={inputStyle}
                          />
                        )}
                        {canEditSup && isFocused && (
                          <FillHandle
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFillDrag({
                                mode: 'supplement',
                                startRowIdx: rowIdx,
                                startColIdx: colIdx,
                                endRowIdx: rowIdx,
                                endColIdx: colIdx,
                                value: strVal || null,
                              });
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr
                aria-hidden
                style={{
                  height:
                    rowVirtualizer.getTotalSize() -
                    (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  border: 'none',
                }}
              >
                <td
                  colSpan={totalColCount}
                  style={{ padding: 0, border: 'none' }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
