import type { CertificateSnapshotJsonV1 } from '@school/shared';

type NikudFn = (text: string) => Promise<string>;

function hasNikud(text: string): boolean {
  return /[ְ-ֽׁׂ]/.test(text);
}

/** Skip nikud for null/empty/pure-numeric/already-nikudified values. */
async function maybeNikud(
  text: string | null | undefined,
  nikud: NikudFn,
): Promise<string | null | undefined> {
  if (text == null || text === '' || /^\d+([./]\d+)?$/.test(text) || hasNikud(text)) return text;
  return nikud(text);
}

async function nikudStr(text: string, nikud: NikudFn): Promise<string> {
  if (!text || hasNikud(text)) return text;
  return nikud(text);
}

/** Apply automatic nikud to all user-visible Hebrew text fields in a snapshot. */
export async function nikudSnapshot(
  snapshot: CertificateSnapshotJsonV1,
  nikud: NikudFn,
): Promise<CertificateSnapshotJsonV1> {
  const [studentName, className, termName, evaluation, cohort, yearHebrew, displayDate, certificateProfileName] =
    await Promise.all([
      nikudStr(snapshot.student.fullName, nikud),
      nikudStr(snapshot.class.name, nikud),
      nikudStr(snapshot.term.name, nikud),
      maybeNikud(snapshot.evaluation, nikud),
      maybeNikud(snapshot.class.cohort, nikud),
      maybeNikud(snapshot.class.yearHebrew, nikud),
      maybeNikud(snapshot.displayDate, nikud),
      maybeNikud(snapshot.certificateProfileName, nikud),
    ]);

  const signatures = snapshot.signatures
    ? {
        homeroom: await maybeNikud(snapshot.signatures.homeroom, nikud),
        principal: await maybeNikud(snapshot.signatures.principal, nikud),
        parent: await maybeNikud(snapshot.signatures.parent, nikud),
      }
    : undefined;

  const nikudSubject = async (s: CertificateSnapshotJsonV1['subjects'][number]) => ({
    ...s,
    subjectName: await nikudStr(s.subjectName, nikud),
    value: (await maybeNikud(s.value, nikud)) as string | null,
    ...(s.comment != null ? { comment: (await maybeNikud(s.comment, nikud)) as string | null } : {}),
    ...(s.categoryLabel != null ? { categoryLabel: await nikudStr(s.categoryLabel, nikud) } : {}),
    ...(s.subCategoryLabel != null ? { subCategoryLabel: await nikudStr(s.subCategoryLabel, nikud) } : {}),
  });

  const nikudCategories = await Promise.all(
    snapshot.subjectCategories.map(async (cat) => {
      const categoryLabel = await nikudStr(cat.categoryLabel, nikud);

      const subjects = await Promise.all(cat.subjects.map(nikudSubject));

      const subCategories = cat.subCategories
        ? await Promise.all(
            cat.subCategories.map(async (sub) => {
              const subCategoryLabel = await nikudStr(sub.subCategoryLabel, nikud);
              const subSubjects = await Promise.all(sub.subjects.map(nikudSubject));
              return { ...sub, subCategoryLabel, subjects: subSubjects };
            }),
          )
        : undefined;

      return { ...cat, categoryLabel, subjects, ...(subCategories ? { subCategories } : {}) };
    }),
  );

  const nikudFlatSubjects = await Promise.all(snapshot.subjects.map(nikudSubject));

  return {
    ...snapshot,
    student: { ...snapshot.student, fullName: studentName },
    class: {
      ...snapshot.class,
      name: className,
      ...(cohort !== undefined ? { cohort: cohort as string | null } : {}),
      ...(yearHebrew !== undefined ? { yearHebrew: yearHebrew as string | null } : {}),
    },
    term: { ...snapshot.term, name: termName },
    ...(displayDate !== undefined ? { displayDate: displayDate as string | null } : {}),
    ...(certificateProfileName !== undefined ? { certificateProfileName: certificateProfileName as string | null } : {}),
    ...(evaluation !== undefined ? { evaluation: evaluation as string | null } : {}),
    ...(signatures !== undefined ? { signatures } : {}),
    subjects: nikudFlatSubjects,
    subjectCategories: nikudCategories,
  };
}
