import type {
  AttendanceFieldKey,
  CertificatePrefs,
  CertificateTemplateLayoutV1,
  CertificateTemplateOrientation,
  LayoutBlock,
  SignatureFieldKey,
} from '@school/shared';
import {
  ATTENDANCE_FIELD_KEYS,
  DEFAULT_ATTENDANCE_FIELD_LABELS,
  DEFAULT_GRADES_TABLE_HEADER_LABELS,
  DEFAULT_SIGNATURE_FIELD_LABELS,
  SIGNATURE_FIELD_KEYS,
  signatureTypeEnabled,
} from '@school/shared';
import {
  A4_DIMENSIONS_MM,
  DEFAULT_CERTIFICATE_FONT_SIZE_PT,
  EVALUATION_HANDWRITTEN_LINE_COUNT,
} from '@school/shared';
import { evaluationHandwrittenHeightMm } from './handwritten-render';
import { LANDSCAPE_LAYOUT_GAPS_MM, LAYOUT_GAPS_MM } from './layout-normalize';

export type ReadyLayoutWizardInput = {
  orientation: CertificateTemplateOrientation;
  /** Parent grading-set-type ids (one grades table per category). Empty → single combined table. */
  categoryIds: string[];
  prefs: CertificatePrefs;
  /** Preserve page padding/background from current layout when replacing blocks. */
  baseLayout?: Pick<CertificateTemplateLayoutV1, 'page'>;
  createId?: () => string;
};

type RowSlot = { xMm: number; wMm: number };

let idCounter = 0;

function defaultCreateId(): string {
  idCounter += 1;
  return `wizard-${idCounter}`;
}

function roundMm(n: number): number {
  return Math.round(n * 10) / 10;
}

function printableWidth(orientation: CertificateTemplateOrientation, padding: { left: number; right: number }) {
  const page = A4_DIMENSIONS_MM[orientation];
  return page.width - padding.left - padding.right;
}

function printableHeight(orientation: CertificateTemplateOrientation, padding: { top: number; bottom: number }) {
  const page = A4_DIMENSIONS_MM[orientation];
  return page.height - padding.top - padding.bottom;
}

/** Evenly space N items across total width with fixed gap. */
export function distributeRowSlots(count: number, totalWidth: number, gapMm: number): RowSlot[] {
  if (count <= 0) return [];
  const wMm = roundMm((totalWidth - gapMm * (count - 1)) / count);
  return Array.from({ length: count }, (_, i) => ({
    xMm: roundMm(i * (wMm + gapMm)),
    wMm,
  }));
}

function baseStyle(overrides: Partial<LayoutBlock['style']> = {}): LayoutBlock['style'] {
  return {
    fontFamily: 'Arial',
    fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,
    fontWeight: 'normal',
    color: '#1e293b',
    textAlign: 'right',
    backgroundColor: 'transparent',
    ...overrides,
  };
}

function blockBase(
  createId: () => string,
  box: LayoutBlock['box'],
  style: LayoutBlock['style'],
): Pick<LayoutBlock, 'id' | 'box' | 'style'> {
  return { id: createId(), box, style };
}

/** Landscape has more width and less height — prefer fewer table rows. */
function planTableGrid(
  tableCount: number,
  isLandscape: boolean,
): { tableRows: number; colsPerRow: number } {
  if (tableCount <= 0) return { tableRows: 0, colsPerRow: 0 };
  if (isLandscape) {
    if (tableCount <= 4) return { tableRows: 1, colsPerRow: tableCount };
    if (tableCount <= 8) {
      const colsPerRow = Math.ceil(tableCount / 2);
      return { tableRows: 2, colsPerRow };
    }
    const colsPerRow = 4;
    return { tableRows: Math.ceil(tableCount / colsPerRow), colsPerRow };
  }
  const tableRows =
    tableCount <= 2 ? 1 : tableCount <= 4 ? 2 : Math.ceil(tableCount / 2);
  return { tableRows, colsPerRow: Math.ceil(tableCount / tableRows) };
}

/** Build a symmetric, school-aware certificate layout (replaces blocks only). */
export function buildReadyCertificateLayout(input: ReadyLayoutWizardInput): CertificateTemplateLayoutV1 {
  const createId = input.createId ?? defaultCreateId;
  const page = input.baseLayout?.page ?? {
    orientation: input.orientation,
    backgroundColor: '#ffffff',
    paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
  };
  const W = printableWidth(page.orientation, page.paddingMm);
  const H = printableHeight(page.orientation, page.paddingMm);
  const isLandscape = page.orientation === 'landscape';
  const gaps = isLandscape ? LANDSCAPE_LAYOUT_GAPS_MM : LAYOUT_GAPS_MM;
  const gap = isLandscape ? 5 : 6;
  const blocks: LayoutBlock[] = [];

  const titleStyle = baseStyle({
    fontSizePt: isLandscape ? 17 : 20,
    fontWeight: 'bold',
    color: '#1e3a5f',
    textAlign: 'center',
  });

  const rightColW = isLandscape ? 46 : 44;
  const logoSize = isLandscape ? 24 : 34;
  const besiyataX = roundMm(W - rightColW);

  // —— Header ——
  blocks.push({
    ...blockBase(
      createId,
      { xMm: besiyataX, yMm: 0, wMm: rightColW, hMm: isLandscape ? 6 : 7 },
      baseStyle({ fontSizePt: 9, textAlign: 'right' }),
    ),
    type: 'static_text',
    props: { text: 'בסיעתא דשמיא' },
  });

  blocks.push({
    ...blockBase(createId, { xMm: 0, yMm: 0, wMm: logoSize, hMm: logoSize }, baseStyle()),
    type: 'logo',
    props: { storageKey: null, objectFit: 'contain' },
  });

  const titleX = isLandscape ? roundMm(logoSize + 4) : roundMm(W * 0.12);
  const titleW = isLandscape
    ? roundMm(W - titleX - rightColW - 4)
    : roundMm(W * 0.76);
  blocks.push({
    ...blockBase(
      createId,
      {
        xMm: titleX,
        yMm: isLandscape ? 2 : 4,
        wMm: titleW,
        hMm: isLandscape ? 10 : 14,
      },
      titleStyle,
    ),
    type: 'static_text',
    props: { text: 'תעודת הערכה' },
  });

  if (input.prefs.showProfileNameOnCertificate) {
    blocks.push({
      ...blockBase(
        createId,
        {
          xMm: besiyataX,
          yMm: isLandscape ? 7 : 7,
          wMm: rightColW,
          hMm: isLandscape ? 7 : 8,
        },
        baseStyle({ fontSizePt: isLandscape ? 10 : DEFAULT_CERTIFICATE_FONT_SIZE_PT, textAlign: 'right', color: '#475569' }),
      ),
      type: 'field',
      props: { fieldKey: 'profileName' },
    });
  }

  const metaY = isLandscape ? 22 : 38;
  const metaHeight = isLandscape ? 9 : 12;
  blocks.push({
    ...blockBase(
      createId,
      { xMm: 0, yMm: metaY, wMm: W, hMm: metaHeight },
      baseStyle({ fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT, textAlign: 'right' }),
    ),
    type: 'header_meta_row',
    props: {},
  });

  const headerBottom = roundMm(metaY + metaHeight);
  const tablesStartY = roundMm(headerBottom + gaps.metaToTables);

  const showSubCategoryRows = input.prefs.showSubCategoriesOnCertificate !== false;

  // —— Plan vertical stack from page bottom so footer/attendance always fit ——
  const hasEvaluation = Boolean(input.prefs.evaluation || input.prefs.homeroomComment);
  const sigHeight = isLandscape ? 14 : 18;
  const attHeight = isLandscape ? 9 : 10;
  const evalHeight = hasEvaluation
    ? isLandscape
      ? evaluationHandwrittenHeightMm(11, 2)
      : evaluationHandwrittenHeightMm(
          DEFAULT_CERTIFICATE_FONT_SIZE_PT,
          EVALUATION_HANDWRITTEN_LINE_COUNT,
        )
    : 0;

  let stackBottom = H;
  stackBottom = roundMm(stackBottom - sigHeight);
  const sigY = stackBottom;

  stackBottom = roundMm(stackBottom - gaps.afterAttendance);
  stackBottom = roundMm(stackBottom - attHeight);
  const attY = stackBottom;

  const maxTablesBottom = hasEvaluation
    ? roundMm(attY - gaps.afterEvaluation - evalHeight - gaps.afterGrades)
    : roundMm(attY - gaps.afterGrades);
  const tablesAvailable = roundMm(Math.max(0, maxTablesBottom - tablesStartY));

  // —— Grades tables ——
  const categories = input.categoryIds.filter((id) => id.trim().length > 0);
  const tableCount = categories.length > 0 ? categories.length : 1;
  const { tableRows, colsPerRow } = planTableGrid(tableCount, isLandscape);
  const tableRowGap = isLandscape ? 2 : 3;
  const minTableRowH = isLandscape ? 28 : 36;
  const maxTableRowH = isLandscape
    ? tableRows === 1
      ? 56
      : 40
    : tableRows === 1
      ? 78
      : 64;
  const tableRowHeight = roundMm(
    Math.max(
      minTableRowH,
      Math.min(
        maxTableRowH,
        (tablesAvailable - tableRowGap * Math.max(0, tableRows - 1)) / tableRows,
      ),
    ),
  );
  const tableStyle = baseStyle();
  let yMm = tablesStartY;

  const tableIds = categories.length > 0 ? categories : [null as string | null];

  for (let row = 0; row < tableRows; row += 1) {
    const start = row * colsPerRow;
    const end = Math.min(start + colsPerRow, tableIds.length);
    const rowCount = end - start;
    const slots = distributeRowSlots(rowCount, W, gap);
    for (let i = 0; i < rowCount; i += 1) {
      const categoryId = tableIds[start + i];
      const slot = slots[i]!;
      blocks.push({
        ...blockBase(
          createId,
          { xMm: slot.xMm, yMm, wMm: slot.wMm, hMm: tableRowHeight },
          tableStyle,
        ),
        type: 'grades_table',
        props: {
          showHeader: true,
          headerLabels: { ...DEFAULT_GRADES_TABLE_HEADER_LABELS },
          categoryId: categoryId ?? null,
          showCategoryTitle: true,
          showSubCategoryRows,
        },
      });
    }
    yMm = roundMm(yMm + tableRowHeight + tableRowGap);
  }

  // —— Evaluation ——
  if (hasEvaluation) {
    const tablesBottom =
      tableRows > 0 ? roundMm(yMm - tableRowGap) : tablesStartY;
    const evaluationY = roundMm(tablesBottom + gaps.afterGrades);
    blocks.push({
      ...blockBase(
        createId,
        { xMm: 0, yMm: evaluationY, wMm: W, hMm: evalHeight },
        baseStyle({ textAlign: 'center' }),
      ),
      type: 'evaluation',
      props: { title: 'הערכה' },
    });
  }

  // —— Attendance row (all fields; visibility follows profile prefs at render) ——
  const attKeysToPlace = [...ATTENDANCE_FIELD_KEYS];
  const attSlots = distributeRowSlots(attKeysToPlace.length, W, gap);
  attKeysToPlace.forEach((fieldKey, i) => {
    const slot = attSlots[i]!;
    blocks.push({
      ...blockBase(
        createId,
        { xMm: slot.xMm, yMm: attY, wMm: slot.wMm, hMm: attHeight },
        baseStyle({ fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT, textAlign: 'center' }),
      ),
      type: 'attendance_field',
      props: {
        fieldKey: fieldKey as AttendanceFieldKey,
        label: DEFAULT_ATTENDANCE_FIELD_LABELS[fieldKey],
      },
    });
  });

  // —— Signatures row ——
  const sigKeys = SIGNATURE_FIELD_KEYS.filter((key) =>
    signatureTypeEnabled(input.prefs, key),
  );
  const sigKeysToPlace = sigKeys.length > 0 ? sigKeys : [...SIGNATURE_FIELD_KEYS];
  const showDate = input.prefs.dateOnCertificate !== false;
  const footerCount = sigKeysToPlace.length + (showDate ? 1 : 0);
  const footerSlots = distributeRowSlots(footerCount, W, gap);

  type FooterItem =
    | { kind: 'signature'; key: SignatureFieldKey }
    | { kind: 'date' };

  const footerItems: FooterItem[] = sigKeysToPlace.map((key) => ({
    kind: 'signature',
    key: key as SignatureFieldKey,
  }));
  if (showDate) footerItems.push({ kind: 'date' });

  footerItems.forEach((item, i) => {
    const slot = footerSlots[footerItems.length - 1 - i]!;
    if (item.kind === 'signature') {
      blocks.push({
        ...blockBase(
          createId,
          { xMm: slot.xMm, yMm: sigY, wMm: slot.wMm, hMm: sigHeight },
          baseStyle({ fontSizePt: 9, textAlign: 'center' }),
        ),
        type: 'signature_field',
        props: {
          signatureKey: item.key,
          label: DEFAULT_SIGNATURE_FIELD_LABELS[item.key],
        },
      });
      return;
    }
    blocks.push({
      ...blockBase(
        createId,
        { xMm: slot.xMm, yMm: sigY, wMm: slot.wMm, hMm: sigHeight },
        baseStyle({ fontSizePt: 9, textAlign: 'center' }),
      ),
      type: 'date',
      props: { format: 'hebrew' },
    });
  });

  return {
    layoutSchemaVersion: 1,
    page,
    blocks,
  };
}
