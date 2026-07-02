import { useCallback, useRef, useState } from 'react';
import type { CertificateTemplateLayoutV1 } from '@school/shared';

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 400;

function cloneLayout(layout: CertificateTemplateLayoutV1): CertificateTemplateLayoutV1 {
  return JSON.parse(JSON.stringify(layout)) as CertificateTemplateLayoutV1;
}

function layoutsEqual(
  a: CertificateTemplateLayoutV1 | null,
  b: CertificateTemplateLayoutV1 | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export type LayoutHistoryOptions = {
  /** Skip recording this change in undo history. */
  skipHistory?: boolean;
  /** Record immediately (drag, add, remove). Default debounces rapid edits. */
  immediate?: boolean;
};

export function useCertificateLayoutHistory() {
  const [layout, setLayoutState] = useState<CertificateTemplateLayoutV1 | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pastRef = useRef<CertificateTemplateLayoutV1[]>([]);
  const futureRef = useRef<CertificateTemplateLayoutV1[]>([]);
  const layoutRef = useRef<CertificateTemplateLayoutV1 | null>(null);
  const debounceRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    beforeLayout: CertificateTemplateLayoutV1 | null;
  }>({ timer: null, beforeLayout: null });

  layoutRef.current = layout;

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const flushDebouncedHistory = useCallback(() => {
    const pending = debounceRef.current;
    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }
    if (pending.beforeLayout) {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), pending.beforeLayout];
      futureRef.current = [];
      pending.beforeLayout = null;
      syncHistoryFlags();
    }
  }, [syncHistoryFlags]);

  const pushPast = useCallback(
    (snapshot: CertificateTemplateLayoutV1) => {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), cloneLayout(snapshot)];
      futureRef.current = [];
      syncHistoryFlags();
    },
    [syncHistoryFlags],
  );

  const resetHistory = useCallback(
    (next: CertificateTemplateLayoutV1 | null) => {
      flushDebouncedHistory();
      pastRef.current = [];
      futureRef.current = [];
      debounceRef.current.beforeLayout = null;
      setLayoutState(next ? cloneLayout(next) : null);
      syncHistoryFlags();
    },
    [flushDebouncedHistory, syncHistoryFlags],
  );

  const setLayout = useCallback(
    (next: CertificateTemplateLayoutV1 | null, options: LayoutHistoryOptions = {}) => {
      const current = layoutRef.current;
      if (options.skipHistory || layoutsEqual(current, next)) {
        setLayoutState(next ? cloneLayout(next) : null);
        return;
      }
      if (!next) {
        setLayoutState(null);
        return;
      }

      if (options.immediate) {
        flushDebouncedHistory();
        if (current) pushPast(current);
        setLayoutState(cloneLayout(next));
        return;
      }

      if (!debounceRef.current.beforeLayout && current) {
        debounceRef.current.beforeLayout = cloneLayout(current);
      }
      if (debounceRef.current.timer) clearTimeout(debounceRef.current.timer);
      debounceRef.current.timer = setTimeout(() => {
        flushDebouncedHistory();
      }, DEBOUNCE_MS);
      setLayoutState(cloneLayout(next));
    },
    [flushDebouncedHistory, pushPast],
  );

  const undo = useCallback(() => {
    flushDebouncedHistory();
    const past = pastRef.current;
    if (past.length === 0 || !layoutRef.current) return false;
    const previous = past[past.length - 1]!;
    pastRef.current = past.slice(0, -1);
    futureRef.current = [cloneLayout(layoutRef.current), ...futureRef.current];
    setLayoutState(cloneLayout(previous));
    syncHistoryFlags();
    return true;
  }, [flushDebouncedHistory, syncHistoryFlags]);

  const redo = useCallback(() => {
    flushDebouncedHistory();
    const future = futureRef.current;
    if (future.length === 0 || !layoutRef.current) return false;
    const next = future[0]!;
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, cloneLayout(layoutRef.current)];
    setLayoutState(cloneLayout(next));
    syncHistoryFlags();
    return true;
  }, [flushDebouncedHistory, syncHistoryFlags]);

  return {
    layout,
    setLayout,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    flushDebouncedHistory,
  };
}
