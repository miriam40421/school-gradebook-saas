export type ClassGroupRef = {
  subjectId?: string | null;
  subject?: { id: string; name: string } | null;
};

export function groupSubjectId(g: ClassGroupRef): string | null {
  return g.subjectId ?? g.subject?.id ?? null;
}

export function groupsForSubjectInClass<T extends ClassGroupRef>(
  groups: T[] | undefined,
  subjectId: string,
): T[] {
  return (groups ?? []).filter((g) => groupSubjectId(g) === subjectId);
}
