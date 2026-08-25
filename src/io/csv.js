/**
 * CSV export of the results table.
 */

import { fmtYear } from '../core/jdn.js';
import { downloadText, stamp } from './download.js';

/**
 * Quote a CSV field.
 *
 * The leading-character guard stops a spreadsheet from treating a value that
 * begins =, +, - or @ as a formula. Anchor labels are user-supplied, so this
 * matters even though nothing here leaves the machine.
 */
function cell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = [
  ['Score', (r) => r.score],
  ['Projected Date', (r) => `${fmtYear(r.ay)} ${String(r.m).padStart(2, '0')}/${String(r.d).padStart(2, '0')}`],
  ['Julian Day', (r) => r.zjd],
  ['Annus Mundi', (r) => r.am],
  ['Long-Count Year', (r) => r.lc],
  ['Operation', (r) => r.op],
  ['Y (rotations)', (r) => r.Y],
  ['From', (r) => r.x1],
  ['To', (r) => r.x2],
  ['Echo', (r) => (r.echo ? 'yes' : '')],
  ['Solar Eclipse', (r) => r.solar ?? ''],
  ['Lunar Eclipse', (r) => r.lunar ?? ''],
  ['Resonance', (r) => r.tags.map((t) => t[0]).join(' · ')],
];

/** Render rows as CSV text. */
export function resultsToCsv(rows) {
  const lines = [COLUMNS.map((c) => cell(c[0])).join(',')];
  for (const r of rows) lines.push(COLUMNS.map(([, get]) => cell(get(r))).join(','));
  return lines.join('\r\n');
}

/** Export exactly the rows passed in — i.e. what the user can currently see. */
export function exportResultsCsv(rows) {
  downloadText(`natori-cast_${stamp()}.csv`, resultsToCsv(rows), 'text/csv;charset=utf-8');
  return rows.length;
}
