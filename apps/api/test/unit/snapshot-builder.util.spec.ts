import { buildSnapshotJson, enrichSnapshotProfileName, mergeSupplementIntoSnapshot } from '../../src/certificates/snapshot-builder.util';



describe('buildSnapshotJson', () => {

  const base = {

    templateKey: 'default-rtl',

    school: { id: 's1', name: 'School' },

    class: { id: 'c1', name: 'ג׳1', year: 2025 },

    term: { id: 't1', name: 'סמסטר א׳' },

    student: { id: 'st1', fullName: 'נועה כהן' },

    subjects: [

      {

        id: 'sub1',

        name: 'מתמטיקה',

        gradingSetTypeId: 'cat1',

        gradingSetTypeLabel: 'לימודי',

      },

      {

        id: 'sub2',

        name: 'אנגלית',

        gradingSetTypeId: 'cat1',

        gradingSetTypeLabel: 'לימודי',

      },

      {

        id: 'sub3',

        name: 'התנהגות',

        gradingSetTypeId: 'cat2',

        gradingSetTypeLabel: 'התנהגות',

      },

    ],

    entries: new Map([

      ['sub1', 'טוב'],

      ['sub2', null],

      ['sub3', 'מצוין'],

    ]),

    classGroups: [{ id: 'g1', name: 'א1', subjectId: 'sub1' }],

    studentGroupIds: ['g1'],

    certificatePrefs: {},

    generatedAt: '2026-01-01T00:00:00.000Z',

  };



  it('includes schemaVersion and subjects with null cells', () => {

    const json = buildSnapshotJson(base);

    expect(json.schemaVersion).toBe(1);

    expect(json.subjects).toHaveLength(3);

    expect(json.subjects[0]?.value).toBe('טוב');

    expect(json.subjects[1]?.value).toBeNull();

  });



  it('groups subjects by category for PDF tables', () => {

    const json = buildSnapshotJson(base);

    expect(json.subjectCategories).toHaveLength(2);

    expect(json.subjectCategories[0]?.categoryLabel).toBe('לימודי');

    expect(json.subjectCategories[0]?.subjects).toHaveLength(2);

    expect(json.subjectCategories[1]?.categoryLabel).toBe('התנהגות');

    expect(json.subjectCategories[1]?.subjects).toHaveLength(1);

  });

  it('nests subjects under parent category and sub-category', () => {
    const json = buildSnapshotJson({
      ...base,
      subjects: [
        {
          id: 'sub1',
          name: 'מתמטיקה',
          gradingSetTypeId: 'child1',
          gradingSetTypeLabel: 'מדעים',
        },
        {
          id: 'sub2',
          name: 'תנ״ך',
          gradingSetTypeId: 'child2',
          gradingSetTypeLabel: 'יהדות',
        },
        {
          id: 'sub3',
          name: 'התנהגות',
          gradingSetTypeId: 'cat2',
          gradingSetTypeLabel: 'התנהגות',
        },
      ],
      gradingSetTypes: [
        { id: 'root1', label: 'לימודי', parentId: null },
        { id: 'child1', label: 'מדעים', parentId: 'root1' },
        { id: 'child2', label: 'יהדות', parentId: 'root1' },
        { id: 'cat2', label: 'התנהגות', parentId: null },
      ],
      entries: new Map([
        ['sub1', 'טוב'],
        ['sub2', 'מצוין'],
        ['sub3', 'טוב'],
      ]),
    });

    expect(json.subjectCategories).toHaveLength(2);
    const academic = json.subjectCategories.find((c) => c.categoryLabel === 'לימודי');
    expect(academic?.subjects).toHaveLength(0);
    expect(academic?.subCategories).toHaveLength(2);
    expect(academic?.subCategories?.[0]?.subCategoryLabel).toBe('מדעים');
    expect(academic?.subCategories?.[0]?.subjects).toHaveLength(1);
    expect(academic?.subCategories?.[1]?.subCategoryLabel).toBe('יהדות');
  });

  it('flattens sub-categories when showSubCategoriesOnCertificate is false', () => {
    const json = buildSnapshotJson({
      ...base,
      subjects: [
        {
          id: 'sub1',
          name: 'מתמטיקה',
          gradingSetTypeId: 'child1',
          gradingSetTypeLabel: 'מדעים',
        },
        {
          id: 'sub2',
          name: 'תנ״ך',
          gradingSetTypeId: 'child2',
          gradingSetTypeLabel: 'יהדות',
        },
      ],
      gradingSetTypes: [
        { id: 'root1', label: 'לימודי', parentId: null },
        { id: 'child1', label: 'מדעים', parentId: 'root1' },
        { id: 'child2', label: 'יהדות', parentId: 'root1' },
      ],
      entries: new Map([
        ['sub1', 'טוב'],
        ['sub2', 'מצוין'],
      ]),
      certificatePrefs: { showSubCategoriesOnCertificate: false },
    });

    const academic = json.subjectCategories.find((c) => c.categoryLabel === 'לימודי');
    expect(academic?.subCategories).toBeUndefined();
    expect(academic?.subjects).toHaveLength(2);
    expect(json.subjects[0]?.subCategoryId).toBeNull();
  });



  it('uses certificateSubjectLabel when showSubjectGroupOnCertificate', () => {

    const json = buildSnapshotJson({

      ...base,

      certificatePrefs: { showSubjectGroupOnCertificate: true },

    });

    expect(json.subjects[0]?.subjectName).toBe('מתמטיקה-א1');

    expect(json.subjects[1]?.subjectName).toBe('אנגלית');

  });



  it('uses plain subject name when group display off', () => {

    const json = buildSnapshotJson({

      ...base,

      certificatePrefs: { showSubjectGroupOnCertificate: false },

    });

    expect(json.subjects[0]?.subjectName).toBe('מתמטיקה');

  });



  it('includes certificatePrefs in snapshot', () => {
    const json = buildSnapshotJson({
      ...base,
      certificatePrefs: {
        dateOnCertificate: true,
        signatures: true,
        absences: true,
      },
    });
    expect(json.certificatePrefs.signatures).toBe(true);
    expect(json.displayDate).toBeTruthy();
    expect(json.attendance?.absences).toBeNull();
  });

  it('includes separate hour fields, evaluation, cohort, and fill modes', () => {
    const json = buildSnapshotJson({
      ...base,
      class: { id: 'c1', name: 'ג׳1', year: 2025, yearHebrew: 'תשפ״ה' },
      certificatePrefs: {
        hourAbsences: true,
        hourLateness: true,
        evaluation: true,
        showClassYearHebrew: true,
        attendanceFillMode: 'handwritten',
        evaluationFillMode: 'handwritten',
      },
    });
    expect(json.attendance?.hourAbsences).toBeNull();
    expect(json.attendance?.hourLateness).toBeNull();
    expect(json.evaluation).toBeNull();
    expect(json.class.yearHebrew).toBe('תשפ״ה');
    expect(json.class.cohort).toBe('תשפ״ה');
    expect(json.fill.attendanceHandwritten).toBe(true);
    expect(json.fill.evaluationHandwritten).toBe(true);
  });

  it('omits cohort year when pref off', () => {
    const json = buildSnapshotJson({
      ...base,
      class: { id: 'c1', name: 'ג׳1', year: 2025, yearHebrew: 'תשפ״ה' },
      certificatePrefs: { showClassYearHebrew: false },
    });
    expect(json.class.yearHebrew).toBeUndefined();
    expect(json.class.cohort).toBeUndefined();
  });

  it('merges supplement data for computer-filled sections', () => {
    const json = buildSnapshotJson({
      ...base,
      certificatePrefs: {
        commentPerGrade: true,
        evaluation: true,
        absences: true,
        signatures: true,
        gradeCommentsFillMode: 'computer',
        evaluationFillMode: 'computer',
        attendanceFillMode: 'computer',
        signaturesFillMode: 'computer',
      },
      supplement: {
        absences: '2',
        evaluation: 'מצוינת',
        homeroomSignature: 'שרה לוי',
        principalSignature: 'רחל כהן',
        gradeComments: { sub1: 'השתפרה' },
      },
    });
    expect(json.subjects[0]?.comment).toBe('השתפרה');
    expect(json.evaluation).toBe('מצוינת');
    expect(json.attendance?.absences).toBe('2');
    expect(json.signatures?.homeroom).toBe('שרה לוי');
    expect(json.signatures?.principal).toBe('רחל כהן');
  });

  it('mergeSupplementIntoSnapshot overlays latest supplement onto stored snapshot', () => {
    const stored = buildSnapshotJson({
      ...base,
      certificatePrefs: {
        commentPerGrade: true,
        evaluation: true,
        absences: true,
        signatures: true,
        gradeCommentsFillMode: 'computer',
        evaluationFillMode: 'computer',
        attendanceFillMode: 'computer',
        signaturesFillMode: 'computer',
      },
    });
    expect(stored.subjects[0]?.comment).toBeNull();

    const merged = mergeSupplementIntoSnapshot(stored, {
      absences: '3',
      evaluation: 'עבודה טובה',
      homeroomSignature: 'מורה',
      gradeComments: { sub1: 'מצוינת' },
    });

    expect(merged.subjects[0]?.comment).toBe('מצוינת');
    expect(merged.evaluation).toBe('עבודה טובה');
    expect(merged.attendance?.absences).toBe('3');
    expect(merged.signatures?.homeroom).toBe('מורה');
    expect(merged.fill.gradeCommentsHandwritten).toBe(false);
  });

  it('includes profile name when showProfileNameOnCertificate is on', () => {
    const json = buildSnapshotJson({
      ...base,
      certificatePrefs: { showProfileNameOnCertificate: true },
      certificateProfileName: 'א–ד',
    });
    expect(json.certificateProfileName).toBe('א–ד');
  });

  it('omits profile name when showProfileNameOnCertificate is off', () => {
    const json = buildSnapshotJson({
      ...base,
      certificateProfileName: 'א–ד',
    });
    expect(json.certificateProfileName).toBeUndefined();
  });

  it('enriches profile name on merge when pref is on', () => {
    const stored = buildSnapshotJson({
      ...base,
      certificatePrefs: { showProfileNameOnCertificate: true },
    });
    const merged = enrichSnapshotProfileName(stored, 'ה–ח');
    expect(merged.certificateProfileName).toBe('ה–ח');
  });
});


