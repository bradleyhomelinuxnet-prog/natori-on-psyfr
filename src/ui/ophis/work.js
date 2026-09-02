/**
 * The working surface — the control rail.
 *
 * The original stacked four panels above the output table, each sized to show
 * two rows and each independently scrollable. That is reproduced here as a
 * single scrolling rail beside the output instead: the same panels, the same
 * controls, but the results stay on screen while you change what feeds them,
 * which is the thing you actually want to watch.
 *
 * Every list with checkable children has a master checkbox that goes
 * indeterminate when the children disagree.
 */

import { el, replace } from '../dom.js';
import {
  state, currentEvent, touch, markDirty, notify, recalculate, selectEvent,
  addEvent, removeEvent, cloneEvent, now,
} from '../../state/ophis-store.js';
import { makeXDate, parseXDate, CHART_OPTIONS, clampDayStart } from '../../state/iso-event.js';
import { FILTER_ROWS, FILTER_DEFAULTS } from '../../core/ophis/filters.js';
import { EVENT_SCOPE, MILLIS_PER_DAY, LAT_LIMIT } from '../../core/ophis/constants.js';
import { fmtDate, toInstant } from '../../core/ophis/calendar.js';
import { sunsetMs, roundToNearestMinute } from '../../core/ophis/sun.js';
import { pickCoordinate } from '../../core/ophis/mercator.js';
import { toast, confirmDialog } from './shell.js';
import { openMapPicker } from './map.js';

/** A panel with a header cap and a body. */
function panel(title, { count, actions = [], body }) {
  return el('section.panel', {}, [
    el('header', {}, [
      el('h3', {}, [title, count ? el('span.count', { text: count }) : null]),
      el('div.spacer', {}, actions),
    ]),
    el('div.body', {}, body),
  ]);
}

/**
 * A master checkbox for a list.
 *
 * Mutates every child and lets the re-render redraw the boxes, rather than
 * poking each child's DOM — so the model stays the single source of truth.
 */
function master(items, apply, label) {
  const on = items.filter((i) => i.enabled).length;
  const box = el('input', {
    type: 'checkbox',
    'aria-label': label,
    onchange: (e) => {
      apply(e.target.checked);
      touch();
    },
  });
  box.checked = items.length > 0 && on === items.length;
  box.indeterminate = on > 0 && on < items.length;
  return box;
}

const iconBtn = (glyph, label, onclick, extra = '') =>
  el('button', {
    type: 'button',
    class: `btn icon sm${extra ? ` ${extra}` : ''}`,
    text: glyph,
    title: label,
    'aria-label': label,
    onclick,
  });

/* --------------------------------------------------------------- iso-events -- */

function isoEventsPanel() {
  const events = state.document.iso_events;

  const rows = events.map((ev, i) => {
    const current = i === state.currentEventIndex;
    const radio = el('input', {
      type: 'radio',
      name: 'isoEvent',
      'aria-label': `Select ${ev.name}`,
      onchange: () => selectEvent(i),
    });
    radio.checked = current;

    return el('div.row', { data: { current: String(current) } }, [
      radio,
      el('span.tag', { text: `E${i + 1}` }),
      el('div.grow', {}, [
        el('input', {
          type: 'text',
          value: ev.name,
          'aria-label': `Name of event ${i + 1}`,
          oninput: (e) => {
            ev.name = e.target.value;
            markDirty();
          },
        }),
        el('div.sub', {
          text: `${ev.x_dates.length} X-Date${ev.x_dates.length === 1 ? '' : 's'} · ${
            ev.scope === EVENT_SCOPE.HH_MM ? 'HH:MM' : 'Days'
          }`,
        }),
      ]),
      iconBtn('⧉', `Clone ${ev.name}`, () => cloneEvent(i)),
      iconBtn('✕', `Delete ${ev.name}`, async () => {
        if (events.length <= 1) {
          toast('The document must keep at least one event.');
          return;
        }
        const ok = await confirmDialog({
          title: `Delete ${ev.name}?`,
          body: 'Its anchors, operations and filters go with it. This cannot be undone.',
          cancel: 'NO, keep it',
          confirm: 'YES, delete',
          danger: true,
        });
        if (ok) removeEvent(i);
      }, 'danger'),
    ]);
  });

  return panel('Iso-Events', {
    count: `${events.length}`,
    actions: [el('button.btn.sm', { type: 'button', text: '+ Add', onclick: addEvent })],
    body: [
      el('p.note', {
        text:
          'An Iso-Event — Isometric Event — is an event that has repeated itself two or more ' +
          'times in the past, and will likely repeat again.',
      }),
      el('div.rowlist', {}, rows),
    ],
  });
}

/* ------------------------------------------------------------------ anchors -- */

/**
 * One date list. X-Dates and T-Dates are the same shape and differ only in what
 * they are for, so they share a renderer.
 */
function datesPanel({ key, title, note, addLabel }) {
  const ev = currentEvent();
  const list = ev[key];
  const hhmm = ev.scope === EVENT_SCOPE.HH_MM;
  const prefix = key === 'x_dates' ? 'X' : 'T';

  const rows = list.map((x, i) => {
    const box = el('input', {
      type: 'checkbox',
      'aria-label': `Enable ${prefix}${i + 1}`,
      onchange: (e) => {
        x.enabled = e.target.checked;
        touch();
      },
    });
    box.checked = x.enabled;

    const dateField = el('input', {
      type: 'text',
      class: 'mono',
      value: `${String(x.m).padStart(2, '0')}/${String(x.d).padStart(2, '0')}/${x.y}`,
      'aria-label': `${prefix}${i + 1} date`,
      spellcheck: 'false',
      onchange: (e) => {
        const parsed = parseXDate(e.target.value);
        if (!parsed) {
          e.target.setAttribute('aria-invalid', 'true');
          toast(`"${e.target.value}" is not a date in MM/DD/YYYY form`);
          return;
        }
        e.target.removeAttribute('aria-invalid');
        Object.assign(x, { y: parsed.y, m: parsed.m, d: parsed.d });
        touch();
      },
    });

    const children = [box, el('span.tag', { text: `${prefix}${i + 1}` }), el('div.grow', {}, [dateField])];

    if (hhmm) {
      children.push(
        el('input', {
          type: 'time',
          value: x.time ?? '00:00',
          'aria-label': `${prefix}${i + 1} time`,
          style: 'flex:0 0 96px',
          onchange: (e) => {
            x.time = e.target.value || '00:00';
            touch();
          },
        })
      );
    }

    children.push(
      iconBtn('✕', `Remove ${prefix}${i + 1}`, () => {
        list.splice(i, 1);
        touch();
      }, 'danger')
    );

    return el('div.row', { data: { off: String(!x.enabled) } }, children);
  });

  // The add form. A date typed here is validated before it can enter the model.
  const yInput = el('input', { type: 'number', min: '1', max: '9999', value: String(new Date().getUTCFullYear()) });
  const mInput = el('input', { type: 'number', min: '1', max: '12', value: '1' });
  const dInput = el('input', { type: 'number', min: '1', max: '31', value: '1' });

  const add = () => {
    const parsed = parseXDate(`${mInput.value}/${dInput.value}/${yInput.value}`);
    if (!parsed) {
      toast('That is not a date that exists.');
      return;
    }
    list.push(parsed);
    touch();
  };

  /**
   * Protocol Prime — the author's own operating procedure, absent from the
   * original software entirely: enter the date the projection is being
   * conducted on as a control alongside the historical dates. A third control
   * gives three spans instead of one, which is the flow chart's forty-two
   * projections rather than fourteen. "Today" here is the engine's injected
   * now, so the Current-date override carries through.
   */
  const addToday = () => {
    const t = new Date(now());
    const y = t.getUTCFullYear();
    const m = t.getUTCMonth() + 1;
    const d = t.getUTCDate();
    if (list.some((x) => x.enabled && x.y === y && x.m === m && x.d === d)) {
      toast('Today is already a control.');
      return;
    }
    list.push(makeXDate(y, m, d));
    touch();
    toast('Added today as a control — every historical date now casts against it.');
  };

  return panel(title, {
    count: `${list.filter((x) => x.enabled).length} / ${list.length}`,
    actions: [
      master(list, (on) => list.forEach((x) => { x.enabled = on; }), `Enable all ${title}`),
      el('button.btn.sm', {
        type: 'button',
        text: 'Reset',
        disabled: list.length === 0,
        onclick: async () => {
          const ok = await confirmDialog({
            title: `Delete all ${title} for this Iso-Event?`,
            body: 'Every date in this list is removed.',
            cancel: `NO, keep existing ${title}`,
            confirm: `YES, delete all`,
            danger: true,
          });
          if (ok) {
            ev[key] = [];
            touch();
          }
        },
      }),
    ],
    body: [
      el('p.note', { text: note }),
      list.length
        ? el('div.rowlist', {}, rows)
        : el('p.note', { style: 'color:var(--faint)', text: 'Nothing here yet.' }),
      el('div.formrow', {}, [
        el('div.field.narrow', {}, [el('label', { text: 'Mon' }), mInput]),
        el('div.field.narrow', {}, [el('label', { text: 'Day' }), dInput]),
        el('div.field', {}, [el('label', { text: 'Year' }), yInput]),
        el('button.btn.primary', { type: 'button', text: addLabel, onclick: add }),
      ]),
      key === 'x_dates'
        ? el('div.formrow', { style: 'margin-top:6px' }, [
            el('button.btn', {
              type: 'button',
              text: '☉ Today · Protocol Prime',
              title:
                'The author’s operating procedure: enter the date the projection is being ' +
                'conducted as a control alongside the historical dates. Three controls give ' +
                'three spans — and three times the projections.',
              onclick: addToday,
            }),
          ])
        : null,
    ],
  });
}

/* ------------------------------------------------------------------ filters -- */

function filtersPanel() {
  const ev = currentEvent();

  const rows = FILTER_ROWS.map((f) => {
    const box = el('input', {
      type: 'checkbox',
      id: `filter-${f.flag}`,
      onchange: (e) => {
        ev[f.flag] = e.target.checked;
        touch();
      },
    });
    box.checked = ev[f.flag] === true;

    const parts = [box, el('span', { text: f.label })];

    if (f.value) {
      parts.push(
        el('input', {
          type: 'number',
          min: '0',
          value: String(ev[f.value] ?? FILTER_DEFAULTS[f.value]),
          'aria-label': `${f.label} value`,
          style: 'flex:0 0 84px',
          onchange: (e) => {
            const v = Number(e.target.value);
            // A negative silently becomes the field default, as in the original.
            ev[f.value] = Number.isFinite(v) && v >= 0 ? v : FILTER_DEFAULTS[f.value];
            e.target.value = String(ev[f.value]);
            touch();
          },
        })
      );
      if (f.suffix) parts.push(el('span', { style: 'font-size:11px;color:var(--dim)', text: f.suffix }));
    }

    return el('label.check', { class: 'row', data: { off: String(!ev[f.flag]) } }, [
      el('span.tag', { text: `F${f.id}` }),
      ...parts,
    ]);
  });

  const hidden = state.results?.hidden ?? 0;

  return panel('Filters', {
    count: state.stale ? '—' : `${hidden} hidden`,
    actions: [
      el('button.btn.sm', {
        type: 'button',
        text: 'Reset',
        onclick: () => {
          Object.assign(ev, FILTER_DEFAULTS);
          touch();
        },
      }),
    ],
    body: [
      el('p.note', {
        text:
          'Filters cut down on output noise to bring focus to the Z-Dates that matter most. ' +
          'Each one only ever removes rows.',
      }),
      el('div', { style: 'display:flex;flex-direction:column;gap:5px' }, rows),
    ],
  });
}

/* ------------------------------------------------------------- chart config -- */

function chartPanel() {
  const ev = currentEvent();

  const toggle = (opt, index) => {
    const box = el('input', {
      type: 'checkbox',
      onchange: (e) => {
        ev[opt.key] = e.target.checked;
        // Overlays are render-only: the results on screen are still exactly
        // right, so this must not dim them as stale. Re-render for the chart.
        markDirty();
        notify();
      },
    });
    box.checked = ev[opt.key] === true;
    return el('label.check', {}, [
      el('span.tag', { text: `C${index + 1}` }),
      box,
      el('span', { text: opt.label }),
    ]);
  };

  const group = (name, opts, offset) =>
    el('div', {}, [
      el('div', {
        style:
          'font:600 9.5px/1 var(--font-body);letter-spacing:.16em;text-transform:uppercase;' +
          'color:var(--faint);margin:10px 0 4px',
        text: name,
      }),
      ...opts.map((o) => toggle(o, CHART_OPTIONS.indexOf(o))),
    ]);

  const base = CHART_OPTIONS.filter((o) => !o.group);
  const moons = CHART_OPTIONS.filter((o) => o.group === 'moon');
  const eclipses = CHART_OPTIONS.filter((o) => o.group === 'eclipse');

  return panel('Chart Config', {
    count: `${CHART_OPTIONS.filter((o) => ev[o.key]).length} on`,
    body: [
      ...base.map((o) => toggle(o, CHART_OPTIONS.indexOf(o))),
      group('Moon phases', moons),
      group('Eclipses', eclipses),
    ],
  });
}

/* ------------------------------------------------------------------- scope -- */

/**
 * The date the sunset preview is computed for: the event's first enabled
 * anchor, because that is a date the reader has actually reasoned about. An
 * event with no anchors yet falls back to the current date, which is the same
 * date the projection would be measured against.
 */
function previewInstant(ev) {
  const anchor = ev.x_dates.find((x) => x.enabled) ?? ev.x_dates[0];
  return anchor ? toInstant(anchor, ev) : now();
}

/** Sunset at the event's coordinates, or why there is not one. */
function sunsetPreview(ev) {
  if (Math.abs(ev.lat) > LAT_LIMIT) return 'latitude outside the ±65 band';
  const ms = roundToNearestMinute(sunsetMs(previewInstant(ev), ev.lat, ev.long));
  if (!Number.isFinite(ms)) return 'no sunset there on that date';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `days begin at ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC on ${fmtDate(previewInstant(ev))}`;
}

/**
 * Latitude, longitude, and the map that fills them in.
 *
 * The typed inputs stay authoritative — the picker is an assist, not a
 * replacement — and both routes land on the same `pickCoordinate`, so a value
 * clicked and a value typed round identically.
 */
function locationFields(ev) {
  const commit = (lat, long) => {
    const p = pickCoordinate(lat, long);
    ev.lat = p.lat;
    ev.long = p.long;
    touch();
  };

  return el('div', { style: 'margin-top:12px' }, [
    el('div.formrow', {}, [
      el('div.field', {}, [
        el('label', { text: 'Latitude' }),
        el('input', {
          type: 'number', step: '0.1', min: '-65', max: '65', value: String(ev.lat),
          onchange: (e) => commit(Number(e.target.value) || 0, ev.long),
        }),
      ]),
      el('div.field', {}, [
        el('label', { text: 'Longitude' }),
        el('input', {
          type: 'number', step: '0.1', min: '-180', max: '180', value: String(ev.long),
          onchange: (e) => commit(ev.lat, Number(e.target.value) || 0),
        }),
      ]),
    ]),

    el('div.row', { style: 'margin-top:10px' }, [
      el('button.btn.sm', {
        type: 'button',
        title: 'Pick the coordinates off the offline map',
        text: '◍ Pick on map',
        onclick: async () => {
          const picked = await openMapPicker({
            lat: ev.lat, long: ev.long, whenMs: previewInstant(ev),
          });
          if (!picked) return;
          commit(picked.lat, picked.long);
          toast(`New coords: lat=${picked.lat}  long=${picked.long}`);
        },
      }),
      el('div.grow', {}),
      el('span.note', { style: 'margin:0;font-size:11px', text: sunsetPreview(ev) }),
    ]),
  ]);
}

function scopePanel() {
  const ev = currentEvent();
  const hhmm = ev.scope === EVENT_SCOPE.HH_MM;

  const scopeBtn = (id, label, note) =>
    el('button', {
      type: 'button',
      text: label,
      title: note,
      'aria-pressed': String(ev.scope === id),
      onclick: () => {
        ev.scope = id;
        ev.location_enabled = id === EVENT_SCOPE.HH_MM;
        touch();
      },
    });

  const startTime = new Date(clampDayStart(ev.day_scope_start_time_in_millis));
  const hhmmStr = `${String(startTime.getUTCHours()).padStart(2, '0')}:${String(
    startTime.getUTCMinutes()
  ).padStart(2, '0')}`;

  return panel('Scope & Location', {
    body: [
      el('div.field', {}, [
        el('label', { text: 'Event scope' }),
        el('div.segmented', {}, [
          scopeBtn(EVENT_SCOPE.DAYS, 'Days', 'Whole days, locked to UTC midnight'),
          scopeBtn(EVENT_SCOPE.HH_MM, 'HH:MM', 'Sunset-bucketed windows at the coordinates below'),
        ]),
      ]),

      hhmm
        ? locationFields(ev)
        : el('div.field', { style: 'margin-top:12px' }, [
            el('label', { text: 'Day begins at' }),
            el('input', {
              type: 'time',
              value: hhmmStr,
              onchange: (e) => {
                const [h, m] = String(e.target.value || '00:00').split(':').map(Number);
                ev.day_scope_start_time_in_millis = clampDayStart((h * 60 + m) * 60_000);
                touch();
              },
            }),
          ]),

      el('p.note', {
        style: 'margin-top:12px;margin-bottom:0',
        text: hhmm
          ? 'Latitude is clamped to ±65 — every sunset library becomes unreliable nearer the poles.'
          : 'Days scope is locked to UTC, so the same document gives the same answer on any machine.',
      }),
    ],
  });
}

/* ------------------------------------------------------------------ status -- */

function statusBar() {
  const r = state.results;
  const ev = currentEvent();
  const enabled = ev.x_dates.filter((x) => x.enabled).length;

  const stat = (value, label) => el('div.stat', {}, [el('b', { text: String(value) }), el('span', { text: label })]);

  const nowStr = fmtDate(now());

  return el('div.statusbar', {}, [
    stat(enabled, 'anchors'),
    stat(r ? r.y_structs.length : '—', 'pairs'),
    stat(ev.operations.filter((o) => o.enabled).length, 'operations'),
    stat(r ? r.processed_z_dates.length : '—', 'Z-Dates'),
    stat(r ? r.hidden : '—', 'hidden'),
    el('div.grow', {}),
    el('div.field', { style: 'flex:0 0 150px' }, [
      el('label', { text: 'Current date' }),
      el('input', {
        type: 'text',
        class: 'mono',
        value: nowStr,
        'aria-label': 'The date the projection is being conducted from',
        onchange: (e) => {
          const parsed = parseXDate(e.target.value);
          if (!parsed) {
            toast('That is not a date in MM/DD/YYYY form.');
            e.target.value = fmtDate(now());
            return;
          }
          const wanted = Date.UTC(parsed.y, parsed.m - 1, parsed.d);
          state.options.local_time_offset_in_millis = wanted - Date.now();
          recalculate();
        },
      }),
    ]),
    el('div.state', {
      data: { stale: String(state.stale) },
      text: state.stale ? 'Stale' : 'Up to date',
    }),
    el('button.btn.primary', { type: 'button', text: 'Recalculate', onclick: () => recalculate() }),
  ]);
}

/* -------------------------------------------------------------------- init -- */

export function renderRail(host) {
  replace(host, [
    isoEventsPanel(),
    datesPanel({
      key: 'x_dates',
      title: 'X-Dates',
      addLabel: '+ X-Date',
      note:
        'X-Dates are the primary type of input to the Ophis algorithms. At least 2 are required ' +
        'to generate output. Every pair of them gives one Y.',
    }),
    scopePanel(),
    datesPanel({
      key: 't_dates',
      title: 'T-Dates',
      addLabel: '+ T-Date',
      note:
        'T-Dates (Target Dates) are a way to only show Z-Dates for the future dates you are ' +
        'interested in — e.g. when a team will actually play again. Leave empty to see everything.',
    }),
    filtersPanel(),
    chartPanel(),
  ]);
}

export function renderStatus(host) {
  replace(host, [statusBar()]);
}
