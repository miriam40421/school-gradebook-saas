import { EVALUATION_HANDWRITTEN_LINE_COUNT } from '@school/shared';

export function handwrittenUnderlineSpan(className = 'handwritten-underline'): string {
  return `<span class="${className}"></span>`;
}

export function handwrittenLinesHtml(lineCount: number): string {
  const lines = Array.from(
    { length: Math.max(1, lineCount) },
    () => '<div class="handwritten-line"></div>',
  ).join('');
  return `<div class="handwritten-lines">${lines}</div>`;
}

export function evaluationHandwrittenHeightMm(
  fontSizePt: number,
  lineCount = EVALUATION_HANDWRITTEN_LINE_COUNT,
): number {
  const titleMm = 8;
  const lineMm = fontSizePt * 0.62;
  const gapMm = 2.5;
  return (
    Math.round(
      (titleMm + lineCount * lineMm + Math.max(0, lineCount - 1) * gapMm + 6) * 10,
    ) / 10
  );
}
