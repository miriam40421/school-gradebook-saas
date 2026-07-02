import { create } from 'zustand';
import type { GradebookEntryDto } from '@school/shared';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type CellCoord = { studentId: string; subjectId: string };

export type CellChange = CellCoord & {
  before: string | null;
  after: string | null;
};

type UndoBatch = { changes: CellChange[] };

type GradebookStore = {
  dirty: Map<string, string | null>;
  historyVersion: number;
  saveStatus: SaveStatus;
  saveError: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  undoStack: UndoBatch[];
  redoStack: UndoBatch[];
  setCell: (
    studentId: string,
    subjectId: string,
    value: string | null,
    options?: { recordUndo?: boolean; before?: string | null },
  ) => void;
  applyBatch: (
    updates: { studentId: string; subjectId: string; value: string | null }[],
    beforeValues: Map<string, string | null>,
  ) => void;
  undo: () => CellChange[] | null;
  redo: () => CellChange[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearDirty: (keys: string[]) => void;
  setSaveStatus: (status: SaveStatus, error?: string) => void;
  setDebounceTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
  getDirtyUpdates: () => { studentId: string; subjectId: string; value: string | null }[];
  mergeEntries: (entries: GradebookEntryDto[]) => void;
  localEntries: Map<string, GradebookEntryDto>;
  setLocalEntries: (entries: GradebookEntryDto[]) => void;
  getCellValue: (
    studentId: string,
    subjectId: string,
    serverValue: string | null | undefined,
  ) => string | null;
  resetHistory: () => void;
  reset: () => void;
};

function cellKey(studentId: string, subjectId: string) {
  return `${studentId}:${subjectId}`;
}

function parseCellKey(key: string): { studentId: string; subjectId: string } {
  const sep = key.indexOf(':');
  return {
    studentId: key.slice(0, sep),
    subjectId: key.slice(sep + 1),
  };
}

const MAX_UNDO = 50;

function persistedValue(
  localEntries: Map<string, GradebookEntryDto>,
  studentId: string,
  subjectId: string,
): string | null {
  return localEntries.get(cellKey(studentId, subjectId))?.value ?? null;
}

function applyDirtyValue(
  dirty: Map<string, string | null>,
  localEntries: Map<string, GradebookEntryDto>,
  studentId: string,
  subjectId: string,
  value: string | null,
) {
  const key = cellKey(studentId, subjectId);
  if (persistedValue(localEntries, studentId, subjectId) === value) {
    dirty.delete(key);
  } else {
    dirty.set(key, value);
  }
}

export const useGradebookStore = create<GradebookStore>((set, get) => ({
  dirty: new Map(),
  historyVersion: 0,
  saveStatus: 'idle',
  saveError: '',
  debounceTimer: null,
  undoStack: [],
  redoStack: [],
  localEntries: new Map(),

  setCell: (studentId, subjectId, value, options = {}) => {
    const dirty = new Map(get().dirty);
    const localEntries = get().localEntries;
    let undoStack = get().undoStack;
    let redoStack = get().redoStack;
    const recordUndo = options.recordUndo !== false;

    if (recordUndo) {
      const before =
        options.before ??
        get().getCellValue(studentId, subjectId, undefined);
      if (before !== value) {
        undoStack = [
          ...undoStack,
          { changes: [{ studentId, subjectId, before, after: value }] },
        ].slice(-MAX_UNDO);
        redoStack = [];
      }
    }

    applyDirtyValue(dirty, localEntries, studentId, subjectId, value);
    set({
      dirty,
      undoStack,
      redoStack,
      saveStatus: 'idle',
      historyVersion: get().historyVersion + 1,
    });
  },

  applyBatch: (updates, beforeValues) => {
    const changes: CellChange[] = [];
    const dirty = new Map(get().dirty);
    const localEntries = get().localEntries;

    for (const u of updates) {
      const key = cellKey(u.studentId, u.subjectId);
      const before = beforeValues.get(key) ?? null;
      if (before !== u.value) {
        changes.push({
          studentId: u.studentId,
          subjectId: u.subjectId,
          before,
          after: u.value,
        });
      }
      applyDirtyValue(dirty, localEntries, u.studentId, u.subjectId, u.value);
    }

    if (changes.length === 0) return;
    const undoStack = [...get().undoStack, { changes }].slice(-MAX_UNDO);
    set({
      dirty,
      undoStack,
      redoStack: [],
      saveStatus: 'idle',
      historyVersion: get().historyVersion + 1,
    });
  },

  undo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return null;
    const batch = stack[stack.length - 1]!;
    const undoStack = stack.slice(0, -1);
    const redoStack = [...get().redoStack, batch];
    const dirty = new Map(get().dirty);
    const localEntries = get().localEntries;

    for (const c of batch.changes) {
      applyDirtyValue(dirty, localEntries, c.studentId, c.subjectId, c.before);
    }

    set({
      dirty,
      undoStack,
      redoStack,
      saveStatus: 'idle',
      historyVersion: get().historyVersion + 1,
    });
    return batch.changes;
  },

  redo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return null;
    const batch = stack[stack.length - 1]!;
    const redoStack = stack.slice(0, -1);
    const undoStack = [...get().undoStack, batch];
    const dirty = new Map(get().dirty);
    const localEntries = get().localEntries;

    for (const c of batch.changes) {
      applyDirtyValue(dirty, localEntries, c.studentId, c.subjectId, c.after);
    }

    set({
      dirty,
      undoStack,
      redoStack,
      saveStatus: 'idle',
      historyVersion: get().historyVersion + 1,
    });
    return batch.changes;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearDirty: (keys) => {
    const dirty = new Map(get().dirty);
    for (const k of keys) dirty.delete(k);
    set({ dirty, historyVersion: get().historyVersion + 1 });
  },

  setSaveStatus: (saveStatus, error = '') => {
    set({ saveStatus, saveError: error });
  },

  setDebounceTimer: (debounceTimer) => set({ debounceTimer }),

  getDirtyUpdates: () => {
    const updates: { studentId: string; subjectId: string; value: string | null }[] =
      [];
    for (const [key, value] of get().dirty) {
      const { studentId, subjectId } = parseCellKey(key);
      updates.push({ studentId, subjectId, value });
    }
    return updates;
  },

  mergeEntries: (entries) => {
    const localEntries = new Map(get().localEntries);
    for (const e of entries) {
      localEntries.set(cellKey(e.studentId, e.subjectId), e);
    }
    set({ localEntries });
  },

  setLocalEntries: (entries) => {
    const localEntries = new Map<string, GradebookEntryDto>();
    for (const e of entries) {
      localEntries.set(cellKey(e.studentId, e.subjectId), e);
    }
    set({ localEntries });
  },

  resetHistory: () =>
    set({ undoStack: [], redoStack: [], historyVersion: get().historyVersion + 1 }),

  getCellValue: (studentId, subjectId, serverValue) => {
    const key = cellKey(studentId, subjectId);
    if (get().dirty.has(key)) return get().dirty.get(key) ?? null;
    const local = get().localEntries.get(key);
    if (local) return local.value;
    return serverValue ?? null;
  },

  reset: () => {
    const timer = get().debounceTimer;
    if (timer) clearTimeout(timer);
    set({
      dirty: new Map(),
      historyVersion: 0,
      saveStatus: 'idle',
      saveError: '',
      debounceTimer: null,
      localEntries: new Map(),
      undoStack: [],
      redoStack: [],
    });
  },
}));
