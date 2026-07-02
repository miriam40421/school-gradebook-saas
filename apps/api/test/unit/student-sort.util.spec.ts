import {

  compareByFamilyName,

  familyNameSortKey,

} from '../../src/students/student-sort.util';



describe('student-sort.util', () => {

  it('uses first word as family name for "family first" format', () => {

    expect(familyNameSortKey('כהן רחל')).toBe('כהן');

    expect(familyNameSortKey('לוי שרה')).toBe('לוי');

    expect(familyNameSortKey('בלאק שירה')).toBe('בלאק');

  });



  it('sorts by family name in Hebrew order', () => {

    const names = ['כהן רחל', 'אברהם שרה', 'כהן דנה'];

    const sorted = [...names].sort(compareByFamilyName);

    expect(sorted).toEqual(['אברהם שרה', 'כהן דנה', 'כהן רחל']);

  });

});

