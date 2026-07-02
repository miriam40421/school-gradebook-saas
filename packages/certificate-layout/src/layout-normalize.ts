import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateLayoutV1,
  LayoutBlock,
} from '@school/shared';
import { A4_DIMENSIONS_MM, HEADER_META_ROW_FIELD_KEYS, attendanceFieldEnabled, DEFAULT_CERTIFICATE_FONT_SIZE_PT, signatureTypeEnabled } from '@school/shared';
import { expandGradesTablesForContent } from './grades-table-estimate';
import { evaluationHandwrittenHeightMm } from './handwritten-render';
import { normalizeSignatureFieldPositions } from './normalize-signature-layout';
import {
  ensureAttendanceFieldBlocks,
  normalizeAttendanceFieldPositions,
} from './normalize-attendance-layout';

const META_FIELD_KEYS = new Set<string>(HEADER_META_ROW_FIELD_KEYS);

/** Vertical gaps between certificate sections (portrait — mm). */
export const LAYOUT_GAPS_MM = {
  metaToTables: 4,
  gradeRows: 3,
  afterGrades: 2,
  afterEvaluation: 12,
  afterAttendance: 12,
  beforeFooter: 4,
} as const;

/** Landscape — evaluation hugs tables; attendance/signatures anchored at bottom. */
export const LANDSCAPE_LAYOUT_GAPS_MM = {
  metaToTables: 2,
  gradeRows: 2,
  afterGrades: 2,
  afterEvaluation: 10,
  afterAttendance: 10,
  beforeFooter: 10,
} as const;

const MIN_EVAL_HEIGHT_MM = 22;
const MAX_EVAL_HEIGHT_MM = 48;
const LANDSCAPE_MIN_EVAL_HEIGHT_MM = 18;
const LANDSCAPE_MAX_EVAL_HEIGHT_MM = 34;
const MIN_GRADES_TABLE_HEIGHT_MM = 36;
const LANDSCAPE_MIN_GRADES_TABLE_HEIGHT_MM = 24;
const PAGE_BOTTOM_MARGIN_MM = 4;

function layoutGapsFor(orientation: CertificateTemplateLayoutV1['page']['orientation']) {
  return orientation === 'landscape' ? LANDSCAPE_LAYOUT_GAPS_MM : LAYOUT_GAPS_MM;
}

function minGradesTableHeightFor(orientation: CertificateTemplateLayoutV1['page']['orientation']) {
  return orientation === 'landscape'
    ? LANDSCAPE_MIN_GRADES_TABLE_HEIGHT_MM
    : MIN_GRADES_TABLE_HEIGHT_MM;
}

function maxEvalHeightFor(orientation: CertificateTemplateLayoutV1['page']['orientation']) {
  return orientation === 'landscape' ? LANDSCAPE_MAX_EVAL_HEIGHT_MM : MAX_EVAL_HEIGHT_MM;
}

function roundMm(n: number): number {
  return Math.round(n * 10) / 10;
}

function printableWidth(
  orientation: CertificateTemplateLayoutV1['page']['orientation'],
  padding: CertificateTemplateLayoutV1['page']['paddingMm'],
): number {
  const page = A4_DIMENSIONS_MM[orientation];
  return page.width - padding.left - padding.right;
}

function printableHeight(
  orientation: CertificateTemplateLayoutV1['page']['orientation'],
  padding: CertificateTemplateLayoutV1['page']['paddingMm'],
): number {
  const page = A4_DIMENSIONS_MM[orientation];
  return page.height - padding.top - padding.bottom;
}

function isLegacyMetaFieldBlock(block: LayoutBlock): boolean {
  return (
    block.type === 'field' &&
    META_FIELD_KEYS.has(String((block.props as { fieldKey?: string }).fieldKey))
  );
}

function isAttendanceBlock(block: LayoutBlock): boolean {
  return block.type === 'attendance_field' || block.type === 'attendance';
}

function isFooterBlock(block: LayoutBlock): boolean {
  return (
    block.type === 'signature_field' || block.type === 'date' || block.type === 'signatures'
  );
}

function headerBottomMm(blocks: LayoutBlock[]): number {
  const metaRow = blocks.find((b) => b.type === 'header_meta_row');
  if (metaRow) return metaRow.box.yMm + metaRow.box.hMm;

  const metaFields = blocks.filter(isLegacyMetaFieldBlock);
  if (metaFields.length > 0) {
    return Math.max(...metaFields.map((b) => b.box.yMm + b.box.hMm));
  }

  return 50;
}

function minGradesTableY(blocks: LayoutBlock[]): number | null {
  const grades = blocks.filter((b) => b.type === 'grades_table');
  if (!grades.length) return null;
  return Math.min(...grades.map((b) => b.box.yMm));
}

function gradesBottomMm(blocks: LayoutBlock[]): number | null {
  const grades = blocks.filter((b) => b.type === 'grades_table');
  if (!grades.length) return null;
  return Math.max(...grades.map((b) => b.box.yMm + b.box.hMm));
}

function tierBottom(blocks: LayoutBlock[]): number {
  return Math.max(...blocks.map((b) => b.box.yMm + b.box.hMm));
}

function shiftBlocksFromY(blocks: LayoutBlock[], minY: number, delta: number): LayoutBlock[] {
  if (delta <= 0) return blocks;
  return blocks.map((block) =>
    block.box.yMm >= minY - 0.5
      ? {
          ...block,
          box: { ...block.box, yMm: roundMm(block.box.yMm + delta) },
        }
      : block,
  );
}

function placeTierAt(
  blocks: LayoutBlock[],
  tierBlocks: LayoutBlock[],
  yMm: number,
): LayoutBlock[] {
  if (!tierBlocks.length) return blocks;
  const ids = new Set(tierBlocks.map((b) => b.id));
  return blocks.map((block) =>
    ids.has(block.id)
      ? { ...block, box: { ...block.box, yMm: roundMm(yMm) } }
      : block,
  );
}

function layoutBottomMm(blocks: LayoutBlock[]): number {
  let max = 0;
  for (const block of blocks) {
    max = Math.max(max, block.box.yMm + block.box.hMm);
  }
  return max;
}

function footerBlockEnabled(
  block: LayoutBlock,
  snapshot: CertificateSnapshotJsonV1,
): boolean {
  const prefs = snapshot.certificatePrefs;
  if (block.type === 'signature_field') {
    return Boolean(prefs.signatures) && signatureTypeEnabled(prefs, block.props.signatureKey);
  }
  if (block.type === 'date') {
    return prefs.dateOnCertificate !== false;
  }
  if (block.type === 'signatures') {
    return Boolean(prefs.signatures);
  }
  return false;
}

function attendanceBlockEnabled(
  block: LayoutBlock,
  snapshot: CertificateSnapshotJsonV1,
): boolean {
  if (block.type === 'attendance') return true;
  if (block.type === 'attendance_field') {
    return attendanceFieldEnabled(snapshot.certificatePrefs, block.props.fieldKey);
  }
  return false;
}

function estimateEvaluationHeightMm(
  text: string | null | undefined,
  widthMm: number,
  fontSizePt: number,
  maxHeight = MAX_EVAL_HEIGHT_MM,
): number {
  const normalized = (text ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return MIN_EVAL_HEIGHT_MM;

  const titleMm = 6;
  const lineMm = fontSizePt * 0.4;
  const avgCharMm = fontSizePt * 0.22;
  const charsPerLine = Math.max(24, Math.floor(widthMm / avgCharMm));
  const lineCount = normalized.split('\n').reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );

  return roundMm(
    Math.min(maxHeight, Math.max(MIN_EVAL_HEIGHT_MM, titleMm + lineCount * lineMm + 4)),
  );
}

function resizeEvaluationFromContent(
  blocks: LayoutBlock[],
  snapshot: CertificateSnapshotJsonV1,
  widthMm: number,
  maxHeight = MAX_EVAL_HEIGHT_MM,
): LayoutBlock[] {
  const evalBlock = blocks.find((b) => b.type === 'evaluation');
  if (!evalBlock) return blocks;

  if (snapshot.fill.evaluationHandwritten) {
    const neededH = evaluationHandwrittenHeightMm(evalBlock.style.fontSizePt);
    if (Math.abs(neededH - evalBlock.box.hMm) <= 0.5) return blocks;
    return blocks.map((block) =>
      block.id === evalBlock.id ? { ...block, box: { ...block.box, hMm: neededH } } : block,
    );
  }

  const neededH = estimateEvaluationHeightMm(
    snapshot.evaluation,
    widthMm,
    evalBlock.style.fontSizePt,
    maxHeight,
  );
  if (Math.abs(neededH - evalBlock.box.hMm) <= 0.5) return blocks;

  return blocks.map((block) =>
    block.id === evalBlock.id ? { ...block, box: { ...block.box, hMm: neededH } } : block,
  );
}

/** Tighten vertical spacing between stacked grades-table rows. */
export function compactGradeTableRows(
  layout: CertificateTemplateLayoutV1,
  rowGap: number = LAYOUT_GAPS_MM.gradeRows,
): CertificateTemplateLayoutV1 {
  const grades = layout.blocks.filter((b) => b.type === 'grades_table');
  if (grades.length <= 1) return layout;

  const rowYs = [...new Set(grades.map((g) => g.box.yMm))].sort((a, b) => a - b);
  if (rowYs.length <= 1) return layout;

  const gradesByRow = rowYs.map((y) =>
    grades.filter((g) => Math.abs(g.box.yMm - y) < 0.6),
  );

  let blocks = [...layout.blocks];
  let targetY = rowYs[0]!;

  for (let i = 0; i < gradesByRow.length; i += 1) {
    const rowBlocks = gradesByRow[i]!;
    const currentY = rowYs[i]!;
    const delta = roundMm(targetY - currentY);
    if (Math.abs(delta) > 0.5) {
      const ids = new Set(rowBlocks.map((b) => b.id));
      blocks = blocks.map((block) =>
        ids.has(block.id)
          ? { ...block, box: { ...block.box, yMm: roundMm(block.box.yMm + delta) } }
          : block,
      );
    }

    const updatedRow = blocks.filter(
      (b) =>
        b.type === 'grades_table' &&
        rowBlocks.some((rowBlock) => rowBlock.id === b.id),
    );
    const rowBottom = Math.max(...updatedRow.map((b) => b.box.yMm + b.box.hMm));
    targetY = roundMm(rowBottom + rowGap);
  }

  return { ...layout, blocks };
}

/** Ensure a gap between the student meta row and the first grades table. */
export function adjustHeaderToTablesGap(
  layout: CertificateTemplateLayoutV1,
  gapMm: number = LAYOUT_GAPS_MM.metaToTables,
): CertificateTemplateLayoutV1 {
  const gradesY = minGradesTableY(layout.blocks);
  if (gradesY == null) return layout;

  const targetStart = roundMm(headerBottomMm(layout.blocks) + gapMm);
  if (gradesY >= targetStart) return layout;

  const delta = roundMm(targetStart - gradesY);
  return {
    ...layout,
    blocks: shiftBlocksFromY(layout.blocks, gradesY, delta),
  };
}

/** @deprecated Use normalizeVerticalContentStack */
export function repositionEvaluationBelowGrades(
  layout: CertificateTemplateLayoutV1,
): CertificateTemplateLayoutV1 {
  const evalBlock = layout.blocks.find((b) => b.type === 'evaluation');
  const gradesBottom = gradesBottomMm(layout.blocks);
  if (!evalBlock || gradesBottom == null) return layout;

  const minEvalY = roundMm(gradesBottom + LAYOUT_GAPS_MM.afterGrades);
  if (evalBlock.box.yMm >= minEvalY - 0.5) return layout;

  return {
    ...layout,
    blocks: layout.blocks.map((block) =>
      block.id === evalBlock.id
        ? { ...block, box: { ...block.box, yMm: minEvalY } }
        : block,
    ),
  };
}

function evaluationEnabled(snapshot: CertificateSnapshotJsonV1): boolean {
  const prefs = snapshot.certificatePrefs;
  return Boolean(prefs.evaluation || prefs.homeroomComment);
}

function fitGradesTablesInBand(
  blocks: LayoutBlock[],
  grades: LayoutBlock[],
  startY: number,
  availableMm: number,
  rowGap: number,
  minRowHeight: number,
): LayoutBlock[] {
  if (!grades.length || availableMm <= 0) return blocks;

  const rowYs = [...new Set(grades.map((g) => g.box.yMm))].sort((a, b) => a - b);
  const rowHeights = rowYs.map((y) => {
    const rowBlocks = grades.filter((g) => Math.abs(g.box.yMm - y) < 0.6);
    return Math.max(...rowBlocks.map((b) => b.box.hMm));
  });

  const gapTotal = rowGap * Math.max(0, rowYs.length - 1);
  let heights = [...rowHeights];
  let totalH = heights.reduce((sum, h) => sum + h, 0) + gapTotal;

  if (totalH > availableMm) {
    const contentH = heights.reduce((sum, h) => sum + h, 0);
    const targetContentH = Math.max(
      minRowHeight * rowYs.length,
      availableMm - gapTotal,
    );
    const scale = targetContentH / contentH;
    heights = heights.map((h) => roundMm(Math.max(minRowHeight, h * scale)));
    totalH = heights.reduce((sum, h) => sum + h, 0) + gapTotal;
  } else if (totalH < availableMm && rowYs.length > 0) {
    const extraPerRow = (availableMm - totalH) / rowYs.length;
    heights = heights.map((h) => roundMm(h + extraPerRow));
    totalH = availableMm;
  }

  let targetY = startY;
  let result = blocks;
  for (let i = 0; i < rowYs.length; i += 1) {
    const y = rowYs[i]!;
    const h = heights[i]!;
    const rowIds = new Set(
      grades.filter((g) => Math.abs(g.box.yMm - y) < 0.6).map((g) => g.id),
    );
    result = result.map((block) =>
      rowIds.has(block.id)
        ? { ...block, box: { ...block.box, yMm: roundMm(targetY), hMm: h } }
        : block,
    );
    targetY = roundMm(targetY + h + rowGap);
  }

  return result;
}

/** Landscape pages are short — anchor footer tiers to the bottom and fit tables above. */
function normalizeVerticalContentStackLandscape(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  const H = printableHeight(layout.page.orientation, layout.page.paddingMm);
  const widthMm = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const gaps = LANDSCAPE_LAYOUT_GAPS_MM;
  let blocks = [...layout.blocks];

  const grades = blocks.filter((b) => b.type === 'grades_table');
  const evalBlocks = blocks.filter((b) => b.type === 'evaluation');
  const compositeAttendance = blocks.some((b) => b.type === 'attendance');
  const compositeSignatures = blocks.some((b) => b.type === 'signatures');
  const attBlocks = blocks.filter((b) => {
    if (!isAttendanceBlock(b) || !attendanceBlockEnabled(b, snapshot)) return false;
    if (compositeAttendance && b.type === 'attendance_field') return false;
    return true;
  });
  const footerBlocks = blocks.filter((b) => {
    if (!isFooterBlock(b) || !footerBlockEnabled(b, snapshot)) return false;
    if (compositeSignatures && (b.type === 'signature_field' || b.type === 'date')) return false;
    return true;
  });

  if (evalBlocks.length && evaluationEnabled(snapshot)) {
    blocks = resizeEvaluationFromContent(
      blocks,
      snapshot,
      widthMm,
      LANDSCAPE_MAX_EVAL_HEIGHT_MM,
    );
  }

  const evalTier = blocks.filter((b) => b.type === 'evaluation');
  const evalH = evalTier.length ? Math.max(...evalTier.map((b) => b.box.hMm)) : 0;
  const attH = attBlocks.length ? Math.max(...attBlocks.map((b) => b.box.hMm)) : 0;
  const footerH = footerBlocks.length ? Math.max(...footerBlocks.map((b) => b.box.hMm)) : 0;

  const sigY = roundMm(H - footerH);
  if (footerBlocks.length) {
    blocks = placeTierAt(blocks, footerBlocks, sigY);
  }

  const attY = roundMm(sigY - gaps.afterAttendance - attH);
  if (attBlocks.length) {
    blocks = placeTierAt(blocks, attBlocks, attY);
  }

  const tablesStart = roundMm(headerBottomMm(blocks) + gaps.metaToTables);
  const maxTablesBottom =
    evalTier.length && evaluationEnabled(snapshot)
      ? roundMm(attY - gaps.afterEvaluation - evalH - gaps.afterGrades)
      : attBlocks.length
        ? roundMm(attY - gaps.afterGrades)
        : footerBlocks.length
          ? roundMm(sigY - gaps.afterAttendance - gaps.afterGrades)
          : H;
  const tablesAvailable = roundMm(Math.max(0, maxTablesBottom - tablesStart));

  if (grades.length && tablesAvailable > 0) {
    blocks = fitGradesTablesInBand(
      blocks,
      grades,
      tablesStart,
      tablesAvailable,
      gaps.gradeRows,
      LANDSCAPE_MIN_GRADES_TABLE_HEIGHT_MM,
    );
  }

  if (evalTier.length && evaluationEnabled(snapshot)) {
    const gradesAfter = blocks.filter((b) => b.type === 'grades_table');
    const evalY = gradesAfter.length
      ? roundMm(tierBottom(gradesAfter) + gaps.afterGrades)
      : roundMm(tablesStart + gaps.afterGrades);
    blocks = placeTierAt(blocks, evalTier, evalY);
  }

  return { ...layout, blocks };
}

/** Stack grades → evaluation → attendance → footer (signatures/date) without overlap. */
export function normalizeVerticalContentStack(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  if (layout.page.orientation === 'landscape') {
    return normalizeVerticalContentStackLandscape(layout, snapshot);
  }

  const widthMm = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const gaps = LAYOUT_GAPS_MM;
  let blocks = [...layout.blocks];

  const grades = blocks.filter((b) => b.type === 'grades_table');
  const evalBlocks = blocks.filter((b) => b.type === 'evaluation');
  const compositeAttendance = blocks.some((b) => b.type === 'attendance');
  const compositeSignatures = blocks.some((b) => b.type === 'signatures');
  const attBlocks = blocks.filter((b) => {
    if (!isAttendanceBlock(b) || !attendanceBlockEnabled(b, snapshot)) return false;
    if (compositeAttendance && b.type === 'attendance_field') return false;
    return true;
  });
  const footerBlocks = blocks.filter((b) => {
    if (!isFooterBlock(b) || !footerBlockEnabled(b, snapshot)) return false;
    if (compositeSignatures && (b.type === 'signature_field' || b.type === 'date')) return false;
    return true;
  });

  let cursor = grades.length
    ? roundMm(tierBottom(grades) + gaps.afterGrades)
    : roundMm(headerBottomMm(blocks) + gaps.metaToTables);

  if (evalBlocks.length && evaluationEnabled(snapshot)) {
    blocks = placeTierAt(blocks, evalBlocks, cursor);
    blocks = resizeEvaluationFromContent(blocks, snapshot, widthMm);
    const evalAfter = blocks.filter((b) => b.type === 'evaluation');
    cursor = roundMm(tierBottom(evalAfter) + gaps.afterEvaluation);
  } else if (grades.length) {
    cursor = roundMm(tierBottom(grades) + gaps.afterGrades);
  }

  if (attBlocks.length) {
    blocks = placeTierAt(blocks, attBlocks, cursor);
    const attAfter = blocks.filter((b) => attBlocks.some((ab) => ab.id === b.id));
    cursor = roundMm(tierBottom(attAfter) + gaps.afterAttendance);
  }

  if (footerBlocks.length) {
    blocks = placeTierAt(blocks, footerBlocks, cursor);
  }

  return { ...layout, blocks };
}

/** Inject evaluation block when school pref is on but layout lacks it. */
export function ensureEvaluationBlock(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  if (!evaluationEnabled(snapshot)) return layout;
  if (layout.blocks.some((b) => b.type === 'evaluation')) return layout;

  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const gradesBottom = gradesBottomMm(layout.blocks);
  const yMm = roundMm(
    (gradesBottom ?? headerBottomMm(layout.blocks)) +
      (gradesBottom ? LAYOUT_GAPS_MM.afterGrades : 12),
  );

  const evalBlock: LayoutBlock = {
    id: 'injected-evaluation',
    type: 'evaluation',
    box: { xMm: 0, yMm, wMm: W, hMm: evaluationHandwrittenHeightMm(DEFAULT_CERTIFICATE_FONT_SIZE_PT) },
    style: {
      fontFamily: 'Arial',
      fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,
      fontWeight: 'normal',
      color: '#1e293b',
      textAlign: 'center',
      backgroundColor: 'transparent',
    },
    props: { title: 'הערכה' },
  };

  return { ...layout, blocks: [...layout.blocks, evalBlock] };
}

function shrinkGradesTables(
  blocks: LayoutBlock[],
  amountMm: number,
  minHeight = MIN_GRADES_TABLE_HEIGHT_MM,
): LayoutBlock[] {
  if (amountMm <= 0) return blocks;
  return blocks.map((block) =>
    block.type === 'grades_table'
      ? {
          ...block,
          box: {
            ...block.box,
            hMm: roundMm(Math.max(minHeight, block.box.hMm - amountMm)),
          },
        }
      : block,
  );
}

function shrinkEvaluation(
  blocks: LayoutBlock[],
  amountMm: number,
  minHeight = MIN_EVAL_HEIGHT_MM,
): LayoutBlock[] {
  if (amountMm <= 0) return blocks;
  return blocks.map((block) =>
    block.type === 'evaluation'
      ? {
          ...block,
          box: {
            ...block.box,
            hMm: roundMm(Math.max(minHeight, block.box.hMm - amountMm)),
          },
        }
      : block,
  );
}

/** Compress content so the full layout fits on one printable page. */
export function fitLayoutToSinglePage(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  const H = printableHeight(layout.page.orientation, layout.page.paddingMm);
  const widthMm = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const maxBottom = roundMm(H - PAGE_BOTTOM_MARGIN_MM);
  const isLandscape = layout.page.orientation === 'landscape';
  const minGradesH = minGradesTableHeightFor(layout.page.orientation);
  const minEvalH = isLandscape ? LANDSCAPE_MIN_EVAL_HEIGHT_MM : MIN_EVAL_HEIGHT_MM;
  const maxEvalH = maxEvalHeightFor(layout.page.orientation);

  let blocks = [...layout.blocks];
  let iterations = 0;

  while (iterations < 24) {
    blocks = normalizeVerticalContentStack({ ...layout, blocks }, snapshot).blocks;
    blocks = resizeEvaluationFromContent(blocks, snapshot, widthMm, maxEvalH);

    const bottom = layoutBottomMm(blocks);
    if (bottom <= maxBottom + 0.5) {
      return { ...layout, blocks };
    }

    const overflow = roundMm(bottom - maxBottom);
    const grades = blocks.filter((b) => b.type === 'grades_table');
    const evalBlock = blocks.find((b) => b.type === 'evaluation');
    const canShrinkGrades = grades.some((b) => b.box.hMm > minGradesH + 0.5);
    const canShrinkEval = Boolean(evalBlock && evalBlock.box.hMm > minEvalH + 0.5);

    if (canShrinkGrades) {
      blocks = shrinkGradesTables(blocks, Math.min(isLandscape ? 4 : 6, overflow), minGradesH);
    } else if (canShrinkEval) {
      blocks = shrinkEvaluation(blocks, Math.min(isLandscape ? 3 : 4, overflow), minEvalH);
    } else {
      break;
    }

    iterations += 1;
  }

  return { ...layout, blocks };
}

export function normalizeLayoutForRender(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  let next = layout;
  next = ensureEvaluationBlock(next, snapshot);
  next = ensureAttendanceFieldBlocks(next, snapshot);
  next = expandGradesTablesForContent(next, snapshot);
  const widthMm = printableWidth(next.page.orientation, next.page.paddingMm);
  next = {
    ...next,
    blocks: resizeEvaluationFromContent(next.blocks, snapshot, widthMm),
  };
  next = normalizeVerticalContentStack(next, snapshot);
  next = normalizeAttendanceFieldPositions(next, snapshot);
  next = normalizeSignatureFieldPositions(next);
  return {
    ...next,
    blocks: excludeRedundantFieldBlocks(next.blocks),
  };
}

/** Inject preview-only blocks for designer canvas; keep saved block positions stable. */
export function normalizeLayoutDesignerPreview(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  const widthMm = printableWidth(layout.page.orientation, layout.page.paddingMm);
  let next = ensureEvaluationBlock(layout, snapshot);
  next = ensureAttendanceFieldBlocks(next, snapshot);
  next = {
    ...next,
    blocks: resizeEvaluationFromContent(next.blocks, snapshot, widthMm),
  };
  next = normalizeAttendanceFieldPositions(next, snapshot);
  next = normalizeSignatureFieldPositions(next);
  return next;
}

/** Drop per-field blocks when a composite block of the same section exists. */
export function excludeRedundantFieldBlocks(blocks: LayoutBlock[]): LayoutBlock[] {
  const compositeAttendance = blocks.some((b) => b.type === 'attendance');
  const compositeSignatures = blocks.some((b) => b.type === 'signatures');
  return blocks.filter((block) => {
    if (compositeAttendance && block.type === 'attendance_field') return false;
    if (compositeSignatures && (block.type === 'signature_field' || block.type === 'date')) {
      return false;
    }
    return true;
  });
}

/** Full auto-layout stack for wizard / legacy repair — not used at PDF render. */
export function normalizeLayoutAutoStack(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  const gaps = layoutGapsFor(layout.page.orientation);
  let next = layout;
  next = adjustHeaderToTablesGap(next, gaps.metaToTables);
  next = compactGradeTableRows(next, gaps.gradeRows);
  next = ensureEvaluationBlock(next, snapshot);
  next = normalizeVerticalContentStack(next, snapshot);
  next = fitLayoutToSinglePage(next, snapshot);
  return next;
}
