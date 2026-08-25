/**
 * CSV export of the results table.
 */

import { fmtYear } from '../core/jdn.js';
import { downloadText, stamp } from './download.js';

/** Quote a value that is only ever a number — no formula guard, so signs survive. */
function num(value) {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Quote a text field.
 *
 * The leading-character guard stops a spreadsheet from treating a value that
 * begins =, +, - or @ as a formula. It is applied ONLY to text columns: the
 * numeric columns are legitimately negative for BC dates (Annus Mundi and
 * Long-Count both go negative before their epochs) and prefixing those would
 * turn real numbers into text.
 */
function text(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = [
  ['Score', (r) => r.score, num],
  ['Projected Date', (r) => `${fmtYear(r.ay)} ${String(r.m).padStart(2, '0')}/${String(r.d).padStart(2, '0')}`, text],
  ['Julian Day', (r) => r.zjd, num],
  ['Annus Mundi', (r) => r.am, num],
  ['Long-Count Year', (r) => r.lc, num],
  ['Operation', (r) => r.op, text],
  ['Y (rotations)', (r) => r.Y, num],
  ['From', (r) => r.x1, text],
  ['To', (r) => r.x2, text],
  ['Echo', (r) => (r.echo ? 'yes' : ''), text],
  ['Solar Eclipse', (r) => r.solar ?? '', text],
  ['Lunar Eclipse', (r) => r.lunar ?? '', text],
  ['Resonance', (r) => r.tags.map((t) => t[0]).join(' · '), text],
];

/**
 * Render rows as CSV text.
 *
 * Leads with a byte-order mark. The resonance column contains "·" and the
 * ledger labels contain em-dashes, and Excel on Windows assumes the system
 * codepage for a .csv opened from the shell — without the BOM those arrive as
 * mojibake, whatever the blob's MIME type said.
 */
export function resultsToCsv(rows) {
  const lines = [COLUMNS.map(([label]) => text(label)).join(',')];
  for (const r of rows) lines.push(COLUMNS.map(([, get, fmt]) => fmt(get(r))).join(','));
  return `﻿${lines.join('\r\n')}`;
}

/** Export exactly the rows passed in — i.e. what the user can currently see. */
export function exportResultsCsv(rows) {
  downloadText(`natori-cast_${stamp()}.csv`, resultsToCsv(rows), 'text/csv;charset=utf-8');
  return rows.length;
}
