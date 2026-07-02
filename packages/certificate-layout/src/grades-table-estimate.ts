import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateLayoutV1,
  LayoutBlock,
} from '@school/shared';

type GradesTableBlock = LayoutBlock & { type: 'grades_table' };

function roundMm(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Count rendered table rows for a grades_table block (mirrors renderGradesTable). */
export function countGradesTableRows(
  block: GradesTableBlock,
  snapshot: CertificateSnapshotJsonV1,
): number {
  const prefs = snapshot.certificatePrefs;
  const filterCategoryId = block.props.categoryId?.trim() || null;
  const showCategoryTitle =
    block.props.showCategoryTitle ?? (filterCategoryId === null);
  const showComment = snapshot.showAnyGradeComment ?? false;
  const showSubRows =
    block.props.showSubCategoryRows ??
    prefs.showSubCategoriesOnCertificate !== false;

  let count = 0;
  if (block.props.showHeader) count += 1;

  const categories = filterCategoryId
    ? snapshot.subjectCategories.filter((c) => c.categoryId === filterCategoryId)
    : snapshot.subjectCategories;

  const categoryHeading =
    filterCategoryId && categories[0]?.categoryLabel
      ? categories[0].categoryLabel
      : null;

  for (const cat of categories) {
    if (!cat.subjects.length && !cat.subCategories?.length) continue;
    if (showCategoryTitle && !categoryHeading) count += 1;
    count += cat.subjects.length;
    for (const sub of cat.subCategories ?? []) {
      if (showSubRows && sub.subCategoryLabel) count += 1;
      count += sub.subjects.length;
    }
  }

  if (count === 0 && filterCategoryId) return 1;
  return Math.max(count, 1);
}

export function estimateGradesTableHeightMm(
  block: GradesTableBlock,
  snapshot: CertificateSnapshotJsonV1,
): number {
  const rowCount = countGradesTableRows(block, snapshot);
  const fontPt = block.style.fontSizePt;
  const showComment = snapshot.showAnyGradeComment ?? false;
  const filterCategoryId = block.props.categoryId?.trim() || null;
  const hasCategoryHeading = Boolean(
    filterCategoryId &&
      snapshot.subjectCategories.some((c) => c.categoryId === filterCategoryId && c.categoryLabel),
  );

  const headerMm = block.props.showHeader ? fontPt * 0.62 : 0;
  const headingMm = hasCategoryHeading ? 9 : 0;
  const rowMm = fontPt * (showComment ? 0.58 : 0.52);
  const paddingMm = 5;

  return roundMm(headerMm + headingMm + rowCount * rowMm + paddingMm);
}

const ROW_Y_TOLERANCE_MM = 0.6;
const PUSH_BELOW_TOLERANCE_MM = 0.5;

/**
 * Grow grades tables when snapshot has more subjects than the layout box fits.
 * Pushes blocks below each expanded row down by the required delta.
 */
export function expandGradesTablesForContent(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  let blocks = [...layout.blocks];
  const gradeBlocks = blocks.filter((b): b is GradesTableBlock => b.type === 'grades_table');
  if (!gradeBlocks.length) return layout;

  const rowYs = [...new Set(gradeBlocks.map((g) => g.box.yMm))].sort((a, b) => a - b);

  for (const rowY of rowYs) {
    const rowIds = new Set(
      blocks
        .filter(
          (b) =>
            b.type === 'grades_table' && Math.abs(b.box.yMm - rowY) < ROW_Y_TOLERANCE_MM,
        )
        .map((b) => b.id),
    );
    if (!rowIds.size) continue;

    const rowBlocks = blocks.filter((b) => rowIds.has(b.id)) as GradesTableBlock[];
    const neededH = Math.max(
      ...rowBlocks.map((b) => estimateGradesTableHeightMm(b, snapshot)),
    );
    const currentH = Math.max(...rowBlocks.map((b) => b.box.hMm));
    const newH = roundMm(Math.max(currentH, neededH));
    const oldRowBottom = roundMm(rowY + currentH);
    const newRowBottom = roundMm(rowY + newH);
    const delta = roundMm(newRowBottom - oldRowBottom);

    if (Math.abs(newH - currentH) <= 0.5 && delta <= 0.5) continue;

    blocks = blocks.map((block) =>
      rowIds.has(block.id)
        ? { ...block, box: { ...block.box, hMm: newH } }
        : block,
    );

    if (delta > 0.5) {
      blocks = blocks.map((block) => {
        if (rowIds.has(block.id)) return block;
        if (block.box.yMm >= oldRowBottom - PUSH_BELOW_TOLERANCE_MM) {
          return {
            ...block,
            box: { ...block.box, yMm: roundMm(block.box.yMm + delta) },
          };
        }
        return block;
      });
    }
  }

  return { ...layout, blocks };
}
