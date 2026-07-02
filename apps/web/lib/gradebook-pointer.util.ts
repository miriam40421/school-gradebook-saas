const ROW_HEIGHT = 40;

export function resolvePointerToCell(
  clientX: number,
  clientY: number,
  scrollEl: HTMLElement | null,
  studentCount: number,
  fallbackColIdx: number,
): { rowIdx: number; colIdx: number } | null {
  const cell = document.elementFromPoint(clientX, clientY)?.closest(
    '[data-grade-cell]',
  ) as HTMLElement | null;

  if (cell) {
    const rowIdx = Number(cell.dataset.gradeRow);
    const colIdx = Number(cell.dataset.gradeCol);
    if (!Number.isNaN(rowIdx) && !Number.isNaN(colIdx)) {
      return { rowIdx, colIdx };
    }
  }

  if (!scrollEl || studentCount === 0) return null;

  const rows = scrollEl.querySelectorAll('tr[data-grade-row]');
  if (rows.length === 0) return null;

  const firstRow = rows[0] as HTMLElement;
  const lastRow = rows[rows.length - 1] as HTMLElement;
  const firstIdx = Number(firstRow.dataset.gradeRow);
  const lastIdx = Number(lastRow.dataset.gradeRow);

  if (Number.isNaN(firstIdx) || Number.isNaN(lastIdx)) return null;

  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      const rowIdx = Number((row as HTMLElement).dataset.gradeRow);
      if (!Number.isNaN(rowIdx)) {
        return { rowIdx, colIdx: fallbackColIdx };
      }
    }
  }

  if (clientY < firstRow.getBoundingClientRect().top) {
    const rowsAbove = Math.ceil(
      (firstRow.getBoundingClientRect().top - clientY) / ROW_HEIGHT,
    );
    return {
      rowIdx: Math.max(0, firstIdx - rowsAbove),
      colIdx: fallbackColIdx,
    };
  }

  if (clientY > lastRow.getBoundingClientRect().bottom) {
    const rowsBelow = Math.ceil(
      (clientY - lastRow.getBoundingClientRect().bottom) / ROW_HEIGHT,
    );
    return {
      rowIdx: Math.min(studentCount - 1, lastIdx + rowsBelow),
      colIdx: fallbackColIdx,
    };
  }

  return { rowIdx: firstIdx, colIdx: fallbackColIdx };
}

export function autoScrollGrid(
  scrollEl: HTMLElement | null,
  clientY: number,
  edgePx = 36,
) {
  if (!scrollEl) return;
  const rect = scrollEl.getBoundingClientRect();
  if (clientY < rect.top + edgePx) {
    scrollEl.scrollTop -= 12;
  } else if (clientY > rect.bottom - edgePx) {
    scrollEl.scrollTop += 12;
  }
}
