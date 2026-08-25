/**
 * Exporting the results: CSV, XLSX and PDF.
 *
 * All three render the SAME eight columns from the SAME source —
 * `processed_z_dates__sorted_by_date`. Filters are honoured; the user's chosen
 * display sort is not, because a file that reorders itself depending on which
 * column happened to be clicked is a file you cannot diff.
 *
 * v12 shipped its XLSX as an admitted three-column proof of concept and its PDF
 * through a callback state machine that drifted forty points per page and could
 * emit `<table width="NaN">`. Both are rebuilt here as real layout passes.
 */

import { zip, zlibStored } from './zip.js';
import { fmtDate, fmtDateTime } from '../core/ophis/calendar.js';
import { EVENT_SCOPE } from '../core/ophis/constants.js';
import { safeFilename } from './oph.js';

export const COLUMNS = [
  'IsoEvent', 'Date', 'Hits', 'Score', 'MSRF', 'Operations', 'ErrorStatus', 'ErrorMessage',
];

/**
 * One row per Z-Date, in the shape every exporter shares.
 */
export function toRows(isoEvent, results) {
  const hhmm = isoEvent.scope === EVENT_SCOPE.HH_MM;
  const rows = results.processed_z_dates__sorted_by_date.map((z) => {
    const msrf = z.resonance_matches
      .map((m) => m.number)
      .sort((a, b) => b - a)                       // descending
      .join(', ');
    const ops = z.operation_match_structs
      .map((m) => m.operation_result.operation_ordinal + 1)
      .sort((a, b) => a - b)                       // ascending
      .map((n) => `OP${String(n).padStart(2, '0')}`)
      .join(', ');

    return [
      isoEvent.name || '',
      hhmm ? `${fmtDateTime(z.zStart)} - ${fmtDateTime(z.zEnd)}` : fmtDate(z.zStart),
      String(z.hit_count),
      String(z.score),
      msrf || 'None',
      ops || 'None',
      '',
      '',
    ];
  });

  // The engine's own errors ride along rather than being dropped, so a file
  // exported from a failing state explains itself.
  for (const err of results.errors) {
    if (typeof err === 'string') rows.push([isoEvent.name || '', '', '', '', '', '', 'GENERAL_FAILURE', err]);
    else rows.push([isoEvent.name || '', '', '', '', '', '', err.error_status, err.error_message]);
  }

  return rows;
}

/* -------------------------------------------------------------------- CSV -- */

/** RFC 4180: quote when the value holds a comma, a quote or a newline. */
function csvCell(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCSV(isoEvent, results) {
  const lines = [COLUMNS.map(csvCell).join(',')];
  for (const row of toRows(isoEvent, results)) lines.push(row.map(csvCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

/* ------------------------------------------------------------------- XLSX -- */

const xmlEscape = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const colName = (i) => String.fromCharCode(65 + i);

/** A numeric-looking cell is written as a number so a spreadsheet can total it. */
function sheetCell(ref, value, styleId) {
  const s = String(value ?? '');
  const numeric = s !== '' && Number.isFinite(Number(s));
  const style = styleId ? ` s="${styleId}"` : '';
  return numeric
    ? `<c r="${ref}"${style}><v>${s}</v></c>`
    : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(s)}</t></is></c>`;
}

export function toXLSX(isoEvent, results) {
  const rows = toRows(isoEvent, results);

  const header = COLUMNS.map((h, i) => sheetCell(`${colName(i)}1`, h, 1)).join('');
  const bodyXml = rows
    .map((row, r) => {
      const cells = row.map((v, i) => sheetCell(`${colName(i)}${r + 2}`, v)).join('');
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join('');

  // Widths chosen from the content, not guessed: the date and the pill lists are
  // the only columns that need room.
  const widths = [22, 26, 7, 9, 30, 34, 16, 40]
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<cols>${widths}</cols>` +
    `<sheetData><row r="1">${header}</row>${bodyXml}</sheetData>` +
    `</worksheet>`;

  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
    `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="1"><border/></borders>` +
    `<cellStyleXfs count="1"><xf/></cellStyleXfs>` +
    `<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs>` +
    `</styleSheet>`;

  return zip({
    '[Content_Types].xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `</Types>`,
    '_rels/.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
    'xl/workbook.xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="Z-Dates" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet,
    'xl/styles.xml': styles,
  });
}

/* -------------------------------------------------------------------- PDF -- */

const PAGE = { w: 842, h: 595, margin: 44 }; // A4 landscape, in points
const ROWS_PER_PAGE = 15;

/** Escape for a PDF literal string, and drop anything outside WinAnsi. */
const pdfText = (s) =>
  String(s ?? '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');

class PdfBuilder {
  constructor() {
    this.objects = [''];  // 1-indexed; slot 0 is never used
  }

  add(body) {
    this.objects.push(body);
    return this.objects.length - 1;
  }

  build() {
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [0];
    let length = 0;

    const push = (bytes) => {
      parts.push(bytes);
      length += bytes.length;
    };

    push(enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));

    for (let i = 1; i < this.objects.length; i++) {
      offsets[i] = length;
      const body = this.objects[i];
      push(enc.encode(`${i} 0 obj\n`));
      if (body instanceof Uint8Array) push(body);
      else push(enc.encode(body));
      push(enc.encode('\nendobj\n'));
    }

    const xrefAt = length;
    let xref = `xref\n0 ${this.objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < this.objects.length; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${this.objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
    push(enc.encode(xref));

    return new Blob(parts, { type: 'application/pdf' });
  }
}

/** A content stream, wrapped as a Flate-compressed object. */
function streamObject(text, extra = '') {
  const raw = new TextEncoder().encode(text);
  const packed = zlibStored(raw);
  const head = new TextEncoder().encode(
    `<< /Length ${packed.length} /Filter /FlateDecode ${extra}>>\nstream\n`
  );
  const tail = new TextEncoder().encode('\nendstream');
  const out = new Uint8Array(head.length + packed.length + tail.length);
  out.set(head, 0);
  out.set(packed, head.length);
  out.set(tail, head.length + packed.length);
  return out;
}

/**
 * Build the PDF.
 *
 * @param {object} isoEvent
 * @param {object} results
 * @param {{jpeg?: {bytes: Uint8Array, width: number, height: number}}} [assets]
 *        the chart, already encoded as JPEG by the caller (canvas can do it, and
 *        /DCTDecode takes the bytes straight)
 */
export function toPDF(isoEvent, results, assets = {}) {
  const pdf = new PdfBuilder();
  const rows = toRows(isoEvent, results);

  const catalog = pdf.add('');   // reserved: filled once the page list is known
  const pagesObj = pdf.add('');
  const font = pdf.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = pdf.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let imageObj = null;
  if (assets.jpeg) {
    const { bytes, width, height } = assets.jpeg;
    const head = new TextEncoder().encode(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`
    );
    const tail = new TextEncoder().encode('\nendstream');
    const blob = new Uint8Array(head.length + bytes.length + tail.length);
    blob.set(head, 0);
    blob.set(bytes, head.length);
    blob.set(tail, head.length + bytes.length);
    imageObj = pdf.add(blob);
  }

  const pageIds = [];
  const addPage = (content, withImage = false) => {
    const stream = pdf.add(streamObject(content));
    const xobject = withImage && imageObj ? `/XObject << /Im0 ${imageObj} 0 R >>` : '';
    const page = pdf.add(
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] ` +
      `/Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> ${xobject} >> ` +
      `/Contents ${stream} 0 R >>`
    );
    pageIds.push(page);
  };

  /* ---- page 1: what this is ---- */
  const L = PAGE.margin;
  let y = PAGE.h - PAGE.margin;
  const line = (text, size = 10, bold = false, gap = 15) => {
    const out = `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${L} ${y} Tm (${pdfText(text)}) Tj ET\n`;
    y -= gap;
    return out;
  };

  let p1 = '';
  p1 += line('OPHIS - Z-Date Projection Report', 22, true, 30);
  p1 += line(`Iso-Event: ${isoEvent.name || '(unnamed)'}`, 12, true, 22);
  p1 += line(`${rows.length} projections, filtered from ${Object.keys(results.z_structs).length} distinct dates.`, 10, false, 24);

  p1 += line('The controls', 13, true, 18);
  for (const [i, x] of isoEvent.x_dates.entries()) {
    p1 += line(
      `X${i + 1}   ${String(x.m).padStart(2, '0')}/${String(x.d).padStart(2, '0')}/${x.y}` +
      `${x.enabled ? '' : '   (disabled)'}`,
      10, false, 13
    );
  }
  y -= 10;

  p1 += line('How to read this', 13, true, 18);
  for (const text of [
    'Y is the distance between two controls, measured in axial rotations of the Earth.',
    'Every operation turns one Y into a day-offset and projects a Z-Date from one of the two controls.',
    'Hits counts the operations that reached a date plus the MSRF numbers it matched.',
    'Score weights those: each operation contributes its own weight, and the strongest MSRF',
    'match multiplies the total rather than adding to it.',
    'MSRF numbers are the Multidimensional Spatial Recognition Filters - Normal, Important and Vortex.',
  ]) p1 += line(text, 10, false, 13);

  y -= 12;
  p1 += line(
    'A study instrument. Projections are arithmetic on the dates supplied, not predictions of events.',
    9, false, 12
  );
  addPage(p1);

  /* ---- page 2: the chart ---- */
  if (imageObj) {
    const maxW = PAGE.w - PAGE.margin * 2;
    const maxH = PAGE.h - PAGE.margin * 2 - 30;
    const { width, height } = assets.jpeg;
    const scale = Math.min(maxW / width, maxH / height);
    const w = width * scale;
    const h = height * scale;
    const x = (PAGE.w - w) / 2;
    y = PAGE.h - PAGE.margin;
    let p2 = line('The timeline', 14, true, 24);
    p2 += `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(y - h).toFixed(2)} cm /Im0 Do Q\n`;
    addPage(p2, true);
  }

  /* ---- pages 3+: the table ---- */
  const widths = [96, 128, 40, 48, 150, 176, 0, 0];
  const heads = COLUMNS.slice(0, 6);

  for (let start = 0; start < rows.length; start += ROWS_PER_PAGE) {
    const slice = rows.slice(start, start + ROWS_PER_PAGE);
    y = PAGE.h - PAGE.margin;
    let page = line(
      `Z-Dates  ${start + 1}-${Math.min(start + ROWS_PER_PAGE, rows.length)} of ${rows.length}`,
      13, true, 26
    );

    // Header row, then a rule under it — a real layout pass, so nothing drifts.
    let x = L;
    for (const [i, h] of heads.entries()) {
      page += `BT /F2 9 Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(h)}) Tj ET\n`;
      x += widths[i];
    }
    y -= 6;
    page += `${L} ${y} m ${PAGE.w - PAGE.margin} ${y} l 0.6 w S\n`;
    y -= 16;

    for (const row of slice) {
      x = L;
      for (let i = 0; i < heads.length; i++) {
        // Truncate to the column rather than letting it run into the next one.
        const room = Math.floor(widths[i] / 4.6);
        const cell = String(row[i] ?? '');
        const text = cell.length > room ? `${cell.slice(0, Math.max(1, room - 1))}…` : cell;
        page += `BT /F1 9 Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(text)}) Tj ET\n`;
        x += widths[i];
      }
      y -= 17;
    }
    addPage(page);
  }

  pdf.objects[pagesObj] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  pdf.objects[catalog] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;

  return pdf.build();
}

/** The filename all three share, minus the extension. */
export const exportBasename = (isoEvent) => safeFilename(isoEvent.name || 'Z-Dates', 'Z-Dates');
