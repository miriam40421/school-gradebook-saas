import { certificateSubjectLabel } from '@school/shared';

describe('certificateSubjectLabel', () => {
  it('joins subject and group with hyphen when enabled', () => {
    expect(certificateSubjectLabel('חשבון', 'א1', true)).toBe('חשבון-א1');
  });

  it('returns subject only when disabled or no group', () => {
    expect(certificateSubjectLabel('חשבון', 'א1', false)).toBe('חשבון');
    expect(certificateSubjectLabel('דקדוק', null, true)).toBe('דקדוק');
  });
});
