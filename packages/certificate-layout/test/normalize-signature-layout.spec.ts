import { normalizeSignatureFieldPositions } from '../src/normalize-signature-layout';

import type { CertificateTemplateLayoutV1 } from '@school/shared';



const style = {

  fontFamily: 'Arial',

  fontSizePt: 9,

  fontWeight: 'normal' as const,

  color: '#1e293b',

  textAlign: 'center' as const,

  backgroundColor: 'transparent',

};



const baseLayout: CertificateTemplateLayoutV1 = {

  layoutSchemaVersion: 1,

  page: {

    orientation: 'portrait',

    backgroundColor: '#fff',

    paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },

  },

  blocks: [],

};



describe('normalizeSignatureFieldPositions', () => {

  it('places homeroom rightmost and parent leftmost (מחנכת → מנהלת → הורים)', () => {

    const layout = {

      ...baseLayout,

      blocks: [

        {

          id: 'h',

          type: 'signature_field' as const,

          box: { xMm: 0, yMm: 200, wMm: 60, hMm: 18 },

          style,

          props: { signatureKey: 'homeroom' as const, label: 'חתימת המחנכת' },

        },

        {

          id: 'p',

          type: 'signature_field' as const,

          box: { xMm: 70, yMm: 200, wMm: 60, hMm: 18 },

          style,

          props: { signatureKey: 'principal' as const, label: 'חתימת המנהלת' },

        },

        {

          id: 'a',

          type: 'signature_field' as const,

          box: { xMm: 140, yMm: 200, wMm: 60, hMm: 18 },

          style,

          props: { signatureKey: 'parent' as const, label: 'חתימת ההורים' },

        },

      ],

    };

    const normalized = normalizeSignatureFieldPositions(layout);

    const homeroom = normalized.blocks.find(

      (b) => b.type === 'signature_field' && b.props.signatureKey === 'homeroom',

    )!;

    const principal = normalized.blocks.find(

      (b) => b.type === 'signature_field' && b.props.signatureKey === 'principal',

    )!;

    const parent = normalized.blocks.find(

      (b) => b.type === 'signature_field' && b.props.signatureKey === 'parent',

    )!;

    expect(homeroom.box.xMm).toBeGreaterThan(principal.box.xMm);

    expect(principal.box.xMm).toBeGreaterThan(parent.box.xMm);

    expect(homeroom.box.yMm).toBe(200);

    expect(principal.box.yMm).toBe(200);

    expect(parent.box.yMm).toBe(200);

  });



  it('places date on the same row left of signatures and preserves Y', () => {

    const layout = {

      ...baseLayout,

      blocks: [

        {

          id: 'h',

          type: 'signature_field' as const,

          box: { xMm: 0, yMm: 200, wMm: 60, hMm: 18 },

          style,

          props: { signatureKey: 'homeroom' as const, label: 'חתימת המחנכת' },

        },

        {

          id: 'd',

          type: 'date' as const,

          box: { xMm: 0, yMm: 200, wMm: 190, hMm: 9 },

          style,

          props: { format: 'hebrew' as const },

        },

      ],

    };

    const normalized = normalizeSignatureFieldPositions(layout);

    const homeroom = normalized.blocks.find((b) => b.id === 'h')!;

    const date = normalized.blocks.find((b) => b.id === 'd')!;

    expect(homeroom.box.yMm).toBe(200);

    expect(date.box.yMm).toBe(200);

    expect(homeroom.box.xMm).toBeGreaterThan(date.box.xMm);

  });



  it('preserves footer Y when only horizontal slots are adjusted', () => {

    const tableStyle = { ...style, textAlign: 'right' as const };

    const layout = {

      ...baseLayout,

      blocks: [

        {

          id: 'grades',

          type: 'grades_table' as const,

          box: { xMm: 0, yMm: 52, wMm: 190, hMm: 88 },

          style: tableStyle,

          props: {

            showHeader: true,

            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },

            categoryId: null,

            showCategoryTitle: true,

            showSubCategoryRows: true,

          },

        },

        {

          id: 'h',

          type: 'signature_field' as const,

          box: { xMm: 0, yMm: 160, wMm: 60, hMm: 18 },

          style,

          props: { signatureKey: 'homeroom' as const, label: 'חתימת המחנכת' },

        },

        {

          id: 'd',

          type: 'date' as const,

          box: { xMm: 0, yMm: 160, wMm: 60, hMm: 9 },

          style,

          props: { format: 'hebrew' as const },

        },

      ],

    };

    const normalized = normalizeSignatureFieldPositions(layout);

    const homeroom = normalized.blocks.find((b) => b.id === 'h')!;

    expect(homeroom.box.yMm).toBe(160);

  });

});

