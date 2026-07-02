import {
  compareByFamilyName,
  familyNameSortKey,
  sortByFamilyName,
} from '@school/shared';

export { compareByFamilyName, familyNameSortKey };

export function sortStudentsByFamilyName<T extends { fullName: string }>(
  students: T[],
): T[] {
  return sortByFamilyName(students, (s) => s.fullName);
}
