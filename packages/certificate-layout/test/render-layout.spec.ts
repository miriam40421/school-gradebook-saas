import type { CertificateSnapshotJsonV1, CertificateTemplateLayoutV1 } from '@school/shared';
import { certificateFillView, normalizeCertificatePrefs } from '@school/shared';
import {
  LayoutValidationError,
  renderLayoutHtml,
  validateLayoutJson,
  clampLayoutToPrintableArea,
} from '../src';

function demoSnapshot(): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs({});
  return {
    schemaVersion: 1,
    templateKey: 'custom',
    generatedAt: new Date().toISOString(),
    school: { id: 's1', name: 'בית ספר לדוגמה' },
    class: { id: 'c1', name: 'ג׳1', year: 2025, yearHebrew: 'תשפ״ה' },
    term: { id: 't1', name: 'מחצית א׳' },
    student: { id: 'st1', fullName: 'ישראל ישראלי' },
    fill: certificateFillView(prefs),
    certificatePrefs: prefs,
    subjects: [],
    subjectCategories: [],
  };
}

const baseLayout = {
  layoutSchemaVersion: 1 as const,
  page: {
    orientation: 'portrait' as const,
    backgroundColor: '#ffffff',
    paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  blocks: [
    {
      id: 'b1',
      type: 'static_text' as const,
      box: { xMm: 10, yMm: 10, wMm: 100, hMm: 15 },
      style: {
        fontFamily: 'Arial',
        fontSizePt: 14,
        fontWeight: 'bold' as const,
        color: '#1e293b',
        textAlign: 'center' as const,
        backgroundColor: 'transparent',
      },
      props: { text: 'תעודה' },
    },
    {
      id: 'b2',
      type: 'field' as const,
      box: { xMm: 10, yMm: 30, wMm: 100, hMm: 12 },
      style: {
        fontFamily: 'Arial',
        fontSizePt: 12,
        fontWeight: 'normal' as const,
        color: '#1e293b',
        textAlign: 'right' as const,
        backgroundColor: 'transparent',
      },
      props: { fieldKey: 'studentName' as const },
    },
  ],
};

describe('validateLayoutJson', () => {
  it('accepts valid layout v1', () => {
    expect(validateLayoutJson(baseLayout).layoutSchemaVersion).toBe(1);
  });

  it('rejects script in static_text', () => {
    const bad = {
      ...baseLayout,
      blocks: [
        {
          ...baseLayout.blocks[0],
          props: { text: '<script>alert(1)</script>' },
        },
      ],
    };
    expect(() => validateLayoutJson(bad)).toThrow(LayoutValidationError);
  });

  it('rejects box outside printable area', () => {
    const bad = {
      ...baseLayout,
      blocks: [
        {
          ...baseLayout.blocks[0],
          box: { xMm: 200, yMm: 10, wMm: 50, hMm: 10 },
        },
      ],
    };
    expect(() => validateLayoutJson(bad)).toThrow(LayoutValidationError);
  });
});

describe('renderLayoutHtml', () => {
  let snapshot: CertificateSnapshotJsonV1;

  beforeEach(() => {
    snapshot = demoSnapshot();
  });

  it('renders Hebrew demo student name', () => {
    const html = renderLayoutHtml({ layout: baseLayout, snapshot });
    expect(html).toContain('ישראל ישראלי');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('תעודה');
  });

  it('uses landscape page dimensions', () => {
    const layout = {
      ...baseLayout,
      page: { ...baseLayout.page, orientation: 'landscape' as const },
    };
    const html = renderLayoutHtml({ layout, snapshot });
    expect(html).toContain('width: 297mm');
    expect(html).toContain('height: 210mm');
  });

  it('renders only homeroom signature when prefs limit types', () => {
    const sigLayout = {
      ...baseLayout,
      blocks: [
        {
          id: 'sig1',
          type: 'signatures' as const,
          box: { xMm: 0, yMm: 50, wMm: 190, hMm: 30 },
          style: baseLayout.blocks[0]!.style,
          props: {
            labels: { homeroom: 'חתימת המחנכת', principal: 'חתימת המנהלת', parent: 'חתימת ההורים' },
          },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        signatures: true,
        signatureHomeroom: true,
        signaturePrincipal: false,
        signatureParent: false,
      },
      signatures: { homeroom: 'א', principal: 'ב', parent: 'ג' },
    };
    const html = renderLayoutHtml({ layout: sigLayout, snapshot: snap });
    expect(html).toContain('חתימת המחנכת');
    expect(html).not.toContain('חתימת המנהלת');
    expect(html).not.toContain('חתימת ההורים');
  });

  it('renders only one category when grades_table has categoryId', () => {
    const snap = {
      ...snapshot,
      subjectCategories: [
        {
          categoryId: 'c1',
          categoryLabel: 'לימודי חול',
          subjects: [
            { subjectId: 's1', subjectName: 'מתמטיקה', value: 'טוב', categoryId: 'c1', categoryLabel: 'לימודי חול' },
          ],
        },
        {
          categoryId: 'c2',
          categoryLabel: 'לימודי קודש',
          subjects: [
            { subjectId: 's2', subjectName: 'חומש', value: 'מצוין', categoryId: 'c2', categoryLabel: 'לימודי קודש' },
          ],
        },
      ],
    };
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'gt1',
          type: 'grades_table' as const,
          box: { xMm: 0, yMm: 50, wMm: 190, hMm: 80 },
          style: baseLayout.blocks[0]!.style,
          props: {
            showHeader: true,
            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
            categoryId: 'c1',
          },
        },
      ],
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('מתמטיקה');
    expect(html).not.toContain('חומש');
    expect(html).toContain('grades-cat-heading');
    expect(html).toContain('לימודי חול');
  });

  it('renders atomic attendance_field from school prefs', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'af1',
          type: 'attendance_field' as const,
          box: { xMm: 0, yMm: 50, wMm: 60, hMm: 10 },
          style: baseLayout.blocks[0]!.style,
          props: { fieldKey: 'hourAbsences' as const, label: 'חיסורי שעות' },
        },
        {
          id: 'af2',
          type: 'attendance_field' as const,
          box: { xMm: 70, yMm: 50, wMm: 60, hMm: 10 },
          style: baseLayout.blocks[0]!.style,
          props: { fieldKey: 'absences' as const, label: 'חיסורים' },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        hourAbsences: true,
        absences: false,
      },
      attendance: { hourAbsences: '5' },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('חיסורי שעות');
    expect(html).toContain('5');
    expect(html).not.toContain('חיסורים');
  });

  it('renders atomic signature_field when enabled in prefs', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'sf1',
          type: 'signature_field' as const,
          box: { xMm: 0, yMm: 60, wMm: 55, hMm: 18 },
          style: baseLayout.blocks[0]!.style,
          props: { signatureKey: 'principal' as const, label: 'חתימת המנהלת' },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        signatures: true,
        signaturePrincipal: true,
        signatureHomeroom: false,
        signatureParent: false,
      },
      signatures: { homeroom: null, principal: 'מנהלת', parent: null },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('חתימת המנהלת');
    expect(html).toContain('מנהלת');
  });

  it('wraps evaluation text with line breaks', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'eval',
          type: 'evaluation' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 40 },
          style: baseLayout.blocks[0]!.style,
          props: { title: 'הערכה' },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        evaluation: true,
        evaluationFillMode: 'computer' as const,
      },
      fill: {
        ...snapshot.fill,
        evaluationHandwritten: false,
      },
      evaluation: 'שורה ראשונה\nשורה שנייה',
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('evaluation-body');
    expect(html).toContain('שורה ראשונה<br>שורה שנייה');
  });

  it('renders subcategory subjects without heading when showSubCategoryRows is false', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'grades',
          type: 'grades_table' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 80 },
          style: baseLayout.blocks[0]!.style,
          props: {
            showHeader: true,
            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
            categoryId: 'cat1',
            showSubCategoryRows: false,
          },
        },
      ],
    };
    const snap = {
      ...snapshot,
      subjectCategories: [
        {
          categoryId: 'cat1',
          categoryLabel: 'לימודי',
          subjects: [{ subjectId: 's1', subjectName: 'מקצוע אם', value: 'מצוין' }],
          subCategories: [
            {
              subCategoryId: 'sub1',
              subCategoryLabel: 'תת קטגוריה',
              subjects: [{ subjectId: 's2', subjectName: 'מקצוע בת', value: 'טוב' }],
            },
          ],
        },
      ],
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('מקצוע אם');
    expect(html).toContain('מקצוע בת');
    expect(html).not.toContain('תת קטגוריה');
  });

  it('renders blank line for handwritten student name field', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'name',
          type: 'field' as const,
          box: { xMm: 0, yMm: 0, wMm: 100, hMm: 12 },
          style: baseLayout.blocks[0]!.style,
          props: { fieldKey: 'studentName' as const },
        },
      ],
    };
    const snap = {
      ...snapshot,
      fill: {
        ...snapshot.fill,
        studentNameHandwritten: true,
      },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('שם התלמידה');
    expect(html).toContain('field-line');
    expect(html).not.toContain('ישראל ישראלי');
  });

  it('coalesces legacy meta field blocks into one header row', () => {
    const style = baseLayout.blocks[0]!.style;
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'name',
          type: 'field' as const,
          box: { xMm: 0, yMm: 10, wMm: 40, hMm: 10 },
          style,
          props: { fieldKey: 'studentName' as const },
        },
        {
          id: 'class',
          type: 'field' as const,
          box: { xMm: 50, yMm: 20, wMm: 40, hMm: 10 },
          style,
          props: { fieldKey: 'className' as const },
        },
        {
          id: 'term',
          type: 'field' as const,
          box: { xMm: 100, yMm: 30, wMm: 40, hMm: 10 },
          style,
          props: { fieldKey: 'termName' as const },
        },
        {
          id: 'year',
          type: 'field' as const,
          box: { xMm: 150, yMm: 40, wMm: 30, hMm: 10 },
          style,
          props: { fieldKey: 'classYearHebrew' as const },
        },
      ],
    };
    const html = renderLayoutHtml({
      layout,
      snapshot: {
        ...snapshot,
        certificatePrefs: {
          ...snapshot.certificatePrefs,
          showClassYearHebrew: true,
        },
      },
    });
    expect(html).toContain('meta-row');
    expect(html.match(/block block-field/g)?.length ?? 0).toBe(0);
    expect(html).toContain('שם התלמידה');
    expect(html).toContain('מחזור');
  });

  it('renders header meta row with four handwritten segments', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'meta',
          type: 'header_meta_row' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 12 },
          style: baseLayout.blocks[0]!.style,
          props: {},
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        showClassYearHebrew: true,
      },
      fill: {
        ...snapshot.fill,
        studentNameHandwritten: true,
        classNameHandwritten: true,
        termNameHandwritten: true,
        classYearHebrewHandwritten: true,
      },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('meta-row');
    expect(html).toContain('שם התלמידה');
    expect(html).toContain('כיתה');
    expect(html).toContain('מחצית');
    expect(html).toContain('מחזור');
    expect(html.match(/meta-seg handwritten/g)?.length).toBe(4);
  });

  it('renders profile name field when enabled in prefs', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'profile',
          type: 'field' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 10 },
          style: { ...baseLayout.blocks[0]!.style, textAlign: 'center' as const },
          props: { fieldKey: 'profileName' as const },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificateProfileName: 'א–ד',
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        showProfileNameOnCertificate: true,
      },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('profile-name-field');
    expect(html).toContain('א–ד');
  });

  it('injects profile name on layout without profile field block', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'title',
          type: 'static_text' as const,
          box: { xMm: 0, yMm: 4, wMm: 180, hMm: 14 },
          style: { ...baseLayout.blocks[0]!.style, textAlign: 'center' as const },
          props: { text: 'תעודת הערכה' },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificateProfileName: 'ה–ח',
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        showProfileNameOnCertificate: true,
      },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('profile-name-field');
    expect(html).toContain('ה–ח');
  });

  it('centers evaluation block', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'eval',
          type: 'evaluation' as const,
          box: { xMm: 0, yMm: 0, wMm: 180, hMm: 40 },
          style: { ...baseLayout.blocks[0]!.style, textAlign: 'right' as const },
          props: { title: 'הערכה' },
        },
      ],
    };
    const html = renderLayoutHtml({ layout, snapshot });
    expect(html).toContain('text-align: center');
    expect(html).toContain('evaluation-title');
  });

  it('wraps long evaluation text without spaces', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'eval',
          type: 'evaluation' as const,
          box: { xMm: 0, yMm: 0, wMm: 80, hMm: 40 },
          style: { ...baseLayout.blocks[0]!.style, textAlign: 'right' as const },
          props: { title: 'הערכה' },
        },
      ],
    };
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        evaluation: true,
        evaluationFillMode: 'computer' as const,
      },
      fill: { ...snapshot.fill, evaluationHandwritten: false },
      evaluation: 'מילהארוכהמאודשצריכהלהישברלמספרשורותבתעודה',
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('evaluation-body');
    expect(html).toContain('overflow-wrap: anywhere');
  });

  it('injects evaluation section when pref is on but layout block is missing', () => {
    const layout = {
      ...baseLayout,
      blocks: [
        {
          id: 'meta',
          type: 'header_meta_row' as const,
          box: { xMm: 0, yMm: 38, wMm: 170, hMm: 12 },
          style: baseLayout.blocks[0]!.style,
          props: {},
        },
        {
          id: 'grades',
          type: 'grades_table' as const,
          box: { xMm: 0, yMm: 52, wMm: 170, hMm: 60 },
          style: baseLayout.blocks[0]!.style,
          props: {
            showHeader: true,
            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
            categoryId: null,
          },
        },
      ],
    } as CertificateTemplateLayoutV1;
    const snap = {
      ...snapshot,
      certificatePrefs: {
        ...snapshot.certificatePrefs,
        evaluation: true,
        evaluationFillMode: 'computer' as const,
      },
      fill: { ...snapshot.fill, evaluationHandwritten: false },
      evaluation: 'הערכה לדוגמה',
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('evaluation-title');
    expect(html).toContain('הערכה לדוגמה');
  });

  it('renders 3 handwritten evaluation lines and attendance underline', () => {
    const layout: CertificateTemplateLayoutV1 = {
      ...baseLayout,
      blocks: [
        ...baseLayout.blocks,
        {
          id: 'eval',
          type: 'evaluation' as const,
          box: { xMm: 0, yMm: 40, wMm: 170, hMm: 40 },
          style: baseLayout.blocks[0]!.style,
          props: { title: 'הערכה' },
        },
        {
          id: 'att',
          type: 'attendance_field' as const,
          box: { xMm: 0, yMm: 90, wMm: 80, hMm: 10 },
          style: baseLayout.blocks[1]!.style,
          props: { fieldKey: 'absences' as const, label: 'חיסורים' },
        },
      ],
    };
    const snap = {
      ...demoSnapshot(),
      certificatePrefs: {
        ...demoSnapshot().certificatePrefs,
        evaluation: true,
        absences: true,
        evaluationBorder: true,
        attendanceBorder: true,
        evaluationFillMode: 'handwritten' as const,
        attendanceFillMode: 'handwritten' as const,
      },
      fill: {
        ...demoSnapshot().fill,
        evaluationHandwritten: true,
        attendanceHandwritten: true,
      },
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('handwritten-line');
    expect((html.match(/handwritten-line/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('att-underline');
    expect(html).toContain('section-group-border');
    expect(html).not.toContain('—'.repeat(8));
  });

  it('renders page background color and image layer', () => {
    const layout: CertificateTemplateLayoutV1 = {
      ...baseLayout,
      page: {
        ...baseLayout.page,
        backgroundColor: '#e0f2f1',
        backgroundImageStorageKey: 'school/tpl/background.png',
        backgroundImageMode: 'corner',
        backgroundImageFit: 'contain',
      },
    };
    const html = renderLayoutHtml({
      layout,
      snapshot: demoSnapshot(),
      assetUrls: {
        'school/tpl/background.png': 'data:image/png;base64,abc',
      },
    });
    expect(html).toContain('background: #e0f2f1');
    expect(html).toContain('page-background corner');
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('data:image/png;base64,abc');
  });

  it('renders grade comment column when comments are handwritten', () => {
    const layout: CertificateTemplateLayoutV1 = {
      ...baseLayout,
      blocks: [
        {
          id: 'grades',
          type: 'grades_table' as const,
          box: { xMm: 0, yMm: 50, wMm: 170, hMm: 80 },
          style: baseLayout.blocks[0]!.style,
          props: {
            showHeader: true,
            headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
          },
        },
      ],
    };
    const snap: CertificateSnapshotJsonV1 = {
      ...demoSnapshot(),
      certificatePrefs: {
        ...normalizeCertificatePrefs({}),
        commentPerGrade: true,
        gradeCommentsFillMode: 'handwritten',
      },
      fill: {
        ...certificateFillView(
          normalizeCertificatePrefs({
            commentPerGrade: true,
            gradeCommentsFillMode: 'handwritten',
          }),
        ),
      },
      showAnyGradeComment: true,
      subjects: [
        {
          subjectId: 's1',
          subjectName: 'מתמטיקה',
          value: 'טוב',
          categoryId: 'c1',
          categoryLabel: 'לימודי חול',
          showComment: true,
        },
      ],
      subjectCategories: [
        {
          categoryId: 'c1',
          categoryLabel: 'לימודי חול',
          showComment: true,
          subjects: [
            {
              subjectId: 's1',
              subjectName: 'מתמטיקה',
              value: 'טוב',
              categoryId: 'c1',
              categoryLabel: 'לימודי חול',
              showComment: true,
            },
          ],
        },
      ],
    };
    const html = renderLayoutHtml({ layout, snapshot: snap });
    expect(html).toContain('הערה');
    expect(html).toContain('handwritten-underline');
  });
});

describe('clampLayoutToPrintableArea', () => {
  it('clamps legacy scaffold coords that overflow printable width', () => {
    const legacy = {
      ...baseLayout,
      blocks: [
        {
          ...baseLayout.blocks[0],
          box: { xMm: 10, yMm: 10, wMm: 190, hMm: 15 },
        },
      ],
    };
    const clamped = clampLayoutToPrintableArea(legacy);
    const box = clamped.blocks[0]!.box;
    expect(box.xMm + box.wMm).toBeLessThanOrEqual(190);
    expect(() => validateLayoutJson(clamped)).not.toThrow();
  });
});
