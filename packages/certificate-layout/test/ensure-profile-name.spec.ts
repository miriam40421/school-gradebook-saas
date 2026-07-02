import {

  ensureProfileNameBlock,

  normalizeProfileNamePosition,

  profileNameBoxBelowBesiyata,

} from '../src/ensure-profile-name';

import type { CertificateSnapshotJsonV1, CertificateTemplateLayoutV1 } from '@school/shared';



const basePage = {

  orientation: 'portrait' as const,

  backgroundColor: '#fff',

  paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },

};



const baseLayout: CertificateTemplateLayoutV1 = {

  layoutSchemaVersion: 1,

  page: basePage,

  blocks: [

    {

      id: 'besiyata',

      type: 'static_text',

      box: { xMm: 146, yMm: 0, wMm: 44, hMm: 7 },

      style: {

        fontFamily: 'Arial',

        fontSizePt: 9,

        fontWeight: 'normal',

        color: '#1e293b',

        textAlign: 'right',

        backgroundColor: 'transparent',

      },

      props: { text: 'בסיעתא דשמיא' },

    },

    {

      id: 'title',

      type: 'static_text',

      box: { xMm: 22, yMm: 4, wMm: 146, hMm: 14 },

      style: {

        fontFamily: 'Arial',

        fontSizePt: 20,

        fontWeight: 'bold',

        color: '#1e3a5f',

        textAlign: 'center',

        backgroundColor: 'transparent',

      },

      props: { text: 'תעודת הערכה' },

    },

  ],

};



const snapshot: CertificateSnapshotJsonV1 = {

  schemaVersion: 1,

  templateKey: 'custom',

  generatedAt: '2026-01-01T00:00:00.000Z',

  school: { id: 's', name: 'School' },

  class: { id: 'c', name: 'ג׳1', year: 2025 },

  term: { id: 't', name: 'מחצית א׳' },

  student: { id: 'st', fullName: 'Test' },

  certificateProfileName: 'א–ד',

  certificatePrefs: { showProfileNameOnCertificate: true },

  fill: {

    gradesHandwritten: false,

    gradeCommentsHandwritten: false,

    attendanceHandwritten: false,

    evaluationHandwritten: false,

    signaturesHandwritten: false,

    studentNameHandwritten: false,

    classNameHandwritten: false,

    classYearHebrewHandwritten: false,

    termNameHandwritten: false,

    dateHandwritten: false,

  },

  subjects: [],

  subjectCategories: [],

};



describe('ensureProfileNameBlock', () => {

  it('injects profile field below בסיעתא on the right when pref is on', () => {

    const result = ensureProfileNameBlock(baseLayout, snapshot);

    expect(result.blocks.some((b) => b.type === 'field' && b.props.fieldKey === 'profileName')).toBe(

      true,

    );

    const profile = result.blocks.find(

      (b) => b.type === 'field' && b.props.fieldKey === 'profileName',

    )!;

    expect(profile.box.yMm).toBe(7);

    expect(profile.box.xMm).toBe(146);

    expect(profile.style.textAlign).toBe('right');

  });



  it('leaves layout unchanged when pref is off', () => {

    const off = {

      ...snapshot,

      certificatePrefs: { showProfileNameOnCertificate: false },

    };

    expect(ensureProfileNameBlock(baseLayout, off)).toBe(baseLayout);

  });

});



describe('normalizeProfileNamePosition', () => {

  it('moves existing centered profile field below בסיעתא on the right', () => {

    const layout: CertificateTemplateLayoutV1 = {

      ...baseLayout,

      blocks: [

        ...baseLayout.blocks,

        {

          id: 'profile',

          type: 'field',

          box: { xMm: 22, yMm: 20, wMm: 146, hMm: 10 },

          style: {

            fontFamily: 'Arial',

            fontSizePt: 11,

            fontWeight: 'normal',

            color: '#475569',

            textAlign: 'center',

            backgroundColor: 'transparent',

          },

          props: { fieldKey: 'profileName' },

        },

      ],

    };

    const result = normalizeProfileNamePosition(layout, snapshot);

    const profile = result.blocks.find((b) => b.id === 'profile')!;

    expect(profile.box.xMm).toBe(146);

    expect(profile.box.yMm).toBe(7);

    expect(profile.style.textAlign).toBe('right');

  });

});



describe('profileNameBoxBelowBesiyata', () => {

  it('aligns under בסיעתא block', () => {

    const besiyata = baseLayout.blocks[0]!;

    const box = profileNameBoxBelowBesiyata(190, besiyata);

    expect(box.xMm).toBe(146);

    expect(box.yMm).toBe(7);

  });

});

