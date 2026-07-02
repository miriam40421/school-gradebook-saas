import { coalesceHeaderMetaRow } from '../src/coalesce-header-meta';
import type { CertificateTemplateLayoutV1 } from '@school/shared';

const baseLayout: CertificateTemplateLayoutV1 = {
  layoutSchemaVersion: 1,
  page: {
    orientation: 'portrait',
    backgroundColor: '#fff',
    paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  blocks: [],
};

describe('coalesceHeaderMetaRow', () => {
  it('returns layout unchanged when header_meta_row already exists', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'meta',
          type: 'header_meta_row' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 12 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal' as const,
            color: '#1e293b',
            textAlign: 'right' as const,
            backgroundColor: 'transparent',
          },
          props: {},
        },
      ],
    };
    expect(coalesceHeaderMetaRow(layout)).toBe(layout);
  });

  it('merges legacy meta field blocks into one row block', () => {
    const style = {
      fontFamily: 'Arial',
      fontSizePt: 11,
      fontWeight: 'normal' as const,
      color: '#1e293b',
      textAlign: 'right' as const,
      backgroundColor: 'transparent',
    };
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'a',
          type: 'field' as const,
          box: { xMm: 0, yMm: 5, wMm: 40, hMm: 8 },
          style,
          props: { fieldKey: 'studentName' as const },
        },
        {
          id: 'b',
          type: 'field' as const,
          box: { xMm: 60, yMm: 5, wMm: 40, hMm: 8 },
          style,
          props: { fieldKey: 'className' as const },
        },
      ],
    };
    const merged = coalesceHeaderMetaRow(layout);
    expect(merged.blocks).toHaveLength(1);
    expect(merged.blocks[0]!.type).toBe('header_meta_row');
  });
});
