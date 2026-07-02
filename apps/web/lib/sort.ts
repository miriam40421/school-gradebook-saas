import {
  formatStudentDisplayName,
  formatStudentFullName,
  normalizeStudentFullName,
  sortByFamilyName,
  splitStudentFullName,
} from '@school/shared';

export {
  formatStudentDisplayName,
  formatStudentFullName,
  normalizeStudentFullName,
  sortByFamilyName,
  splitStudentFullName,
};

export function sortHebrew<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => key(a).localeCompare(key(b), 'he'));
}
