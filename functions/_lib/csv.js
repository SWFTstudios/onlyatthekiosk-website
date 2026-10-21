/**
 * CSV for the back office exports. Cells that a spreadsheet would run as a
 * formula (=, @, or +/- followed by text) get a leading apostrophe; phone
 * numbers like +1 201… are left alone.
 */

const FORMULA = /^(=|@|[+-](?![\d\s(]))/;

export function cell(v) {
  let s = v == null ? '' : String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
