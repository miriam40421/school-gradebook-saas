import type { CertificateTemplateLayoutV1 } from '@school/shared';
import { renderLayoutHtml } from '../src/render-layout-html';
import {
  ensureAttendanceFieldBlocks,
  normalizeAttendanceFieldPositions,
} from '../src/normalize-attendance-layout';

const basePage: CertificateTemplateLayoutV1['page'] = {
  orientation: 'portrait',
  backgroundColor: '#fff',
  paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
};

const baseStyle = {
  fontFamily: 'Arial',
  fontSizePt: 11,
  fontWeight: 'normal' as const,
  color: '#1e293b',
  textAlign: 'center' as const,
  backgroundColor: 'transparent',
};

const snapshot = {
  schemaVersion: 1 as const,
  templateKey: 'custom',
  generatedAt: '2026-01-01T00:00:00.000Z',
  school: { id: 's', name: 'בית ספר' },
  class: { id: 'c', name: 'ג׳1', year: 2025 },
  term: { id: 't', name: 'מחצית א׳' },
  student: { id: 'st', fullName: 'תלמידה' },
  evaluation: null,
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
  certificatePrefs: {
    absences: true,
    lateness: true,
    hourAbsences: true,
    hourLateness: true,
  },
  subjects: [],
  subjectCategories: [],
  attendance: {
    absences: '2',
    lateness: '1',
    hourAbsences: '3',
    hourLateness: '4',
  },
};

describe('normalize-attendance-layout', () => {
  it('injects missing attendance fields enabled in profile prefs', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        {
          id: 'att-hour',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'hourLateness', label: 'איחורי שעות' },
        },
      ],
    };

    const result = ensureAttendanceFieldBlocks(layout, snapshot);
    const fields = result.blocks.filter((b) => b.type === 'attendance_field');
    expect(fields).toHaveLength(4);
    expect(fields.map((b) => b.props.fieldKey).sort()).toEqual([
      'absences',
      'hourAbsences',
      'hourLateness',
      'lateness',
    ]);
  });

  it('spreads attendance fields across the row without overlapping X', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        {
          id: 'a1',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'absences', label: 'חיסורים' },
        },
        {
          id: 'a2',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'lateness', label: 'איחורים' },
        },
        {
          id: 'a3',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'hourAbsences', label: 'חיסורי שעות' },
        },
        {
          id: 'a4',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 120, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'hourLateness', label: 'איחורי שעות' },
        },
      ],
    };

    const result = normalizeAttendanceFieldPositions(layout, snapshot);
    const xs = result.blocks
      .filter((b) => b.type === 'attendance_field')
      .map((b) => b.box.xMm);
    expect(new Set(xs).size).toBe(4);
  });

  it('renders all enabled attendance fields from profile even when template has one block', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        {
          id: 'att-hour',
          type: 'attendance_field',
          box: { xMm: 0, yMm: 50, wMm: 40, hMm: 10 },
          style: baseStyle,
          props: { fieldKey: 'hourLateness', label: 'איחורי שעות' },
        },
      ],
    };

    let next = ensureAttendanceFieldBlocks(layout, snapshot);
    next = normalizeAttendanceFieldPositions(next, snapshot);
    const html = renderLayoutHtml({ layout: next, snapshot });
    expect(html).toContain('חיסורים');
    expect(html).toContain('איחורים');
    expect(html).toContain('חיסורי שעות');
    expect(html).toContain('איחורי שעות');
  });

  it('skips per-field injection when composite attendance block exists', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        {
          id: 'att-all',
          type: 'attendance',
          box: { xMm: 0, yMm: 120, wMm: 190, hMm: 14 },
          style: baseStyle,
          props: {
            showAbsences: true,
            showLateness: true,
            showHourAbsences: true,
            showHourLateness: true,
          },
        },
      ],
    };

    const result = ensureAttendanceFieldBlocks(layout, snapshot);
    expect(result.blocks.filter((b) => b.type === 'attendance_field')).toHaveLength(0);
    expect(result.blocks.filter((b) => b.type === 'attendance')).toHaveLength(1);
  });

  it('renders composite attendance block with all enabled fields', () => {
    const layout: CertificateTemplateLayoutV1 = {
      layoutSchemaVersion: 1,
      page: basePage,
      blocks: [
        {
          id: 'att-all',
          type: 'attendance',
          box: { xMm: 0, yMm: 50, wMm: 190, hMm: 14 },
          style: baseStyle,
          props: {
            showAbsences: true,
            showLateness: true,
            showHourAbsences: true,
            showHourLateness: true,
          },
        },
      ],
    };

    const html = renderLayoutHtml({ layout, snapshot });
    expect(html).toContain('חיסורים');
    expect(html).toContain('איחורים');
    expect(html).toContain('חיסורי שעות');
    expect(html).toContain('איחורי שעות');
  });
});
