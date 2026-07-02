export type GradingSetWithValues = {
  id: string;
  values: { label: string; order: number }[];
};

export class LabelResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LabelResolutionError';
  }
}

/** When duplicates exist (legacy data), use the set with the most grade labels. */
export function pickGradingSetForType(
  sets: GradingSetWithValues[],
): GradingSetWithValues {
  if (sets.length === 0) {
    throw new LabelResolutionError(
      'Grading set ambiguous or missing for subject type',
    );
  }
  if (sets.length === 1) {
    return sets[0]!;
  }
  const sorted = [...sets].sort(
    (a, b) => b.values.length - a.values.length,
  );
  const best = sorted[0]!;
  if (best.values.length === 0) {
    throw new LabelResolutionError(
      'Grading set ambiguous or missing for subject type',
    );
  }
  return best;
}

export function resolveAllowedLabelsFromSets(
  sets: GradingSetWithValues[],
): string[] {
  const chosen = pickGradingSetForType(sets);
  if (chosen.values.length === 0) {
    throw new LabelResolutionError(
      'Grading set ambiguous or missing for subject type',
    );
  }
  return [...chosen.values]
    .sort((a, b) => a.order - b.order)
    .map((v) => v.label);
}

/** Merge label lists root→leaf, preserving order and skipping duplicates. */
export function mergeAllowedLabelLists(lists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    for (const label of list) {
      if (seen.has(label)) continue;
      seen.add(label);
      merged.push(label);
    }
  }
  return merged;
}

/**
 * Allowed grade labels for a subject type, including ancestor category sets.
 * Sub-category subjects inherit parent labels plus any labels defined on the sub-category.
 */
export function resolveAllowedLabelsForTypeHierarchy(
  setsByTypeId: Map<string, GradingSetWithValues[]>,
  typeChain: string[],
): string[] {
  const lists: string[][] = [];
  for (const typeId of typeChain) {
    const sets = setsByTypeId.get(typeId);
    if (!sets || sets.length === 0) continue;
    try {
      lists.push(resolveAllowedLabelsFromSets(sets));
    } catch {
      // Skip hierarchy levels without usable grade sets.
    }
  }
  if (lists.length === 0) {
    throw new LabelResolutionError(
      'Grading set ambiguous or missing for subject type',
    );
  }
  return mergeAllowedLabelLists(lists);
}

export function isValidGradeValue(
  value: string | null | undefined,
  allowedLabels: string[],
): boolean {
  if (value === null || value === undefined) return true;
  return allowedLabels.includes(value);
}
