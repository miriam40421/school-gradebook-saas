import type { CertificateSnapshotJsonV1, CertificateTemplateLayoutV1 } from '@school/shared';
import {
  adjustHeaderToTablesGap,
  ensureEvaluationBlock,
  fitLayoutToSinglePage,
  normalizeLayoutDesignerPreview,
  normalizeLayoutForRender,
  normalizeVerticalContentStack,
  repositionEvaluationBelowGrades,
} from '../src/layout-normalize';

const basePage = {
  orientation: 'portrait' as const,
  backgroundColor: '#fff',
  paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
};

function metaRowLayout(gradesY: number): CertificateTemplateLayoutV1 {
  return {
    layoutSchemaVersion: 1,
    page: basePage,
    blocks: [
      {
        id: 'meta',
        type: 'header_meta_row',
        box: { xMm: 0, yMm: 38, wMm: 170, hMm: 12 },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 11,
          fontWeight: 'normal',
          color: '#1e293b',
          textAlign: 'right',
          backgroundColor: 'transparent',
        },
        props: {},
      },
      {
        id: 'grades',
        type: 'grades_table',
        box: { xMm: 0, yMm: gradesY, wMm: 170, hMm: 80 },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 10,
          fontWeight: 'normal',
          color: '#1e293b',
          textAlign: 'right',
          backgroundColor: 'transparent',
        },
        props: {
          showHeader: true,
          headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
          categoryId: 'cat1',
        },
      },
    ],
  };
}

const snapshot: CertificateSnapshotJsonV1 = {
  schemaVersion: 1,
  templateKey: 'custom',
  generatedAt: '2026-01-01T00:00:00.000Z',
  school: { id: 's', name: 'School' },
  class: { id: 'c', name: 'ג׳1', year: 2025 },
  term: { id: 't', name: 'מחצית א׳' },
  student: { id: 'st', fullName: 'Test' },
  certificatePrefs: { evaluation: true },
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

describe('adjustHeaderToTablesGap', () => {
  it('pushes grades table down when gap is too small', () => {
    const layout = metaRowLayout(52);
    const result = adjustHeaderToTablesGap(layout, 8);
    const grades = result.blocks.find((b) => b.type === 'grades_table')!;
    expect(grades.box.yMm).toBe(58);
  });

  it('leaves layout unchanged when gap is already sufficient', () => {
    const layout = metaRowLayout(60);
    expect(adjustHeaderToTablesGap(layout, 8)).toBe(layout);
  });
});

describe('repositionEvaluationBelowGrades', () => {
  it('moves evaluation below grades when overlapping', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        ...metaRowLayout(58).blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 40, wMm: 170, hMm: 42 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
      ],
    };
    const result = repositionEvaluationBelowGrades(layout);
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation')!;
    expect(evalBlock.box.yMm).toBeGreaterThanOrEqual(140);
  });
});

describe('ensureEvaluationBlock', () => {
  it('injects evaluation when pref is on and block is missing', () => {
    const layout = metaRowLayout(58);
    const result = ensureEvaluationBlock(layout, snapshot);
    expect(result.blocks.some((b) => b.type === 'evaluation')).toBe(true);
  });

  it('does not inject when pref is off', () => {
    const layout = metaRowLayout(58);
    const off = { ...snapshot, certificatePrefs: { evaluation: false } };
    expect(ensureEvaluationBlock(layout, off)).toBe(layout);
  });
});

describe('normalizeVerticalContentStack', () => {
  it('pushes attendance below evaluation when they overlap', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        ...metaRowLayout(58).blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 146, wMm: 170, hMm: 42 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
        {
          id: 'att1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 170, wMm: 50, hMm: 10 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
      ],
    };
    const result = normalizeVerticalContentStack(layout, {
      ...snapshot,
      evaluation: 'שורה אחת של הערכה',
    });
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation')!;
    const attBlock = result.blocks.find((b) => b.type === 'attendance_field')!;
    expect(attBlock.box.yMm).toBeGreaterThanOrEqual(evalBlock.box.yMm + evalBlock.box.hMm + 2);
  });

  it('grows evaluation block height for long text', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        ...metaRowLayout(58).blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 146, wMm: 170, hMm: 28 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
      ],
    };
    const longText = Array.from({ length: 8 }, (_, i) => `שורה ${i + 1} עם טקסט ארוך יחסית להערכה`).join('\n');
    const result = normalizeVerticalContentStack(layout, { ...snapshot, evaluation: longText });
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation')!;
    expect(evalBlock.box.hMm).toBeGreaterThan(35);
  });

  it('pushes footer signatures below attendance', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        ...metaRowLayout(58).blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 146, wMm: 170, hMm: 28 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
        {
          id: 'att1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 170, wMm: 50, hMm: 10 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
        {
          id: 'sig1',
          type: 'signature_field',
          box: { xMm: 0, yMm: 175, wMm: 55, hMm: 18 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 9,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { signatureKey: 'homeroom', label: 'חתימת המחנכת' },
        },
      ],
    };
    const prefsSnapshot = {
      ...snapshot,
      certificatePrefs: {
        evaluation: true,
        signatures: true,
        signatureHomeroom: true,
        absences: true,
      },
    };
    const result = normalizeVerticalContentStack(layout, prefsSnapshot);
    const attBlock = result.blocks.find((b) => b.type === 'attendance_field')!;
    const sigBlock = result.blocks.find((b) => b.type === 'signature_field')!;
    expect(sigBlock.box.yMm).toBeGreaterThanOrEqual(attBlock.box.yMm + attBlock.box.hMm + 3);
  });

  it('anchors landscape footer tiers to the page bottom', () => {
    const landscapePage = {
      orientation: 'landscape' as const,
      backgroundColor: '#fff',
      paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
    };
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: landscapePage,
      blocks: [
        {
          id: 'meta',
          type: 'header_meta_row',
          box: { xMm: 0, yMm: 22, wMm: 277, hMm: 9 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'right',
            backgroundColor: 'transparent',
          },
          props: {},
        },
        {
          id: 'grades',
          type: 'grades_table',
          box: { xMm: 0, yMm: 34, wMm: 130, hMm: 70 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'right',
            backgroundColor: 'transparent',
          },
          props: {
            showHeader: true,
            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
            categoryId: null,
            showCategoryTitle: true,
            showSubCategoryRows: true,
          },
        },
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 90, wMm: 277, hMm: 30 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
        {
          id: 'att1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 60, hMm: 9 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
        {
          id: 'sig1',
          type: 'signature_field',
          box: { xMm: 0, yMm: 130, wMm: 55, hMm: 14 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 9,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { signatureKey: 'homeroom', label: 'חתימת המחנכת' },
        },
      ],
    };
    const prefsSnapshot = {
      ...snapshot,
      certificatePrefs: {
        evaluation: true,
        signatures: true,
        signatureHomeroom: true,
        absences: true,
      },
    };
    const result = normalizeVerticalContentStack(layout, prefsSnapshot);
    const printableH = 190;
    const sigBlock = result.blocks.find((b) => b.type === 'signature_field')!;
    const attBlock = result.blocks.find((b) => b.type === 'attendance_field')!;
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation')!;
    const gradesBlock = result.blocks.find((b) => b.type === 'grades_table')!;
    expect(sigBlock.box.yMm + sigBlock.box.hMm).toBeLessThanOrEqual(printableH + 0.5);
    expect(sigBlock.box.yMm - (attBlock.box.yMm + attBlock.box.hMm)).toBeGreaterThanOrEqual(9.5);
    expect(attBlock.box.yMm - (evalBlock.box.yMm + evalBlock.box.hMm)).toBeGreaterThanOrEqual(9.5);
    expect(evalBlock.box.yMm - (gradesBlock.box.yMm + gradesBlock.box.hMm)).toBeGreaterThanOrEqual(1.5);
    expect(evalBlock.box.yMm + evalBlock.box.hMm).toBeLessThanOrEqual(attBlock.box.yMm + 0.5);
  });
});

describe('fitLayoutToSinglePage', () => {
  it('shrinks grades tables so the full stacked layout fits printable height', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        ...metaRowLayout(54).blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 200, wMm: 170, hMm: 48 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
        {
          id: 'att1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 252, wMm: 50, hMm: 10 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
        {
          id: 'sig1',
          type: 'signature_field',
          box: { xMm: 0, yMm: 255, wMm: 55, hMm: 18 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 9,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { signatureKey: 'homeroom', label: 'חתימת המחנכת' },
        },
      ],
    };
    const grades = layout.blocks.find((b) => b.type === 'grades_table')!;
    grades.box.hMm = 200;

    const prefsSnapshot = {
      ...snapshot,
      certificatePrefs: {
        evaluation: true,
        signatures: true,
        signatureHomeroom: true,
        absences: true,
      },
    };

    const result = fitLayoutToSinglePage(layout, prefsSnapshot);

    let maxBottom = 0;
    for (const block of result.blocks) {
      maxBottom = Math.max(maxBottom, block.box.yMm + block.box.hMm);
    }
    expect(maxBottom).toBeLessThanOrEqual(277 - 4 + 1);

    const attBlock = result.blocks.find((b) => b.type === 'attendance_field')!;
    const sigBlock = result.blocks.find((b) => b.type === 'signature_field')!;
    expect(sigBlock.box.yMm).toBeGreaterThanOrEqual(attBlock.box.yMm + attBlock.box.hMm + 3);
  });
});

describe('normalizeLayoutForRender', () => {
  it('preserves manual grades positions and stacks attendance then signatures', () => {
    const layout = metaRowLayout(52);
    const withStack: CertificateTemplateLayoutV1 = {
      ...layout,
      blocks: [
        ...layout.blocks,
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 146, wMm: 170, hMm: 28 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 11,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { title: 'הערכה' },
        },
        {
          id: 'att1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 170, wMm: 50, hMm: 10 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 10,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
        {
          id: 'sig1',
          type: 'signature_field',
          box: { xMm: 0, yMm: 172, wMm: 55, hMm: 18 },
          style: {
            fontFamily: 'Arial',
            fontSizePt: 9,
            fontWeight: 'normal',
            color: '#1e293b',
            textAlign: 'center',
            backgroundColor: 'transparent',
          },
          props: { signatureKey: 'homeroom', label: 'חתימת המחנכת' },
        },
      ],
    };
    const prefsSnapshot = {
      ...snapshot,
      evaluation: 'שורה אחת של הערכה',
      certificatePrefs: {
        evaluation: true,
        signatures: true,
        signatureHomeroom: true,
        absences: true,
      },
    };
    const result = normalizeLayoutForRender(withStack, prefsSnapshot);
    const grades = result.blocks.find((b) => b.type === 'grades_table')!;
    expect(grades.box.yMm).toBe(52);
    expect(result.blocks.some((b) => b.type === 'evaluation')).toBe(true);
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation')!;
    const attBlock = result.blocks.find((b) => b.type === 'attendance_field')!;
    const sigBlock = result.blocks.find((b) => b.type === 'signature_field')!;
    expect(attBlock.box.yMm).toBeGreaterThanOrEqual(evalBlock.box.yMm + evalBlock.box.hMm + 2);
    expect(sigBlock.box.yMm).toBeGreaterThanOrEqual(attBlock.box.yMm + attBlock.box.hMm + 3);
  });
});

describe('normalizeLayoutDesignerPreview', () => {
  it('injects evaluation block for designer canvas when pref is on', () => {
    const layout = metaRowLayout(52);
    const snap = {
      ...snapshot,
      fill: { ...snapshot.fill, evaluationHandwritten: true },
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        evaluation: true,
        evaluationFillMode: 'handwritten' as const,
      },
    };
    const result = normalizeLayoutDesignerPreview(layout, snap);
    const evalBlock = result.blocks.find((b) => b.type === 'evaluation');
    expect(evalBlock).toBeDefined();
    expect(evalBlock!.box.hMm).toBeGreaterThan(24);
  });
});
