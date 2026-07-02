import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateLayoutV1,
  LayoutBlock,
} from '@school/shared';
import {
  A4_DIMENSIONS_MM,
  ATTENDANCE_FIELD_KEYS,
  DEFAULT_ATTENDANCE_FIELD_LABELS,
  DEFAULT_CERTIFICATE_FONT_SIZE_PT,
  attendanceFieldEnabled,
} from '@school/shared';
import { distributeRowSlots } from './ready-layout-wizard';

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

function defaultAttendanceStyle(): LayoutBlock['style'] {
  return {
    fontFamily: 'Arial',
    fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,
    fontWeight: 'normal',
    color: '#1e293b',
    textAlign: 'center',
    backgroundColor: 'transparent',
  };
}

function isAttendanceFieldBlock(
  block: LayoutBlock,
): block is LayoutBlock & { type: 'attendance_field' } {
  return block.type === 'attendance_field';
}

function usesCompositeAttendanceBlock(layout: CertificateTemplateLayoutV1): boolean {
  return layout.blocks.some((b) => b.type === 'attendance');
}

/** Inject missing per-field attendance blocks for enabled school prefs. */
export function ensureAttendanceFieldBlocks(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  if (usesCompositeAttendanceBlock(layout)) return layout;

  const enabledKeys = ATTENDANCE_FIELD_KEYS.filter((key) =>
    attendanceFieldEnabled(snapshot.certificatePrefs, key),
  );
  if (enabledKeys.length === 0) return layout;

  const existing = layout.blocks.filter(isAttendanceFieldBlock);
  const existingKeys = new Set(existing.map((b) => b.props.fieldKey));
  const missing = enabledKeys.filter((key) => !existingKeys.has(key));
  if (missing.length === 0) return layout;

  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const H = printableHeight(layout.page.orientation, layout.page.paddingMm);
  const legacyAtt = layout.blocks.find((b) => b.type === 'attendance');
  const refBlock = existing[0] ?? legacyAtt;
  const yMm = refBlock?.box.yMm ?? roundMm(H * 0.75);
  const hMm = refBlock?.box.hMm ?? 10;
  const style = refBlock?.style ?? defaultAttendanceStyle();

  const injected: LayoutBlock[] = missing.map((fieldKey) => ({
    id: `injected-attendance-${fieldKey}`,
    type: 'attendance_field',
    box: { xMm: 0, yMm, wMm: roundMm(W / enabledKeys.length), hMm },
    style,
    props: {
      fieldKey,
      label: DEFAULT_ATTENDANCE_FIELD_LABELS[fieldKey],
    },
  }));

  return { ...layout, blocks: [...layout.blocks, ...injected] };
}

/**
 * Distribute enabled attendance_field blocks evenly in one row (RTL order).
 * Preserves Y/height; fixes overlapping X from legacy templates.
 */
export function normalizeAttendanceFieldPositions(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
): CertificateTemplateLayoutV1 {
  if (usesCompositeAttendanceBlock(layout)) return layout;

  const attBlocks = layout.blocks.filter(
    (b): b is LayoutBlock & { type: 'attendance_field' } =>
      isAttendanceFieldBlock(b) &&
      attendanceFieldEnabled(snapshot.certificatePrefs, b.props.fieldKey),
  );

  if (attBlocks.length <= 1) return layout;

  const ordered = ATTENDANCE_FIELD_KEYS.map((key) =>
    attBlocks.find((b) => b.props.fieldKey === key),
  ).filter((b): b is LayoutBlock & { type: 'attendance_field' } => Boolean(b));

  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);
  const gap = 6;
  const slots = distributeRowSlots(ordered.length, W, gap);
  const repositioned = new Map<string, LayoutBlock>();

  ordered.forEach((block, i) => {
    const slot = slots[i]!;
    repositioned.set(block.id, {
      ...block,
      box: {
        ...block.box,
        xMm: slot.xMm,
        wMm: slot.wMm,
      },
    });
  });

  return {
    ...layout,
    blocks: layout.blocks.map((block) => repositioned.get(block.id) ?? block),
  };
}
