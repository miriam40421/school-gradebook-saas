import {
  buildGradingTypeAncestorChain,
  buildGradingTypeMap,
  resolveSubjectCategoryPlacement,
  subjectCategoryGroup,
  subjectCategoryColumns,
} from '@school/shared';

describe('grading-category.util', () => {
  const types = buildGradingTypeMap([
    { id: 'root', label: 'הליכות', parentId: null },
    { id: 'child1', label: 'הליכות בת ישראל', parentId: 'root' },
    { id: 'child2', label: 'אחריות לימודית', parentId: 'root' },
  ]);

  it('groups under parent when sub-categories hidden', () => {
    const placement = resolveSubjectCategoryPlacement(
      'child1',
      'הליכות בת ישראל',
      types,
      false,
    );
    expect(placement.categoryLabel).toBe('הליכות');
    expect(placement.subCategoryId).toBeNull();

    const group = subjectCategoryGroup(
      'child2',
      'אחריות לימודית',
      types,
      false,
    );
    expect(group.categoryGroupLabel).toBe('הליכות');
  });

  it('keeps sub-category when enabled', () => {
    const group = subjectCategoryGroup(
      'child1',
      'הליכות בת ישראל',
      types,
      true,
    );
    expect(group.categoryGroupLabel).toBe('הליכות בת ישראל');
  });

  it('subjectCategoryColumns exposes parent and sub groups', () => {
    const cols = subjectCategoryColumns('child1', 'הליכות בת ישראל', types, true);
    expect(cols.parentCategoryGroupLabel).toBe('הליכות');
    expect(cols.categoryGroupLabel).toBe('הליכות בת ישראל');
  });

  it('buildGradingTypeAncestorChain returns root to leaf ids', () => {
    expect(buildGradingTypeAncestorChain('child1', types)).toEqual([
      'root',
      'child1',
    ]);
    expect(buildGradingTypeAncestorChain('root', types)).toEqual(['root']);
  });
});
