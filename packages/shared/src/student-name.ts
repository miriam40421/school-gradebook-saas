/** Canonical storage: «שם משפחה» then «שם פרטי» (e.g. כהן רחל). */

export function normalizeStudentFullName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function splitStudentFullName(fullName: string): {
  firstName: string;
  familyName: string;
} {
  const parts = normalizeStudentFullName(fullName).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: '', familyName: parts[0] ?? '' };
  }
  return {
    familyName: parts[0]!,
    firstName: parts.slice(1).join(' '),
  };
}

export function formatStudentFullName(familyName: string, firstName: string): string {
  return normalizeStudentFullName(`${familyName} ${firstName}`);
}

export function formatStudentDisplayName(fullName: string): string {
  const { familyName, firstName } = splitStudentFullName(fullName);
  if (!familyName) {
    return fullName.trim();
  }
  return firstName ? `${familyName} ${firstName}` : familyName;
}

export function familyNameSortKey(fullName: string): string {
  const parts = normalizeStudentFullName(fullName).split(/\s+/).filter(Boolean);
  return parts[0] ?? fullName.trim();
}

export function compareByFamilyName(a: string, b: string): number {
  const byFamily = familyNameSortKey(a).localeCompare(familyNameSortKey(b), 'he');
  if (byFamily !== 0) {
    return byFamily;
  }
  return a.localeCompare(b, 'he');
}

export function sortByFamilyName<T>(items: T[], getFullName: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    compareByFamilyName(getFullName(a), getFullName(b)),
  );
}
