import {
  commentPerGradeForCategory,
  normalizeCertificatePrefs,
} from '@school/shared';

describe('commentPerGradeForCategory', () => {
  it('returns false when commentPerGrade is off', () => {
    expect(
      commentPerGradeForCategory(
        { commentPerGrade: false, commentPerGradeCategoryIds: ['a'] },
        'a',
      ),
    ).toBe(false);
  });

  it('returns true for all categories when list omitted', () => {
    expect(
      commentPerGradeForCategory({ commentPerGrade: true }, 'limudim'),
    ).toBe(true);
  });

  it('filters to selected parent categories', () => {
    const prefs = normalizeCertificatePrefs({
      commentPerGrade: true,
      commentPerGradeCategoryIds: ['halichot', 'limudim'],
    });
    expect(commentPerGradeForCategory(prefs, 'halichot')).toBe(true);
    expect(commentPerGradeForCategory(prefs, 'sports')).toBe(false);
  });

  it('returns false for all when list is empty', () => {
    expect(
      commentPerGradeForCategory(
        { commentPerGrade: true, commentPerGradeCategoryIds: [] },
        'limudim',
      ),
    ).toBe(false);
  });
});
