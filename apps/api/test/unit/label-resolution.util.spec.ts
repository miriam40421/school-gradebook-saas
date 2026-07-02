import {
  LabelResolutionError,
  isValidGradeValue,
  mergeAllowedLabelLists,
  pickGradingSetForType,
  resolveAllowedLabelsForTypeHierarchy,
  resolveAllowedLabelsFromSets,
} from '../../src/gradebook/label-resolution.util';

describe('resolveAllowedLabelsFromSets', () => {
  it('returns ordered labels when exactly one set', () => {
    const labels = resolveAllowedLabelsFromSets([
      {
        id: '1',
        values: [
          { label: 'Good', order: 2 },
          { label: 'Excellent', order: 1 },
        ],
      },
    ]);
    expect(labels).toEqual(['Excellent', 'Good']);
  });

  it('throws when zero sets', () => {
    expect(() => resolveAllowedLabelsFromSets([])).toThrow(LabelResolutionError);
  });

  it('throws when one set has no values', () => {
    expect(() =>
      resolveAllowedLabelsFromSets([{ id: '1', values: [] }]),
    ).toThrow(LabelResolutionError);
  });

  it('picks the set with more values when multiple sets (legacy duplicates)', () => {
    const labels = resolveAllowedLabelsFromSets([
      { id: 'empty', values: [] },
      {
        id: 'full',
        values: [
          { label: 'מצוין', order: 1 },
          { label: 'טוב', order: 2 },
        ],
      },
    ]);
    expect(labels).toEqual(['מצוין', 'טוב']);
  });
});

describe('pickGradingSetForType', () => {
  it('prefers non-empty set among duplicates', () => {
    const picked = pickGradingSetForType([
      { id: 'a', values: [] },
      { id: 'b', values: [{ label: 'A', order: 1 }] },
    ]);
    expect(picked.id).toBe('b');
  });
});

describe('mergeAllowedLabelLists', () => {
  it('merges parent and child labels without duplicates', () => {
    expect(
      mergeAllowedLabelLists([
        ['מצוין', 'טוב'],
        ['טוב', 'מספיק'],
      ]),
    ).toEqual(['מצוין', 'טוב', 'מספיק']);
  });
});

describe('resolveAllowedLabelsForTypeHierarchy', () => {
  const setsByType = new Map([
    [
      'root',
      [
        {
          id: 'root-set',
          values: [
            { label: 'מצוין', order: 1 },
            { label: 'טוב', order: 2 },
          ],
        },
      ],
    ],
    [
      'child',
      [
        {
          id: 'child-set',
          values: [
            { label: 'טוב', order: 1 },
            { label: 'מיוחד לתת', order: 2 },
          ],
        },
      ],
    ],
  ]);

  it('includes parent labels for sub-category subjects', () => {
    const labels = resolveAllowedLabelsForTypeHierarchy(setsByType, [
      'root',
      'child',
    ]);
    expect(labels).toEqual(['מצוין', 'טוב', 'מיוחד לתת']);
  });

  it('uses only sub-category labels when parent has no set', () => {
    const labels = resolveAllowedLabelsForTypeHierarchy(setsByType, ['child']);
    expect(labels).toEqual(['טוב', 'מיוחד לתת']);
  });

  it('throws when no hierarchy level has labels', () => {
    expect(() =>
      resolveAllowedLabelsForTypeHierarchy(new Map(), ['missing']),
    ).toThrow(LabelResolutionError);
  });
});

describe('isValidGradeValue', () => {
  it('accepts null and allowed labels', () => {
    expect(isValidGradeValue(null, ['A'])).toBe(true);
    expect(isValidGradeValue('A', ['A', 'B'])).toBe(true);
    expect(isValidGradeValue('X', ['A'])).toBe(false);
  });
});
