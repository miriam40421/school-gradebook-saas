import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

const FULL_NAME_HEADERS = new Set([
  'name',
  'fullname',
  'full_name',
  'student',
  'שם',
  'שם מלא',
  'שם התלמידה',
  'שם התלמיד',
]);

const FIRST_NAME_HEADERS = new Set([
  'first',
  'firstname',
  'first_name',
  'given',
  'givenname',
  'שם פרטי',
  'פרטי',
]);

const LAST_NAME_HEADERS = new Set([
  'last',
  'lastname',
  'last_name',
  'surname',
  'family',
  'familyname',
  'family_name',
  'שם משפחה',
  'משפחה',
]);

type ColumnMap = {
  full?: number;
  first?: number;
  last?: number;
};

export async function parseNamesFromBuffer(
  buffer: Buffer,
  filename: string,
): Promise<string[]> {
  // eslint-disable-next-line no-console
  console.log('[import-debug] filename:', filename, 'size:', buffer.length);
  const lower = filename.toLowerCase();
  if (lower.endsWith('.docx')) {
    return parseWord(buffer);
  }
  if (lower.endsWith('.doc')) {
    throw new Error(
      'Unsupported file type: save the document as .docx (Word 2007+) and try again',
    );
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseExcel(buffer);
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseText(buffer.toString('utf8'));
  }
  const asText = buffer.toString('utf8');
  if (asText.includes('\t') || asText.includes(',')) {
    return parseText(asText);
  }
  return parseExcel(buffer);
}

async function parseWord(buffer: Buffer): Promise<string[]> {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const fromTables = parseHtmlTableRows(htmlResult.value);
  if (fromTables.length > 0) {
    return fromTables;
  }

  const { value } = await mammoth.extractRawText({ buffer });
  const lines = value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const fromVertical = parseVerticalPairLines(lines);
  if (fromVertical.length > 0) {
    return fromVertical;
  }

  return parseText(value);
}

/** Parses Word HTML tables (two-column or header-labeled). */
export function parseHtmlTableRows(html: string): string[] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const allRows: string[][] = [];
  for (const table of tables) {
    const trMatches = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    for (const tr of trMatches) {
      const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (m) => stripHtml(m[1]),
      );
      if (cells.some((c) => c)) {
        allRows.push(cells);
      }
    }
  }
  if (allRows.length === 0) {
    return [];
  }
  return parseRows(allRows);
}

function stripHtml(fragment: string): string {
  return fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word sometimes exports a 2-column table as one cell per line (header then pairs). */
export function parseVerticalPairLines(lines: string[]): string[] {
  if (lines.length < 3) {
    return [];
  }
  const header = [lines[0], lines[1]];
  if (!headerRowHasLabels(header)) {
    return [];
  }
  const cols = detectColumns(header);
  if (cols.first === undefined && cols.last === undefined) {
    return [];
  }
  const names: string[] = [];
  for (let i = 2; i < lines.length; i += 2) {
    if (i + 1 >= lines.length) {
      break;
    }
    const value = buildNameFromCells([lines[i], lines[i + 1]], cols);
    if (value) {
      names.push(value);
    }
  }
  return dedupeNames(names);
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function detectColumns(headers: string[]): ColumnMap {
  const cols: ColumnMap = {};
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(String(headers[i] ?? ''));
    if (!h) {
      continue;
    }
    if (FULL_NAME_HEADERS.has(h)) {
      cols.full = i;
    }
    if (FIRST_NAME_HEADERS.has(h)) {
      cols.first = i;
    }
    if (LAST_NAME_HEADERS.has(h)) {
      cols.last = i;
    }
  }
  return cols;
}

function headerRowHasLabels(headers: string[]): boolean {
  return headers.some((h) => {
    const n = normalizeHeader(String(h ?? ''));
    return (
      FULL_NAME_HEADERS.has(n) ||
      FIRST_NAME_HEADERS.has(n) ||
      LAST_NAME_HEADERS.has(n)
    );
  });
}

/**
 * Returns true if the value looks like a real person name component:
 * contains Hebrew letters and no digits.
 * Used to distinguish data rows from unrecognized header rows.
 */
function looksLikeNameCell(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (!/[א-ת]/.test(v)) return false; // must have Hebrew
  if (/\d/.test(v)) return false;                // digits → probably a label
  return true;
}

function buildNameFromCells(cells: string[], cols: ColumnMap): string | null {
  const at = (idx?: number) =>
    idx !== undefined ? String(cells[idx] ?? '').trim() : '';

  if (cols.first !== undefined && cols.last !== undefined) {
    const first = at(cols.first);
    const last = at(cols.last);
    if (first && last) {
      return `${last} ${first}`;
    }
    return first || last || null;
  }

  if (cols.full !== undefined) {
    const full = at(cols.full);
    return full || null;
  }

  const c0 = at(0);
  const c1 = at(1);
  if (c0 && c1) {
    return `${c0} ${c1}`;
  }
  return c0 || null;
}

function parseRows(rows: string[][]): string[] {
  if (rows.length === 0) return [];

  // Scan first 5 rows for a recognized header row (with known column labels)
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const header = rows[i].map((c) => String(c).trim());
    if (headerRowHasLabels(header)) {
      const cols = detectColumns(header);
      const names: string[] = [];
      for (let j = i + 1; j < rows.length; j++) {
        const cells = rows[j].map((c) => String(c ?? '').trim());
        const value = buildNameFromCells(cells, cols);
        if (value) names.push(value);
      }
      return dedupeNames(names);
    }
  }

  // No recognized header found.
  // Strategy:
  //   - If the file has any multi-cell rows (2+ cols), single-cell rows at the top are titles.
  //   - If the first multi-cell row has cells that don't look like names (digits / no Hebrew)
  //     it's an unrecognized header → skip it.
  //   - If the file is all single-cell rows it's a single-column name list → start from row 0.
  const hasTwoColRows = rows.some(
    (r) => r.filter((c) => String(c).trim()).length >= 2,
  );
  let dataStart = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const cells = rows[i].map((c) => String(c).trim()).filter(Boolean);
    if (cells.length === 0) continue;

    if (hasTwoColRows && cells.length === 1) {
      // Multi-col file: lone cell at top is a document title → skip
      dataStart = i + 1;
      continue;
    }

    if (cells.length >= 2) {
      // Multi-cell row: if not all cells look like names it's a header → skip once
      if (!cells.every(looksLikeNameCell)) {
        dataStart = i + 1;
      } else {
        dataStart = i;
      }
      break;
    }

    // Single cell: check if it looks like an actual name
    if (!looksLikeNameCell(cells[0])) {
      // Label / column-title (e.g. "עמודה1", "שם") → skip and keep looking
      dataStart = i + 1;
      continue;
    }
    dataStart = i;
    break;
  }

  const names: string[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c ?? '').trim());
    const value = buildNameFromCells(cells, {});
    if (value) names.push(value);
  }
  return dedupeNames(names);
}

function splitLineToCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }
  if (/[,;\t]/.test(trimmed)) {
    return trimmed.split(/[,;\t]/).map((c) => c.trim());
  }
  if (/\s{2,}/.test(trimmed)) {
    return trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  }
  return [trimmed];
}

function parseText(content: string): string[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return [];
  }
  const rows = lines.map((line) => splitLineToCells(line));
  return parseRows(rows);
}

function cellToString(c: ExcelJS.CellValue | null | undefined): string {
  if (c == null) return '';
  if (typeof c === 'string') return c;
  if (typeof c === 'number' || typeof c === 'boolean') return String(c);
  if (c instanceof Date) return '';
  if (typeof c === 'object') {
    // CellRichTextValue: { richText: Array<{ text: string }> }
    if ('richText' in c && Array.isArray((c as ExcelJS.CellRichTextValue).richText)) {
      return (c as ExcelJS.CellRichTextValue).richText.map((r) => r.text ?? '').join('');
    }
    // CellHyperlinkValue: { text: string, hyperlink: string }
    if ('text' in c && typeof (c as { text: string }).text === 'string') {
      return (c as { text: string }).text;
    }
    // CellFormulaValue: { formula: string, result?: string | number | ... }
    if ('result' in c) {
      const result = (c as ExcelJS.CellFormulaValue).result;
      if (typeof result === 'string') return result;
      if (typeof result === 'number') return String(result);
      return '';
    }
  }
  return '';
}

async function parseExcel(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    // eslint-disable-next-line no-console
    console.log('[import-debug] no worksheet found');
    return [];
  }
  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    // ExcelJS row.values is 1-based sparse array; Array.from densifies holes → undefined → ''
    const rawValues = (row.values as (ExcelJS.CellValue | null | undefined)[]).slice(1);
    const cells = Array.from({ length: rawValues.length }, (_, i) => cellToString(rawValues[i]));
    const firstNonEmpty = cells.findIndex((c) => c.trim());
    if (firstNonEmpty === -1) return; // skip entirely empty rows
    // Trim leading empty cells so data in column H looks same as column A
    let lastNonEmpty = cells.length - 1;
    while (lastNonEmpty > firstNonEmpty && !cells[lastNonEmpty].trim()) lastNonEmpty--;
    rows.push(cells.slice(firstNonEmpty, lastNonEmpty + 1));
  });
  // eslint-disable-next-line no-console
  console.log('[import-debug] excel rows:', JSON.stringify(rows.slice(0, 5)));
  return parseRows(rows);
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    // Strip null bytes — PostgreSQL rejects 0x00 in UTF-8 strings
    const key = n.replace(/\x00/g, '').trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}
