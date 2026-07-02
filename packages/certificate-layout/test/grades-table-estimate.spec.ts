import type { CertificateSnapshotJsonV1, CertificateTemplateLayoutV1 } from '@school/shared';
import {
  countGradesTableRows,
  estimateGradesTableHeightMm,
  expandGradesTablesForContent,
} from '../src/grades-table-estimate';

const basePage = {
  orientation: 'portrait' as const,
  backgroundColor: '#fff',
  paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
};

const tableStyle = {
  fontFamily: 'Arial',
  fontSizePt: 10,
  fontWeight: 'normal' as const,
  color: '#1e293b',
  textAlign: 'right' as const,
  backgroundColor: 'transparent',
};

function gradesBlock(id: string, yMm: number, hMm: number, categoryId: string | null) {
  return {
    id,
    type: 'grades_table' as const,
    box: { xMm: 0, yMm, wMm: 85, hMm },
    style: tableStyle,
    props: {
      showHeader: true,
      headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
      categoryId,
      showCategoryTitle: true,
      showSubCategoryRows: true,
    },
  };
}

function snapshotWithSubjects(count: number, categoryId = 'cat-a'): CertificateSnapshotJsonV1 {
  return {
    schemaVersion: 1,
    templateKey: 'custom',
    generatedAt: '2026-01-01T00:00:00.000Z',
    school: { id: 's', name: 'School' },
    class: { id: 'c', name: 'ג׳1', year: 2025 },
    term: { id: 't', name: 'מחצית א׳' },
    student: { id: 'st', fullName: 'Test' },
    certificatePrefs: {},
    subjects: [],
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
    subjectCategories: [
      {
        categoryId: 'cat-a',
        categoryLabel: 'א',
        subjects: Array.from({ length: count }, (_, i) => ({
          subjectId: `s${i}`,
          subjectName: `מקצוע ${i + 1}`,
          value: 'מצוין',
          showComment: false,
        })),
      },
      {
        categoryId: 'cat-b',
        categoryLabel: 'ב',
        subjects: [{ subjectId: 'b1', subjectName: 'מקצוע ב', value: 'טוב', showComment: false }],
      },
    ],
  };
}

describe('countGradesTableRows', () => {
  it('counts header plus subjects for a filtered category', () => {
    const block = gradesBlock('t1', 50, 60, 'cat-a');
    const snap = snapshotWithSubjects(5);
    expect(countGradesTableRows(block, snap)).toBe(6);
  });
});

describe('expandGradesTablesForContent', () => {
  it('grows a grades table and pushes the row below down', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        gradesBlock('top', 50, 40, 'cat-a'),
        gradesBlock('bottom', 92, 40, 'cat-b'),
        {
          id: 'eval',
          type: 'evaluation',
          box: { xMm: 0, yMm: 136, wMm: 170, hMm: 30 },
          style: { ...tableStyle, textAlign: 'center' as const },
          props: { title: 'הערכה' },
        },
      ],
    };
    const snap = snapshotWithSubjects(12);
    const result = expandGradesTablesForContent(layout, snap);

    const top = result.blocks.find((b) => b.id === 'top')!;
    const bottom = result.blocks.find((b) => b.id === 'bottom')!;
    const evalBlock = result.blocks.find((b) => b.id === 'eval')!;

    expect(top.box.hMm).toBeGreaterThan(40);
    expect(bottom.box.yMm).toBeGreaterThan(92);
    expect(evalBlock.box.yMm).toBeGreaterThan(136);
    expect(bottom.box.yMm).toBeGreaterThanOrEqual(top.box.yMm + top.box.hMm - 0.5);
  });

  it('does not shrink tables when there are few subjects', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [gradesBlock('t1', 50, 80, 'cat-a')],
    };
    const snap = snapshotWithSubjects(2);
    const result = expandGradesTablesForContent(layout, snap);
    expect(result.blocks[0]!.box.hMm).toBe(80);
  });

  it('estimates taller height for more rows', () => {
    const block = gradesBlock('t1', 50, 40, 'cat-a');
    const few = estimateGradesTableHeightMm(block, snapshotWithSubjects(3));
    const many = estimateGradesTableHeightMm(block, snapshotWithSubjects(12));
    expect(many).toBeGreaterThan(few);
  });
});
