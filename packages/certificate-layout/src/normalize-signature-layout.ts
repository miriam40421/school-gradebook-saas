import type { CertificateTemplateLayoutV1, LayoutBlock } from '@school/shared';

import { A4_DIMENSIONS_MM, SIGNATURE_FIELD_KEYS } from '@school/shared';

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



function isSignatureFieldBlock(

  block: LayoutBlock,

): block is LayoutBlock & { type: 'signature_field' } {

  return block.type === 'signature_field';

}



function isDateBlock(block: LayoutBlock): block is LayoutBlock & { type: 'date' } {

  return block.type === 'date';

}



type FooterRowItem =

  | { kind: 'signature'; key: (typeof SIGNATURE_FIELD_KEYS)[number]; block: LayoutBlock }

  | { kind: 'date'; block: LayoutBlock };



/**

 * Footer row (RTL): מחנכת → מנהלת → הורים → תאריך.

 * Preserves designer Y positions; only distributes horizontal slots.

 */

function usesCompositeSignaturesBlock(layout: CertificateTemplateLayoutV1): boolean {
  return layout.blocks.some((b) => b.type === 'signatures');
}

export function normalizeSignatureFieldPositions(

  layout: CertificateTemplateLayoutV1,

): CertificateTemplateLayoutV1 {

  if (usesCompositeSignaturesBlock(layout)) return layout;

  const sigBlocks = layout.blocks.filter(isSignatureFieldBlock);

  const dateBlock = layout.blocks.find(isDateBlock);



  if (sigBlocks.length === 0 && !dateBlock) return layout;



  const items: FooterRowItem[] = [];

  for (const key of SIGNATURE_FIELD_KEYS) {

    const block = sigBlocks.find((b) => b.props.signatureKey === key);

    if (block) items.push({ kind: 'signature', key, block });

  }

  if (dateBlock) items.push({ kind: 'date', block: dateBlock });



  if (items.length <= 1) return layout;



  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);

  const gap = 6;

  const slots = distributeRowSlots(items.length, W, gap);

  const repositioned = new Map<string, LayoutBlock>();



  items.forEach((item, i) => {

    const slot = slots[items.length - 1 - i]!;

    repositioned.set(item.block.id, {

      ...item.block,

      box: {

        ...item.block.box,

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

