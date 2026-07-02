import * as XLSX from 'xlsx';
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
  if (rows.length === 0) {
    return [];
  }
  const header = rows[0].map((c) => String(c).trim());
  const hasHeader = headerRowHasLabels(header);
  const cols = hasHeader ? detectColumns(header) : {};
  const start = hasHeader ? 1 : 0;
  const names: string[] = [];
  for (let i = start; i < rows.length; i++) {
    const cells = rows[i].map((c) => String(c ?? '').trim());
    const value = buildNameFromCells(cells, cols);
    if (value) {
      names.push(value);
    }
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

function parseExcel(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return [];
  }
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
  }) as (string | number)[][];
  const asStrings = rows.map((row) => row.map((c) => String(c)));
  return parseRows(asStrings);
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = n.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}
