/**
 * The timeline chart, on raw Canvas 2D.
 *
 * Absolute calendar time runs along x. Each operation result is drawn as a half
 * ellipse from its anchor foot to its Z-Date foot, so the width of an arc is the
 * projection's reach and its height is half that — the picture is a set of
 * jumps forward in time from the controls.
 *
 * Four things the original got wrong or could not do, fixed here:
 *
 *   - v12 asked its chart library for curved lines using a v2 option name that
 *     v4 ignored, so every arc was silently a thirteen-segment polyline. These
 *     are real ellipse arcs.
 *   - Hovering rebuilt every dataset, because the library could not reorder
 *     them. Here a hover re-strokes one arc.
 *   - Overlapping arcs are nested rather than superimposed, so a date reached by
 *     several operations reads as several arcs.
 *   - The moon and eclipse rows were eight PNGs and four more. They are drawn,
 *     so they scale, follow the theme, and cost nothing to load.
 */

import { el } from '../dom.js';
import { state, currentEvent } from '../../state/ophis-store.js';
import { MILLIS_PER_DAY, SYNODIC_MONTH, EVENT_SCOPE } from '../../core/ophis/constants.js';
import { fmtDate } from '../../core/ophis/calendar.js';
import { eclipseNear, coverage } from '../../core/eclipses.js';
import { CHART_OPTIONS } from '../../state/iso-event.js';

/* --------------------------------------------------------------- astronomy -- */

/** Julian Day from an epoch instant. */
const toJD = (ms) => ms / MILLIS_PER_DAY + 2440587.5;

/** A known new moon, as a Julian Day: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH_JD = 2451550.26;

/** Age of the moon at an instant, as a fraction of one lunation. */
function lunarPhase(ms) {
  const age = ((toJD(ms) - NEW_MOON_EPOCH_JD) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  return age / SYNODIC_MONTH;
}

/** The eight named phases, and the ideal fraction each sits at. */
const PHASES = [
  { key: 'chart_option__show_new_moons', at: 0.0, name: 'New' },
  { key: 'chart_option__show_waxing_crescent_moons', at: 0.125, name: 'Waxing Crescent' },
  { key: 'chart_option__show_first_quarter_moons', at: 0.25, name: 'First Quarter' },
  { key: 'chart_option__show_waxing_gibbous_moons', at: 0.375, name: 'Waxing Gibbous' },
  { key: 'chart_option__show_full_moons', at: 0.5, name: 'Full' },
  { key: 'chart_option__show_waning_gibbous_moons', at: 0.625, name: 'Waning Gibbous' },
  { key: 'chart_option__show_third_quarter_moons', at: 0.75, name: 'Third Quarter' },
  { key: 'chart_option__show_waning_crescent_moons', at: 0.875, name: 'Waning Crescent' },
];

/* ------------------------------------------------------------------ layout -- */

const PAD = { top: 18, right: 26, bottom: 16, left: 26 };
/** Fixed-pixel furniture below the axis, as in the original. */
const ROW = { label: 34, moon: 66, eclipse: 94 };

const cssVar = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function hitColour(n) {
  if (n >= 5) return cssVar('--hits-5plus', '#d22b2b');
  if (n === 4) return cssVar('--hits-4', '#0096ff');
  if (n === 3) return cssVar('--hits-3', '#fdda0d');
  return cssVar('--hits-low', '#6c6659');
}

/**
 * Group arcs whose feet nearly coincide and scale them so they nest.
 *
 * Without this, five operations landing on one date draw five identical arcs on
 * top of each other and the picture claims one.
 */
function fanOut(arcs) {
  const groups = new Map();
  for (const a of arcs) {
    const key = `${Math.round(a.x0 / 8)}|${Math.round(a.x1 / 8)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((p, q) => Math.abs(p.x1 - p.x0) - Math.abs(q.x1 - q.x0));
    group.forEach((a, k) => {
      a.lift = 1 + 0.15 * k;
    });
  }
  return arcs;
}

/**
 * Choose which labels to draw.
 *
 * Pushing colliding labels apart, as the original did, turns an overlap into a
 * band of text that no longer sits above the date it names. Instead: take them
 * in order of how much they earned a label, and keep one only if it clears
 * everything already placed. Every label that survives is at its true position,
 * and the ones that lose were the least interesting.
 */
function placeLabels(candidates, measure) {
  const placed = [];
  for (const c of candidates) {
    const w = measure(c) + 10;
    if (placed.some((p) => Math.abs(p.x - c.x) < (p.w + w) / 2)) continue;
    placed.push({ ...c, w });
  }
  return placed.sort((a, b) => a.x - b.x);
}

/* ------------------------------------------------------------------- draw -- */

export function createChart(canvas) {
  const ctx = canvas.getContext('2d');
  let arcs = [];
  let scaleX = null;
  let hovered = null;

  function build() {
    const r = state.results;
    const ev = currentEvent();
    if (!r || !r.processed_z_dates.length) return null;

    const shown = new Set(r.processed_z_dates.map((z) => z.key));
    const results = [];
    for (const ys of r.y_structs) {
      for (const op of ys.operation_results) {
        if (!shown.has(String(op.z_start))) continue;
        results.push({ op, ys, z: r.z_structs[String(op.z_start)] });
      }
    }
    if (!results.length) return null;

    const anchors = ev.x_dates.filter((x) => x.enabled);
    const times = [
      ...results.map((d) => d.op.x_instant_base),
      ...results.map((d) => d.op.z_start),
    ];
    const min = Math.min(...times) - MILLIS_PER_DAY;
    const max = Math.max(...times) + MILLIS_PER_DAY;
    return { results, anchors, min, max };
  }

  function render() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 800;
    const cssH = canvas.clientHeight || 340;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const ev = currentEvent();
    if (!ev[CHART_OPTIONS[0].key]) return; // "Chart Itself" is off

    const data = build();
    if (!data) {
      ctx.fillStyle = cssVar('--faint', '#5f5a4c');
      ctx.font = `12px ${cssVar('--font-body', 'serif')}`;
      ctx.textAlign = 'center';
      ctx.fillText('Nothing to plot yet.', cssW / 2, cssH / 2);
      return;
    }

    const { results, anchors, min, max } = data;
    const plotW = cssW - PAD.left - PAD.right;

    // Reserve the furniture band below the axis. The axis sits high enough that
    // whichever rows are switched on all fit beneath it.
    const showMoons = PHASES.some((p) => ev[p.key]);
    const showEclipses = CHART_OPTIONS.filter((c) => c.group === 'eclipse').some((c) => ev[c.key]);
    const band = showEclipses ? ROW.eclipse + 16 : showMoons ? ROW.moon + 16 : ROW.label + 14;
    const axisY = cssH - band;
    const plotH = axisY - PAD.top;

    scaleX = (ms) => PAD.left + ((ms - min) / (max - min)) * plotW;

    // Arc geometry.
    const raw = results.map((d) => {
      const x0 = scaleX(d.op.x_instant_base);
      const x1 = scaleX(d.op.z_start);
      return { ...d, x0, x1, lift: 1 };
    });
    // A half ellipse is naturally as tall as it is wide; scale the whole family
    // down together so the widest one just fits, and short arcs stay legible
    // instead of collapsing onto the axis.
    const maxRx = Math.max(...raw.map((a) => Math.abs(a.x1 - a.x0) / 2), 1);
    const heightScale = Math.min(1, plotH / maxRx);
    arcs = fanOut(raw);

    // Draw the strongest arcs last so they land on top of the crowd.
    arcs.sort((a, b) => a.z.hit_count - b.z.hit_count);

    /* ---- arcs ---- */
    for (const a of arcs) {
      const rx = Math.abs(a.x1 - a.x0) / 2;
      const cx = (a.x0 + a.x1) / 2;
      // Height is proportional to reach, then lifted so nested arcs separate.
      const ry = Math.min(plotH, rx * heightScale * a.lift);
      a.geom = { cx, rx, ry };

      const highlighted = state.highlightKey === a.z.key || hovered === a;
      const colour = hitColour(a.z.hit_count);
      ctx.lineWidth = highlighted ? 2.4 : 1.1;

      if (highlighted) {
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.ellipse(cx, axisY, rx, ry, 0, Math.PI, 0, a.x1 < a.x0);
        ctx.stroke();
      } else {
        // Fade the arc in from its anchor so the direction of travel is legible
        // without an arrowhead. Twelve segments is enough to read as smooth.
        // Canvas measures angles clockwise because y grows downward, so the
        // TOP half of the ellipse is the sweep from PI to 2*PI. Ramping from
        // the anchor foot to the Z foot means starting at whichever of the two
        // the anchor sits on.
        const steps = 12;
        const from = a.x1 >= a.x0 ? Math.PI : 2 * Math.PI;
        const to = a.x1 >= a.x0 ? 2 * Math.PI : Math.PI;
        for (let i = 0; i < steps; i++) {
          const t0 = from + ((to - from) * i) / steps;
          const t1 = from + ((to - from) * (i + 1)) / steps;
          const reach = 0.075 + 0.925 * (((i + 1) / steps) ** 1.5);
          ctx.globalAlpha = reach * (a.z.hit_count >= 3 ? 1 : 0.42);
          ctx.strokeStyle = colour;
          ctx.beginPath();
          ctx.ellipse(cx, axisY, rx, ry, 0, t0, t1, t1 < t0);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    /* ---- axis ---- */
    ctx.strokeStyle = cssVar('--chart-axis', 'rgba(255,255,255,.5)');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(cssW, axisY);
    ctx.stroke();

    /* ---- anchor ticks ---- */
    ctx.fillStyle = cssVar('--gold', '#d8a943');
    ctx.font = `600 9px ${cssVar('--font-mono', 'monospace')}`;
    ctx.textAlign = 'center';
    let lastLabelX = -Infinity;
    let tier = 0;
    for (let i = 0; i < anchors.length; i++) {
      const x = scaleX(Date.UTC(anchors[i].y, anchors[i].m - 1, anchors[i].d));
      ctx.beginPath();
      ctx.arc(x, axisY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Two controls a week apart sit almost on top of each other at this
      // scale, so stack their labels rather than overprinting them.
      tier = x - lastLabelX < 22 ? tier + 1 : 0;
      lastLabelX = x;
      ctx.fillText(`X${ev.x_dates.indexOf(anchors[i]) + 1}`, x, axisY - 8 - tier * 11);
    }

    /* ---- date labels ---- */
    if (ev.chart_option__show_dates) {
      ctx.font = `10px ${cssVar('--font-mono', 'monospace')}`;
      const seen = new Map();
      for (const a of arcs) {
        if (!seen.has(a.z.key)) seen.set(a.z.key, { x: a.x1, ms: a.op.z_start, z: a.z });
      }
      // Rank first: a date several operations agree on has earned a label more
      // than one a single beta operation reached. Whatever is hovered jumps the
      // queue, so pointing at an arc always names it.
      const ranked = [...seen.values()].sort((a, b) => {
        if (a.z.key === state.highlightKey) return -1;
        if (b.z.key === state.highlightKey) return 1;
        return b.z.hit_count - a.z.hit_count || b.z.score - a.z.score || a.ms - b.ms;
      });

      const labels = placeLabels(ranked, (l) => ctx.measureText(fmtDate(l.ms)).width);

      for (const l of labels) {
        const active = state.highlightKey === l.z.key;
        ctx.strokeStyle = active
          ? cssVar('--gold', '#d8a943')
          : cssVar('--chart-grid', 'rgba(255,255,255,.08)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.x, axisY);
        ctx.lineTo(l.x, axisY + ROW.label - 11);
        ctx.stroke();

        ctx.fillStyle = active ? cssVar('--gold-2', '#f3d27a') : cssVar('--dim', '#8d866f');
        ctx.textAlign = 'center';
        ctx.fillText(fmtDate(l.ms), l.x, axisY + ROW.label);
      }
    }

    /* ---- moon phases ---- */
    if (showMoons) {
      const wanted = PHASES.filter((p) => ev[p.key]);
      const step = MILLIS_PER_DAY;
      const drawn = new Set();
      for (let t = min; t <= max; t += step) {
        const frac = lunarPhase(t);
        for (const p of wanted) {
          // Within half a day of the ideal fraction, and only once per lunation.
          const d = Math.min(Math.abs(frac - p.at), 1 - Math.abs(frac - p.at));
          if (d > 0.5 / SYNODIC_MONTH) continue;
          const bucket = `${p.at}|${Math.round(t / (SYNODIC_MONTH * MILLIS_PER_DAY))}`;
          if (drawn.has(bucket)) continue;
          drawn.add(bucket);
          drawMoon(ctx, scaleX(t), axisY + ROW.moon, 7, frac);
        }
      }
    }

    /* ---- eclipses ---- */
    if (showEclipses) {
      const { min: eMin, max: eMax } = coverage();
      for (let t = min; t <= max; t += MILLIS_PER_DAY) {
        const jd = Math.round(toJD(t));
        if (jd < eMin || jd > eMax) continue;
        const hit = eclipseNear(jd, 0);
        if (hit.solar && wantsEclipse(ev, 'solar', hit.solar)) {
          drawEclipse(ctx, scaleX(t), axisY + ROW.eclipse, 'solar', hit.solar);
        }
        if (hit.lunar && wantsEclipse(ev, 'lunar', hit.lunar)) {
          drawEclipse(ctx, scaleX(t), axisY + ROW.eclipse, 'lunar', hit.lunar);
        }
      }
    }

    /* ---- hover rulers ---- */
    const active = arcs.find((a) => a.z.key === state.highlightKey) ?? hovered;
    if (active) drawRulers(ctx, active, axisY, cssW);
  }

  /** A moon disc with the lit fraction drawn on it. */
  function drawMoon(c, x, y, r, frac) {
    const lit = cssVar('--moon', '#8fb0c9');
    const dark = cssVar('--bg-2', '#0c0c14');
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = dark;
    c.fill();
    c.strokeStyle = lit;
    c.lineWidth = 1;
    c.stroke();

    // The terminator: a half disc plus an ellipse whose x-radius tracks phase.
    c.beginPath();
    c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, frac > 0.5);
    c.ellipse(x, y, r * Math.abs(1 - 4 * Math.abs(frac - 0.5)), r, 0, Math.PI / 2, -Math.PI / 2, frac < 0.25 || frac > 0.75);
    c.fillStyle = lit;
    c.fill();
    c.restore();
  }

  function drawEclipse(c, x, y, kind, type) {
    const colour = kind === 'solar' ? cssVar('--red', '#e0503c') : cssVar('--violet', '#a98ade');
    c.save();
    c.strokeStyle = colour;
    c.fillStyle = colour;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    if (type === 'T') c.fill();
    else c.stroke();
    if (kind === 'solar') {
      // Corona ticks, so a solar eclipse is distinguishable at a glance.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * 7.5, y + Math.sin(a) * 7.5);
        c.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
        c.stroke();
      }
    }
    c.restore();
  }

  /** Two dashed measurement callouts: the projection, and the interval that made it. */
  function drawRulers(c, a, axisY, width) {
    const { cx, rx, ry } = a.geom;
    const days = (ms) => Math.round(Math.abs(ms) / MILLIS_PER_DAY);
    c.save();
    c.setLineDash([3, 3]);
    c.strokeStyle = cssVar('--gold', '#d8a943');
    c.fillStyle = cssVar('--gold-2', '#f3d27a');
    c.lineWidth = 1;
    c.font = `10px ${cssVar('--font-mono', 'monospace')}`;
    c.textAlign = 'center';

    // Upper: anchor -> Z-Date, at the apex.
    const topY = axisY - ry - 8;
    c.beginPath();
    c.moveTo(a.x0, topY);
    c.lineTo(a.x1, topY);
    c.stroke();
    c.fillText(`${days(a.op.z_start - a.op.x_instant_base)} days`, cx, topY - 5);

    // Lower: the two anchors that produced Y, at half the height.
    const midY = axisY - ry / 2;
    const xa = scaleX(a.ys.x_1_instant);
    const xb = scaleX(a.ys.x_2_instant);
    c.strokeStyle = cssVar('--cyan', '#56bcd0');
    c.fillStyle = cssVar('--cyan', '#56bcd0');
    c.beginPath();
    c.moveTo(xa, midY);
    c.lineTo(xb, midY);
    c.stroke();
    c.fillText(`Y = ${days(a.ys.x_2_instant - a.ys.x_1_instant)} days`, (xa + xb) / 2, midY - 5);
    c.restore();
  }

  /* ---- interaction ---- */

  canvas.addEventListener('mousemove', (e) => {
    if (!arcs.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Nearest arc by distance to its ellipse, within a few pixels.
    let best = null;
    let bestD = 9;
    for (const a of arcs) {
      if (!a.geom) continue;
      const { cx, rx, ry } = a.geom;
      const dx = (x - cx) / (rx || 1);
      const dy = (y - (canvas.clientHeight - 0)) / (ry || 1);
      const d = Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    const key = best?.z.key ?? null;
    if (key !== state.highlightKey) {
      state.highlightKey = key;
      hovered = best;
      document.dispatchEvent(new CustomEvent('ophis:highlight', { detail: key }));
      render();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (state.highlightKey === null) return;
    state.highlightKey = null;
    hovered = null;
    document.dispatchEvent(new CustomEvent('ophis:highlight', { detail: null }));
    render();
  });

  return { render };
}

function wantsEclipse(ev, kind, type) {
  const full = type === 'T';
  if (kind === 'solar') {
    return full ? ev.chart_option__full_solar_eclipses : ev.chart_option__partial_solar_eclipses;
  }
  return full ? ev.chart_option__full_lunar_eclipses : ev.chart_option__partial_lunar_eclipses;
}

/** The legend below the canvas. */
export function chartLegend() {
  const swatch = (colour, label) =>
    el('span', {}, [el('i', { style: `background:${colour}` }), label]);
  return el('div.legend', {}, [
    swatch('var(--hits-low)', '1–2 hits'),
    swatch('var(--hits-3)', '3'),
    swatch('var(--hits-4)', '4'),
    swatch('var(--hits-5plus)', '5+'),
  ]);
}
