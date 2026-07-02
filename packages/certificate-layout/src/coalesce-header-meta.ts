import type { CertificateTemplateLayoutV1, LayoutBlock } from '@school/shared';
import { HEADER_META_ROW_FIELD_KEYS } from '@school/shared';

const META_FIELD_KEYS = new Set<string>(HEADER_META_ROW_FIELD_KEYS);

function isLegacyMetaFieldBlock(block: LayoutBlock): boolean {
  return (
    block.type === 'field' &&
    META_FIELD_KEYS.has(String((block.props as { fieldKey?: string }).fieldKey))
  );
}

/** Merge separate header `field` blocks into one `header_meta_row` for rendering. */
export function coalesceHeaderMetaRow(
  layout: CertificateTemplateLayoutV1,
): CertificateTemplateLayoutV1 {
  if (layout.blocks.some((b) => b.type === 'header_meta_row')) {
    return layout;
  }

  const metaBlocks = layout.blocks.filter(isLegacyMetaFieldBlock);
  if (metaBlocks.length === 0) return layout;

  const minY = Math.min(...metaBlocks.map((b) => b.box.yMm));
  const minX = Math.min(...metaBlocks.map((b) => b.box.xMm));
  const maxRight = Math.max(...metaBlocks.map((b) => b.box.xMm + b.box.wMm));
  const maxBottom = Math.max(...metaBlocks.map((b) => b.box.yMm + b.box.hMm));
  const ref = metaBlocks[0]!;

  const headerMetaRow: LayoutBlock = {
    id: 'coalesced-header-meta-row',
    type: 'header_meta_row',
    box: {
      xMm: minX,
      yMm: minY,
      wMm: maxRight - minX,
      hMm: Math.max(12, maxBottom - minY),
    },
    style: ref.style,
    props: {},
  };

  let inserted = false;
  const blocks: LayoutBlock[] = [];
  for (const block of layout.blocks) {
    if (isLegacyMetaFieldBlock(block)) {
      if (!inserted) {
        blocks.push(headerMetaRow);
        inserted = true;
      }
      continue;
    }
    blocks.push(block);
  }

  return { ...layout, blocks };
}
