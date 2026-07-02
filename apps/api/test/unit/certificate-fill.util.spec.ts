import {
  certificateFillView,
  normalizeCertificatePrefs,
} from '@school/shared';

describe('certificate fill prefs', () => {
  it('maps legacy homeroomComment to evaluation', () => {
    const p = normalizeCertificatePrefs({ homeroomComment: true });
    expect(p.evaluation).toBe(true);
  });

  it('defaults grades to computer and attendance to handwritten', () => {
    const fill = certificateFillView({});
    expect(fill.gradesHandwritten).toBe(false);
    expect(fill.attendanceHandwritten).toBe(true);
  });

  it('defaults header fields to computer fill', () => {
    const fill = certificateFillView({});
    expect(fill.studentNameHandwritten).toBe(false);
    expect(fill.classNameHandwritten).toBe(false);
    expect(fill.dateHandwritten).toBe(false);
  });

  it('respects explicit fill modes', () => {
    const fill = certificateFillView({
      gradesFillMode: 'handwritten',
      signaturesFillMode: 'computer',
    });
    expect(fill.gradesHandwritten).toBe(true);
    expect(fill.signaturesHandwritten).toBe(false);
  });
});
