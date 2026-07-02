export type GradingSetTypeNode = {
  id: string;
  label: string;
  parentId: string | null;
};

export function buildGradingTypeMap(
  types: GradingSetTypeNode[],
): Map<string, GradingSetTypeNode> {
  return new Map(types.map((t) => [t.id, t]));
}

/** Root → leaf type ids for a subject's grading category (includes the subject type). */
export function buildGradingTypeAncestorChain(
  typeId: string,
  types: Map<string, GradingSetTypeNode>,
): string[] {
  const chain: string[] = [];
  let current: GradingSetTypeNode | undefined = types.get(typeId);
  if (!current) return [typeId];

  while (current) {
    chain.unshift(current.id);
    if (!current.parentId) break;
    current = types.get(current.parentId);
  }
  return chain;
}

export function resolveSubjectCategoryPlacement(
  typeId: string,
  typeLabel: string,
  types: Map<string, GradingSetTypeNode>,
  showSubCategories: boolean,
): {
  categoryId: string;
  categoryLabel: string;
  subCategoryId: string | null;
  subCategoryLabel: string | null;
} {
  const type = types.get(typeId);
  if (!type?.parentId) {
    return {
      categoryId: typeId,
      categoryLabel: typeLabel,
      subCategoryId: null,
      subCategoryLabel: null,
    };
  }

  const chain: Array<{ id: string; label: string }> = [];
  let current: GradingSetTypeNode | undefined = type;
  while (current) {
    chain.unshift({ id: current.id, label: current.label });
    if (!current.parentId) break;
    current = types.get(current.parentId);
  }

  const root = chain[0] ?? { id: typeId, label: typeLabel };
  if (chain.length <= 1 || !showSubCategories) {
    return {
      categoryId: root.id,
      categoryLabel: root.label,
      subCategoryId: null,
      subCategoryLabel: null,
    };
  }

  const leaf = chain[chain.length - 1]!;
  return {
    categoryId: root.id,
    categoryLabel: root.label,
    subCategoryId: leaf.id,
    subCategoryLabel: chain.slice(1).map((t) => t.label).join(' · '),
  };
}

/** Column / table grouping id+label for gradebook headers. */
export function subjectCategoryGroup(
  typeId: string,
  typeLabel: string,
  types: Map<string, GradingSetTypeNode>,
  showSubCategories: boolean,
): { categoryGroupId: string; categoryGroupLabel: string } {
  const placement = resolveSubjectCategoryPlacement(
    typeId,
    typeLabel,
    types,
    showSubCategories,
  );
  if (showSubCategories && placement.subCategoryId) {
    return {
      categoryGroupId: placement.subCategoryId,
      categoryGroupLabel: placement.subCategoryLabel ?? typeLabel,
    };
  }
  return {
    categoryGroupId: placement.categoryId,
    categoryGroupLabel: placement.categoryLabel,
  };
}

/** Parent + column group for nested gradebook / certificate table headers. */
export function subjectCategoryColumns(
  typeId: string,
  typeLabel: string,
  types: Map<string, GradingSetTypeNode>,
  showSubCategories: boolean,
): {
  parentCategoryGroupId: string;
  parentCategoryGroupLabel: string;
  categoryGroupId: string;
  categoryGroupLabel: string;
} {
  const placement = resolveSubjectCategoryPlacement(
    typeId,
    typeLabel,
    types,
    showSubCategories,
  );
  const group = subjectCategoryGroup(typeId, typeLabel, types, showSubCategories);
  return {
    parentCategoryGroupId: placement.categoryId,
    parentCategoryGroupLabel: placement.categoryLabel,
    categoryGroupId: group.categoryGroupId,
    categoryGroupLabel: group.categoryGroupLabel,
  };
}
