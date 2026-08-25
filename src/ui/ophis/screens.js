/**
 * The screens other than the working surface.
 *
 * Each exports one `render(host)` and owns nothing outside it, so a screen that
 * throws costs you that screen rather than the application.
 */

import { el, replace } from '../dom.js';
import {
  state, currentEvent, touch, markDirty, recalculate, adoptDocument, log,
} from '../../state/ophis-store.js';
import { compileOperation, validateOperation, getReckoning } from '../../core/equation/index.js';
import { OPHIS_PACKS, packOperations, newOperation } from '../../data/packs-ophis.js';
import {
  SCORING_SYSTEM, SAMPLE_Y_VALUE_FOR_VALIDATION, EVENT_SCOPE,
} from '../../core/ophis/constants.js';
import { operationClass } from '../../core/ophis/scoring.js';
import { round1, round2, intToDecimalString } from '../../core/ophis/numeric.js';
import { fmtDate } from '../../core/ophis/calendar.js';
import { clampDayStart, makeIsoEvent } from '../../state/iso-event.js';
import { parseDocument, serialiseDocument, VALIDATION } from '../../io/oph.js';
import { toCSV, toXLSX, toPDF, exportBasename } from '../../io/export-results.js';
import { download } from '../../io/download.js';
import {
  MSRF_FILTER__NORMAL, MSRF_FILTER__IMPORTANT, MSRF_FILTER__VORTEX,
} from '../../data/msrf-ophis.js';
import { toast, confirmDialog } from './shell.js';

const section = (title, children) =>
  el('section.panel', {}, [
    el('header', {}, [el('h3', { text: title })]),
    el('div.body', {}, children),
  ]);

/* ------------------------------------------------------ operations editor -- */

export function renderOperations(host) {
  const ev = currentEvent();

  const rows = ev.operations.map((op, i) => {
    const check = el('input', {
      type: 'checkbox',
      'aria-label': `Enable operation ${i + 1}`,
      onchange: (e) => { op.enabled = e.target.checked; touch(); },
    });
    check.checked = op.enabled;

    const status = el('span', { style: 'font-family:var(--font-mono);font-size:10px;min-width:112px' });
    const paint = () => {
      const v = validateOperation(op.equation, 'ophis');
      if (v.ok) {
        const z = compileOperation(op.equation, 'ophis').fn(SAMPLE_Y_VALUE_FOR_VALIDATION);
        status.textContent = `Z=${round2(z)}`;
        status.style.color = 'var(--green)';
        status.removeAttribute('title');
      } else {
        status.textContent = 'Error';
        status.style.color = 'var(--red)';
        status.title = v.error;   // cleared above the moment it becomes valid
      }
    };
    paint();

    return el('div.row', { data: { off: String(!op.enabled) } }, [
      check,
      el('span.tag', { text: `O${i + 1}` }),
      el('input', {
        type: 'text',
        class: 'mono',
        value: op.equation,
        spellcheck: 'false',
        'aria-label': `Operation ${i + 1} equation`,
        style: 'flex:1 1 220px',
        oninput: (e) => { op.equation = e.target.value; paint(); markDirty(); },
        onchange: () => touch(),
      }),
      el('input', {
        type: 'number',
        step: '0.5',
        min: '0.5',
        value: String(op.weight),
        'aria-label': `Operation ${i + 1} weight`,
        style: 'flex:0 0 74px',
        onchange: (e) => {
          const w = Number(e.target.value);
          // Invalid or non-positive coerces to 0.5, and the field is corrected
          // rather than left showing text the model rejected.
          op.weight = Number.isFinite(w) && w > 0 ? w : 0.5;
          e.target.value = String(op.weight);
          touch();
        },
      }),
      el('span', {
        style: `font-size:10px;min-width:44px;color:var(--${operationClass(op) === 'Alpha' ? 'gold' : 'cyan'})`,
        text: operationClass(op),
      }),
      status,
      el('button.btn.icon.sm.danger', {
        type: 'button',
        text: '✕',
        title: `Delete operation ${i + 1}`,
        onclick: () => {
          if (ev.operations.length <= 1) {
            toast('At least 1 Operation is required.');
            return;
          }
          ev.operations.splice(i, 1);
          touch();
        },
      }),
    ]);
  });

  replace(host, [
    section('The operation table', [
      el('p.note', {
        text:
          'Every operation starts X1+ or X2+ — which control the offset is added to — followed by ' +
          'arithmetic on Y. Weight feeds the score verbatim: at or above 1 the operation is Alpha, ' +
          'below it Beta. Ordinal order is load-bearing; inserting a row renumbers everything after it.',
      }),
      el('div.rowlist.full', {}, rows),
      el('div.btnrow', {}, [
        el('button.btn.primary', {
          type: 'button', text: '+ Operation',
          onclick: () => { ev.operations.push(newOperation()); touch(); },
        }),
        ...Object.values(OPHIS_PACKS).map((pack) =>
          el('button.btn', {
            type: 'button',
            text: pack.label,
            title: pack.note,
            onclick: async () => {
              const ok = await confirmDialog({
                title: `Load ${pack.label}?`,
                body: [pack.note, 'This replaces the current operation table.'],
                cancel: 'NO, keep mine',
                confirm: 'YES, load it',
              });
              if (!ok) return;
              ev.operations = packOperations(pack.id);
              touch();
              toast(`Loaded ${pack.label}`);
            },
          })
        ),
      ]),
    ]),

    section('Scoring system', [
      el('p.note', {
        text:
          'v8 multiplies: the strongest resonance match multiplies the base score instead of adding ' +
          'to it, and is withheld from the points sum. v7 simply adds everything. The original could ' +
          'only ever reach v8 — its importer coerced every other value — but files carrying v7 exist.',
      }),
      el('div.segmented', {}, [
        [SCORING_SYSTEM.GTE_V8, 'v8 · multiplying'],
        [SCORING_SYSTEM.LTE_V7, 'v7 · additive'],
      ].map(([id, label]) =>
        el('button', {
          type: 'button', text: label,
          'aria-pressed': String(ev.scoring_system === id),
          onclick: () => { ev.scoring_system = id; touch(); },
        })
      )),
    ]),

    section('Constants and functions', [
      el('p.note', { text: 'Available inside any equation in this reckoning.' }),
      el('div.doc', {}, [
        el('dl', {}, Object.entries(getReckoning('ophis').constants).flatMap(([k, v]) => [
          el('dt', { text: k }),
          el('dd', { text: `${v}  —  ${getReckoning('ophis').constantNotes[k] ?? ''}` }),
        ])),
        el('dl', { style: 'margin-top:16px' }, Object.keys(getReckoning('ophis').functions).flatMap((k) => [
          el('dt', { text: `${k}()` }),
          el('dd', { text: getReckoning('ophis').functionNotes[k] ?? '' }),
        ])),
        el('p.note', {
          style: 'margin-top:14px',
          text:
            'x and × are multiplication, which is why no name may contain a lowercase x. oph_exp is ' +
            'listed because the original declared it, but it can never be called: the name lexes as ' +
            'oph_e × p. The original had the same hole from the other direction.',
        }),
      ]),
    ]),
  ]);
}

/* ---------------------------------------------------------- event settings -- */

export function renderSettings(host) {
  const ev = currentEvent();
  const start = new Date(clampDayStart(ev.day_scope_start_time_in_millis));
  const hhmm = `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;

  replace(host, [
    section('S1 · Misc. notes', [
      el('p.note', { text: 'Free text. Notes never affect results, so editing them does not trigger a recalculation.' }),
      el('textarea', {
        value: ev.notes,
        'aria-label': 'Notes',
        oninput: (e) => { ev.notes = e.target.value; markDirty(); },
      }),
    ]),

    section('S2 · Day scope event start time', [
      el('p.note', {
        text:
          'The hour at which a day is considered to begin, in Days scope. The picker runs at 0,0 — ' +
          'UTC — deliberately: switching it to browser-local would silently break the round trip, ' +
          'because the saved value is an offset in milliseconds and carries no timezone.',
      }),
      el('div.field', { style: 'max-width:180px' }, [
        el('label', { text: 'Starts at' }),
        el('input', {
          type: 'time',
          value: hhmm,
          disabled: ev.scope !== EVENT_SCOPE.DAYS,
          onchange: (e) => {
            const [h, m] = String(e.target.value || '00:00').split(':').map(Number);
            ev.day_scope_start_time_in_millis = clampDayStart((h * 60 + m) * 60_000);
            touch();
          },
        }),
      ]),
      ev.scope !== EVENT_SCOPE.DAYS
        ? el('p.note', { style: 'color:var(--warn)', text: 'Only meaningful in Days scope.' })
        : null,
    ]),
  ]);
}

/* ------------------------------------------------------------ data transfer -- */

const SWAP_CATEGORIES = [
  ['name', 'Name'],
  ['scope', 'Scope'],
  ['location', 'Location'],
  ['x_dates', 'X-Dates'],
  ['filters', 'Filters'],
  ['t_dates', 'T-Dates'],
  ['operations', 'Operations'],
  ['chart', 'Chart Config'],
  ['notes', 'Notes'],
  ['start_time', 'S2 Start Time'],
];

/** Swap selection lives here, in UI state — never on the event, as v12 had it. */
const swapState = { source: 0, targets: new Set(), categories: new Set(['x_dates']) };

export function renderSwap(host) {
  const events = state.document.iso_events;
  if (swapState.source >= events.length) swapState.source = 0;

  const sourceRows = events.map((ev, i) => {
    const radio = el('input', {
      type: 'radio', name: 'swapSource', 'aria-label': `Source: ${ev.name}`,
      onchange: () => {
        // Promote the old source to a target when everything else already was.
        const others = events.map((_, k) => k).filter((k) => k !== swapState.source);
        if (others.every((k) => swapState.targets.has(k))) swapState.targets.add(swapState.source);
        swapState.source = i;
        swapState.targets.delete(i);
        renderSwap(host);
      },
    });
    radio.checked = swapState.source === i;
    return el('div.row', { data: { current: String(swapState.source === i) } }, [
      radio, el('span.tag', { text: `E${i + 1}` }), el('div.grow', { text: ev.name }),
    ]);
  });

  const targetRows = events.map((ev, i) => {
    const isSource = i === swapState.source;
    const box = el('input', {
      type: 'checkbox',
      disabled: isSource,
      'aria-label': `Target: ${ev.name}`,
      onchange: (e) => {
        if (e.target.checked) swapState.targets.add(i);
        else swapState.targets.delete(i);
        renderSwap(host);
      },
    });
    box.checked = swapState.targets.has(i);
    return el('div.row', { data: { off: String(isSource) } }, [
      box, el('span.tag', { text: `E${i + 1}` }), el('div.grow', { text: ev.name }),
    ]);
  });

  const catRows = SWAP_CATEGORIES.map(([key, label]) => {
    const box = el('input', {
      type: 'checkbox',
      onchange: (e) => {
        if (e.target.checked) swapState.categories.add(key);
        else swapState.categories.delete(key);
        renderSwap(host);
      },
    });
    box.checked = swapState.categories.has(key);
    return el('label.check', {}, [box, el('span', { text: label })]);
  });

  const canApply = swapState.targets.size > 0 && swapState.categories.size > 0;

  replace(host, [
    el('p.note', {
      text: 'This screen makes it easy to apply Settings from one Iso-Event to one or more other Iso-Events.',
    }),
    el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px' }, [
      section('Source event', [el('div.rowlist', {}, sourceRows)]),
      section('Data', catRows),
      section('Target events', [el('div.rowlist', {}, targetRows)]),
    ]),
    el('div.btnrow', { style: 'margin-top:16px' }, [
      el('button.btn.primary', {
        type: 'button',
        text: `Apply to ${swapState.targets.size} event${swapState.targets.size === 1 ? '' : 's'}`,
        disabled: !canApply,
        onclick: () => {
          const src = events[swapState.source];
          for (const i of swapState.targets) {
            const dst = events[i];
            const c = swapState.categories;
            if (c.has('name')) dst.name = `${src.name} (copy)`;
            if (c.has('scope')) dst.scope = src.scope;
            if (c.has('location')) { dst.lat = src.lat; dst.long = src.long; }
            if (c.has('x_dates')) dst.x_dates = structuredClone(src.x_dates);
            if (c.has('t_dates')) dst.t_dates = structuredClone(src.t_dates);
            if (c.has('operations')) dst.operations = structuredClone(src.operations);
            if (c.has('notes')) dst.notes = src.notes;
            if (c.has('start_time')) dst.day_scope_start_time_in_millis = src.day_scope_start_time_in_millis;
            if (c.has('filters')) {
              for (const k of Object.keys(dst)) if (k.startsWith('iso_event_filter_')) dst[k] = src[k];
            }
            if (c.has('chart')) {
              for (const k of Object.keys(dst)) if (k.startsWith('chart_option__')) dst[k] = src[k];
            }
            // A target that is not in HH:MM has no use for coordinates. The
            // source keeps its own either way.
            if (dst.scope !== EVENT_SCOPE.HH_MM) { dst.lat = 0; dst.long = 0; dst.location_enabled = false; }
          }
          toast(`Applied to ${swapState.targets.size} event${swapState.targets.size === 1 ? '' : 's'}`);
          touch();
        },
      }),
    ]),
  ]);
}

/* -------------------------------------------------------------- import/export -- */

export function renderImport(host) {
  const area = el('textarea', {
    'aria-label': 'Pasted document',
    style: 'min-height:220px;font-family:var(--font-mono);font-size:12px',
    placeholder: '{ "app_version": "…", "iso_events": [ … ] }',
  });
  const errors = el('div', {});

  replace(host, [
    section('Paste previously exported code', [
      el('p.note', { text: 'Accepts a full document or a bare array of events. Nothing is applied until you press Load.' }),
      area,
      errors,
      el('div.btnrow', { style: 'margin-top:12px' }, [
        el('button.btn.primary', {
          type: 'button',
          text: 'Load',
          onclick: async () => {
            const parsed = parseDocument(area.value, VALIDATION.LOOSE);
            if (!parsed.document) {
              // Errors render inline, as a list — not as a toast that vanishes.
              replace(errors, [
                el('div.banner', {}, [
                  el('div', {}, [
                    el('b', { text: 'Could not load this document.' }),
                    el('ul', {}, parsed.errors.map((e) => el('li', { text: e }))),
                  ]),
                ]),
              ]);
              return;
            }
            replace(errors, []);
            if (!state.saved) {
              const ok = await confirmDialog({
                title: 'You have unsaved changes.',
                body: 'Are you sure you want to overwrite them?',
                cancel: "NO, don't overwrite",
                confirm: 'YES, overwrite',
                danger: true,
              });
              if (!ok) return;
            }
            adoptDocument(parsed.document);
            for (const w of parsed.warnings) log('import', w);
            toast(`Loaded ${parsed.document.iso_events.length} event(s)` +
              (parsed.warnings.length ? ` · ${parsed.warnings.length} warning(s) in the log` : ''));
          },
        }),
        el('button.btn', { type: 'button', text: 'Clear', onclick: () => { area.value = ''; replace(errors, []); } }),
      ]),
    ]),
  ]);
}

export function renderExport(host) {
  const opts = state.options;
  const pre = el('pre.blob');

  const paint = () => {
    pre.textContent = serialiseDocument(state.document, {
      prettify: opts.prettify_oph_files,
      minify: opts.minify_oph_files,
    });
  };
  paint();

  const flag = (key, label, onBefore) => {
    const box = el('input', {
      type: 'checkbox',
      onchange: async (e) => {
        if (e.target.checked && onBefore && !(await onBefore())) {
          e.target.checked = false;
          return;
        }
        opts[key] = e.target.checked;
        paint();
      },
    });
    box.checked = opts[key];
    return el('label.check', {}, [box, el('span', { text: label })]);
  };

  replace(host, [
    section('Paste into any text editor', [
      el('div.btnrow', { style: 'margin-bottom:12px' }, [
        flag('prettify_oph_files', 'Prettify'),
        flag('minify_oph_files', 'Minify', async () =>
          confirmDialog({
            title: 'Enable minifying?',
            body:
              'WARNING: Minifying means that all settings, operations, and other configuration which ' +
              'match current program defaults will be removed from the file. If defaults ever change ' +
              'in a future version and you open your file in that version, it will use the newer ' +
              'defaults, which can result in different output.',
            cancel: 'NO, do not enable minifying',
            confirm: 'YES, enable minifying',
            danger: true,
          })
        ),
      ]),
      pre,
      el('div.btnrow', { style: 'margin-top:12px' }, [
        el('button.btn', {
          type: 'button', text: 'Copy',
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(pre.textContent);
              toast('Copied to clipboard!');
            } catch {
              toast('The browser would not allow a clipboard write.');
            }
          },
        }),
        el('button.btn.primary', {
          type: 'button', text: 'Export file',
          onclick: () => {
            download(new Blob([pre.textContent], { type: 'application/json' }), 'Export.oph');
            state.saved = true;
            toast('Wrote Export.oph');
          },
        }),
      ]),
    ]),
  ]);
}

/* ------------------------------------------------------------- export z-dates -- */

export function renderZExport(host) {
  const ev = currentEvent();
  const r = state.results;
  const ready = r && r.processed_z_dates.length > 0;
  const base = exportBasename(ev);

  const btn = (label, note, run) =>
    el('div.row', {}, [
      el('div.grow', {}, [el('b', { text: label }), el('div.sub', { text: note })]),
      el('button.btn.primary', { type: 'button', text: 'Export', disabled: !ready, onclick: run }),
    ]);

  replace(host, [
    section('Export Z-Dates', [
      el('p.note', {
        text:
          'All three formats carry the same eight columns and the same rows: filters are honoured, ' +
          'and the order is always by date rather than by whichever column you last sorted on.',
      }),
      !ready ? el('p.note', { style: 'color:var(--warn)', text: 'Nothing to export yet — cast the event first.' }) : null,

      el('div.rowlist.tall', {}, [
        btn('CSV', 'RFC-4180 quoted. Opens anywhere.', () => {
          download(new Blob([toCSV(ev, r)], { type: 'text/csv' }), `${base}.csv`);
          toast(`Wrote ${base}.csv`);
        }),
        btn('XLSX', 'A real workbook: frozen bold header, column widths, numbers as numbers.', async () => {
          download(await toXLSX(ev, r), `${base}.xlsx`);
          toast(`Wrote ${base}.xlsx`);
        }),
        btn('PDF', 'Landscape A4: the method, the chart, then the table at 15 rows a page.', async () => {
          // Grab the chart as a JPEG so /DCTDecode can take the bytes directly.
          let jpeg = null;
          const canvas = document.getElementById('timeline');
          if (canvas && canvas.width) {
            const url = canvas.toDataURL('image/jpeg', 0.86);
            const bin = atob(url.split(',')[1]);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            jpeg = { bytes, width: canvas.width, height: canvas.height };
          }
          download(await toPDF(ev, r, { jpeg }), `${base}.pdf`);
          toast(`Wrote ${base}.pdf`);
        }),
      ]),
    ]),
  ]);
}

/* -------------------------------------------------------------------- audit -- */

export function renderAudit(host) {
  const r = state.results;
  const ev = currentEvent();

  const logFeed = section('Activity log', [
    el('p.note', {
      text:
        'Every warning, coercion, clamp and dropped record lands here. Toasts are mirrored into it, ' +
        'so a message that has faded is never a message you cannot get back.',
    }),
    state.activity.length
      ? el('div.logfeed', {}, state.activity.slice(0, 200).map((a) =>
          el('div.logline', {}, [
            el('time', { text: a.at.slice(11, 19) }),
            el('span.kind', { text: a.kind }),
            el('p', { text: a.message }),
          ])
        ))
      : el('p.note', { style: 'color:var(--faint)', text: 'Nothing logged yet.' }),
  ]);

  if (!r) {
    replace(host, [el('p.note', { text: 'Cast the event first — there is nothing to audit yet.' }), logFeed]);
    return;
  }

  // The row the user clicked, or the best-scoring one.
  const target =
    r.processed_z_dates.find((z) => z.key === state.auditKey) ??
    r.processed_z_dates.slice().sort((a, b) => b.score - a.score)[0];

  const yTable = section('Y-structs', [
    el('p.note', { text: 'Every unordered pair of enabled controls, in the order the engine emits them.' }),
    el('div.tablewrap', {}, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, ['', 'X₁', 'X₂', 'Y', 'Results'].map((h) => el('th', { scope: 'col', text: h })))]),
        el('tbody', {}, r.y_structs.map((ys) =>
          el('tr', {}, [
            el('td.zlabel', { text: `y${ys.y_ordinal}` }),
            el('td.mono', { text: `X${ys.x_1_ordinal + 1}  ${fmtDate(ys.x_1_instant)}` }),
            el('td.mono', { text: `X${ys.x_2_ordinal + 1}  ${fmtDate(ys.x_2_instant)}` }),
            el('td.num', { text: intToDecimalString(ys.rotation_count_y) }),
            el('td.num', { text: String(ys.operation_results.length) }),
          ])
        )),
      ]),
    ]),
  ]);

  const derivation = target
    ? section(`Score derivation for Z${target.z_ordinal + 1} · ${fmtDate(target.zStart)}`, [
        el('div.doc', {}, [
          el('dl', {}, [
            el('dt', { text: 'operations' }),
            el('dd', {
              text: `${target.operation_match_structs
                .map((m) => `O${m.operation_result.operation_ordinal + 1} (${ev.operations[m.operation_result.operation_ordinal]?.weight ?? '?'})`)
                .join('  +  ')}   =  ${target.operation_score}`,
            }),
            el('dt', { text: 'resonance' }),
            el('dd', {
              text: target.resonance_matches.length
                ? target.resonance_matches
                    .map((m) => `${m.label} (×${m.multiplier}, ${m.points} pt)`)
                    .join('   ')
                : 'none',
            }),
            el('dt', { text: 'multiplier M' }),
            el('dd', {
              text: `max(${target.resonance_matches.map((m) => m.multiplier).join(', ') || '—'}) = ${target.score_multiplier}`,
            }),
            el('dt', { text: 'subscore' }),
            el('dd', {
              text:
                `sum(points) minus the first match carrying M  =  ${target.resonance_subscore}`,
            }),
            el('dt', { text: 'base' }),
            el('dd', { text: `${target.operation_score} + ${target.resonance_subscore} = ${round2(target.base_score_pre_multiply)}` }),
            el('dt', { text: 'score' }),
            el('dd', { text: `round2(${round2(target.base_score_pre_multiply)} × ${target.score_multiplier}) = ${target.score}` }),
            el('dt', { text: 'hits' }),
            el('dd', { text: `${target.operation_hit_count} operations + ${target.resonance_matches.length} resonance = ${target.hit_count}` }),
          ]),
        ]),
      ])
    : null;

  const opTable = target
    ? section('The operations that reached it', [
        el('div.tablewrap', {}, [
          el('table', {}, [
            el('thead', {}, [
              el('tr', {}, ['Op', 'Equation', 'Type', 'Anchor', 'Y', 'Z-Value', 'rot_z', 'Z-Date']
                .map((h) => el('th', { scope: 'col', text: h }))),
            ]),
            el('tbody', {}, target.operation_match_structs.map((m) => {
              const o = m.operation_result;
              const op = ev.operations[o.operation_ordinal];
              return el('tr', {}, [
                el('td.zlabel', { text: `O${o.operation_ordinal + 1}` }),
                el('td.mono', { text: o.operation.equation }),
                el('td', { text: operationClass(op) }),
                el('td.mono', { text: `${o.anchor} ${fmtDate(o.x_instant_base)}` }),
                el('td.num', { text: intToDecimalString(o.rotation_count_y) }),
                el('td.num', { text: String(o.z_value) }),
                el('td.num', { text: intToDecimalString(o.rotation_count_z) }),
                el('td.mono', { text: fmtDate(o.z_start) }),
              ]);
            })),
          ]),
        ]),
      ])
    : null;

  const diagnostics = section('Diagnostics', [
    r.diagnostics.length
      ? el('div.doc', {}, [
          el('dl', {}, r.diagnostics.flatMap((d) => [
            el('dt', { text: d.kind }),
            el('dd', { text: `${d.detail}${d.count > 1 ? `  (×${d.count})` : ''}` }),
          ])),
        ])
      : el('p.note', { style: 'color:var(--green)', text: 'Clean — nothing was clamped, coerced or dropped.' }),
  ]);

  replace(host, [
    el('p.note', {
      text: 'Click any row in the results table to audit it here.',
    }),
    derivation, opTable, yTable, diagnostics, logFeed,
  ]);
}

/* -------------------------------------------------------------------- about -- */

export function renderAbout(host) {
  const tierList = (title, numbers, cls) =>
    section(title, [
      el('p.note', { text: `${numbers.length} numbers.` }),
      el('div.pills', { style: 'max-height:180px' },
        numbers.map((n) => el('span', { class: `pill ${cls}`, text: String(n) }))),
    ]);

  replace(host, [
    el('div.doc', {}, [
      el('h2', { text: 'What this is' }),
      el('p', {
        text:
          'Ophis is a relativity-based date-projection instrument. You give it two or more dates on ' +
          'which similar events occurred; it measures the distance between every pair of them in ' +
          'axial rotations of the Earth, runs each distance through a table of operations, and ' +
          'projects the results forward. The filters then remove the projections that bear no ' +
          'arithmetic relationship to the controls.',
      }),

      el('h2', { text: 'How a score is built' }),
      el('p', {
        text:
          'Each operation that reaches a date contributes its own weight in points. Each MSRF number ' +
          'the date matches contributes its tier points — except the strongest, which instead ' +
          'multiplies the total. The multiplier is a maximum, never a product: ten Important matches ' +
          'still multiply once.',
      }),

      el('h2', { text: 'Protocol Prime' }),
      el('p', {
        text:
          'The author’s flow chart takes three controls, not two: the two historical dates, and ' +
          'the date the projection is being conducted on. That third control produces two more spans ' +
          'and triples the projections — fourteen operations across three spans give the forty-two ' +
          'future dates the chart describes. The original never mentioned it; here, the X-Dates ' +
          'panel has a one-click ☉ Today button for it.',
      }),

      el('h2', { text: 'What is deliberately different' }),
      el('p', {
        text:
          'Equations are parsed and walked as a syntax tree rather than handed to the JavaScript ' +
          'compiler, so a crafted file cannot run code. Exports go through the browser’s own save ' +
          'dialog rather than writing to a path the file chose. There is no sign-in, because a local ' +
          'offline instrument has nobody to authenticate to. "Today" is read from the clock rather ' +
          'than baked in.',
      }),

      el('h2', { text: 'Security' }),
      el('p', { text: 'Zero external resources. Everything loads locally, and nothing leaves the page.' }),
    ]),

    tierList('MSRF · Normal', MSRF_FILTER__NORMAL, 'normal'),
    tierList('MSRF · Important', MSRF_FILTER__IMPORTANT, 'important'),
    tierList('MSRF · Vortex', MSRF_FILTER__VORTEX, 'vortex'),

    el('div.doc', { style: 'margin-top:20px' }, [
      el('h2', { text: 'Provenance' }),
      el('p', {
        text:
          'A ground-up rebuild of Ophis v12, reverse-engineered with the owner’s permission and ' +
          'verified against the original: the operation outputs, the resonance classification, the ' +
          'scoring arithmetic and a complete end-to-end cast are pinned by the test suite.',
      }),

      el('h2', { text: 'Further reading' }),
      el('div.btnrow', {}, [
        el('a.btn', { href: 'field-guide.html', text: 'Field Guide' }),
        el('a.btn', { href: 'whitepaper.html', text: 'White Paper' }),
        el('a.btn', { href: 'docs/html/index.html', text: 'All documentation' }),
      ]),
      el('p', {
        style: 'margin-top:12px',
        text:
          'The Field Guide is a ten-minute tour and the fastest way to learn what the numbers mean. ' +
          'It also explains Protocol Prime — the reason the X-Dates panel carries a ☉ Today button.',
      }),
    ]),
  ]);
}
