import type {

  CertificateSnapshotJsonV1,

  CertificateTemplateLayoutV1,

  LayoutBlock,

} from '@school/shared';

import { A4_DIMENSIONS_MM, DEFAULT_CERTIFICATE_FONT_SIZE_PT } from '@school/shared';



const BESIYATA_WIDTH_MM = 44;

const BESIYATA_HEIGHT_MM = 7;

const PROFILE_NAME_HEIGHT_MM = 8;

const GAP_BELOW_BESIYATA_MM = 0;



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



function isProfileNameField(block: LayoutBlock): boolean {

  return block.type === 'field' && block.props.fieldKey === 'profileName';

}



function isBesiyataBlock(block: LayoutBlock): boolean {

  return (

    block.type === 'static_text' &&

    typeof (block.props as { text?: string }).text === 'string' &&

    /בסיעתא/.test((block.props as { text: string }).text)

  );

}



/** Profile name box: top-right, directly under בסיעתא דשמיא. */

export function profileNameBoxBelowBesiyata(

  printableWidthMm: number,

  besiyata?: LayoutBlock,

): LayoutBlock['box'] {

  if (besiyata) {

    return {
      xMm: besiyata.box.xMm,
      yMm: roundMm(besiyata.box.yMm + besiyata.box.hMm + GAP_BELOW_BESIYATA_MM),
      wMm: besiyata.box.wMm,
      hMm: PROFILE_NAME_HEIGHT_MM,
    };

  }

  return {

    xMm: roundMm(printableWidthMm - BESIYATA_WIDTH_MM),

    yMm: roundMm(BESIYATA_HEIGHT_MM + GAP_BELOW_BESIYATA_MM),

    wMm: BESIYATA_WIDTH_MM,

    hMm: PROFILE_NAME_HEIGHT_MM,

  };

}



const profileNameStyle = (base?: LayoutBlock['style']): LayoutBlock['style'] => ({

  fontFamily: base?.fontFamily ?? 'Arial',

  fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,

  fontWeight: 'normal',

  color: '#475569',

  textAlign: 'right',

  backgroundColor: 'transparent',

});



/** Place profile-name field top-right under בסיעתא דשמיא. */

export function normalizeProfileNamePosition(

  layout: CertificateTemplateLayoutV1,

  snapshot: CertificateSnapshotJsonV1,

): CertificateTemplateLayoutV1 {

  if (!snapshot.certificatePrefs.showProfileNameOnCertificate) return layout;

  if (!snapshot.certificateProfileName?.trim()) return layout;



  const profile = layout.blocks.find(isProfileNameField);

  if (!profile) return layout;



  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);

  const besiyata = layout.blocks.find(isBesiyataBlock);

  const box = profileNameBoxBelowBesiyata(W, besiyata);



  return {

    ...layout,

    blocks: layout.blocks.map((block) =>

      block.id === profile.id

        ? {

            ...block,

            box,

            style: profileNameStyle(block.style),

          }

        : block,

    ),

  };

}



/** Inject a profile-name field below בסיעתא when pref is on but layout lacks the block. */

export function ensureProfileNameBlock(

  layout: CertificateTemplateLayoutV1,

  snapshot: CertificateSnapshotJsonV1,

): CertificateTemplateLayoutV1 {

  if (!snapshot.certificatePrefs.showProfileNameOnCertificate) return layout;

  if (!snapshot.certificateProfileName?.trim()) return layout;

  if (layout.blocks.some(isProfileNameField)) return layout;



  const W = printableWidth(layout.page.orientation, layout.page.paddingMm);

  const besiyata = layout.blocks.find(isBesiyataBlock);

  const box = profileNameBoxBelowBesiyata(W, besiyata);



  const profileBlock: LayoutBlock = {

    id: 'injected-profile-name',

    type: 'field',

    box,

    style: profileNameStyle(besiyata?.style),

    props: { fieldKey: 'profileName' },

  };



  if (!besiyata) {

    return { ...layout, blocks: [...layout.blocks, profileBlock] };

  }



  const besiyataIdx = layout.blocks.indexOf(besiyata);

  const blocks = [...layout.blocks];

  blocks.splice(besiyataIdx + 1, 0, profileBlock);

  return { ...layout, blocks };

}



export function normalizeEvaluationCenter(

  layout: CertificateTemplateLayoutV1,

): CertificateTemplateLayoutV1 {

  return {

    ...layout,

    blocks: layout.blocks.map((block) =>

      block.type === 'evaluation'

        ? { ...block, style: { ...block.style, textAlign: 'center' as const } }

        : block,

    ),

  };

}

