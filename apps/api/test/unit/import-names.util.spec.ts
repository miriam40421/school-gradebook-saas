import * as XLSX from 'xlsx';

import {

  parseHtmlTableRows,

  parseNamesFromBuffer,

  parseVerticalPairLines,

} from '../../src/students/import-names.util';



function excelBuffer(rows: (string | number)[][]): Buffer {

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  const book = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');

  return Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));

}



describe('parseNamesFromBuffer', () => {

  it('combines first and last name columns from Excel headers', async () => {

    const buffer = excelBuffer([

      ['שם משפחה', 'שם פרטי'],

      ['כהן', 'רחל'],

      ['לוי', 'שרה'],

    ]);

    const names = await parseNamesFromBuffer(buffer, 'students.xlsx');

    expect(names).toEqual(['כהן רחל', 'לוי שרה']);

  });



  it('combines two columns without headers (family then first)', async () => {

    const buffer = excelBuffer([

      ['כהן', 'רחל'],

      ['לוי', 'שרה'],

    ]);

    const names = await parseNamesFromBuffer(buffer, 'list.xlsx');

    expect(names).toEqual(['כהן רחל', 'לוי שרה']);

  });



  it('uses a single full-name column when present', async () => {

    const buffer = excelBuffer([

      ['שם'],

      ['כהן רחל'],

      ['לוי שרה'],

    ]);

    const names = await parseNamesFromBuffer(buffer, 'names.xlsx');

    expect(names).toEqual(['כהן רחל', 'לוי שרה']);

  });



  it('parses CSV with first and last columns', async () => {

    const csv = 'שם משפחה,שם פרטי\nכהן,רחל\n';

    const names = await parseNamesFromBuffer(

      Buffer.from(csv, 'utf8'),

      'students.csv',

    );

    expect(names).toEqual(['כהן רחל']);

  });



  it('parses Word HTML table with two columns', () => {

    const html = `

      <table>

        <tr><th>שם משפחה</th><th>שם פרטי</th></tr>

        <tr><td>כהן</td><td>רחל</td></tr>

        <tr><td>לוי</td><td>שרה</td></tr>

      </table>`;

    expect(parseHtmlTableRows(html)).toEqual(['כהן רחל', 'לוי שרה']);

  });



  it('parses Word vertical layout (one cell per line)', () => {

    const lines = ['שם משפחה', 'שם פרטי', 'כהן', 'רחל', 'לוי', 'שרה'];

    expect(parseVerticalPairLines(lines)).toEqual(['כהן רחל', 'לוי שרה']);

  });

});

