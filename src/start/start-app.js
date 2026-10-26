/**
 * Start here — the guided first run.
 *
 * One question per screen, carried by a short story: Natori keeps a notebook of
 * the dates something happened, Rogue knows how to read the gaps. The engine is
 * the same runOphis the full app uses; ./plain.js turns its result into ranked,
 * explained dates. "See the full workings" hands the event to index.html, which
 * adds it beside whatever the user already has there.
 *
 * DOM only through ../ui/dom.js, so no user text ever becomes markup.
 */

import { $, el, replace } from '../ui/dom.js';
import { START_KEYS } from '../state/ophis-store.js';
import { MILLIS_PER_DAY } from '../core/ophis/constants.js';
import { buildEvent, coach, readRun, ordinal, todayUTC, phoenixPlates } from './plain.js';
import { CHRONOTECTURE_URL } from '../data/chronotecture.js';

/* ---------------------------------------------------------------- the story -- */

const EXAMPLE = {
  name: 'Power cuts',
  // Days before today, so the example always sits inside the SOP's three years.
  daysAgo: [640, 451, 289, 118],
};

const CHIPS = ['Moved house', 'Got sick', 'A big win at work', 'A breakup', 'Car trouble', 'Power cuts'];

/* -------------------------------------------------------------------- state -- */

const draft = {
  step: 0,
  name: '',
  dates: ['', ''],
  // Parallel to `dates`: true when that time happened after sunset, which the
  // author's input notes say must be entered as the next day.
  late: [false, false],
  includeToday: false,
};

const store = {
  read() {
    try {
      const raw = localStorage.getItem(START_KEYS.draft);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.name === 'string') draft.name = saved.name;
      if (Array.isArray(saved.dates) && saved.dates.length) draft.dates = saved.dates.map(String).slice(0, 12);
      draft.late = draft.dates.map((_, i) => Array.isArray(saved.late) && saved.late[i] === true);
      draft.includeToday = saved.includeToday === true;
      if ([0, 1, 2, 3].includes(saved.step)) draft.step = saved.step;
    } catch {
      /* a private window or a corrupt draft: start fresh. */
    }
  },
  write() {
    try {
      localStorage.setItem(START_KEYS.draft, JSON.stringify(draft));
    } catch {
      /* not worth interrupting anyone over. */
    }
  },
};

const now = () => Date.now();

/** `YYYY-MM-DD` from a date input, as the `{y,m,d}` the event wants. */
function parseISODate(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
/**
 * The dates as the engine should see them. "After sunset" moves one to the next
 * calendar day: Ophis counts days by the Earth's rotation, and the author's input
 * notes (docs/reverse/24 §3) have the operator enter the following date by hand.
 */
const typedDates = () =>
  draft.dates
    .map((text, i) => {
      const d = parseISODate(text);
      if (!d || !draft.late[i]) return d;
      const next = new Date(Date.UTC(d.y, d.m - 1, d.d + 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
    })
    .filter(Boolean);

const LONG = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function fromNow(ms) {
  const days = Math.round((ms - todayUTC(now())) / MILLIS_PER_DAY);
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  if (days < 730) return `in ${Math.round(days / 30.44)} months`;
  return `in ${(days / 365.25).toFixed(1)} years`;
}

/* ------------------------------------------------------------------ helpers -- */

const story = (...lines) => el('div.start-story', {}, lines.map((l) => el('p', {}, l)));
const said = (who, words) => el('p.said', {}, [el('span.who', { text: who }), ` ${words}`]);
const head = (step, title) =>
  el('div.start-head', {}, [
    step ? el('div.eyebrow', { text: `Step ${step} of 3` }) : null,
    el('h1', { tabindex: '-1', text: title }),
  ]);

function go(step) {
  draft.step = step;
  store.write();
  render();
  // Move focus to the new heading, so a keyboard or screen-reader user lands on
  // the question rather than on a button that no longer exists.
  $('start').querySelector('h1')?.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: 'smooth' });
}

function useExample() {
  const today = todayUTC(now());
  draft.name = EXAMPLE.name;
  draft.dates = EXAMPLE.daysAgo.map((d) => isoOf(today - d * MILLIS_PER_DAY));
  draft.late = draft.dates.map(() => false);
  draft.includeToday = true;
  go(3);
}

/* ------------------------------------------------------------------ screens -- */

function intro() {
  return [
    head(0, 'Natori’s notebook'),
    story(
      'The power in Natori’s building kept cutting out. Never on a schedule anyone could name, but often enough to notice. So Natori started writing the dates down.',
    ),
    said('Rogue:', '“Patterns hide in the gaps between dates. Let’s measure them.”'),
    story(
      'That is all this does. You bring a few dates when the same kind of thing happened. It measures the gaps between them, runs each gap through sixteen fixed formulas, and shows you which future days the most formulas agree on.',
      'Three steps, about two minutes. Nothing you type leaves this page.',
    ),
    el('div.btnrow.start-actions', {}, [
      el('button.btn.primary', { type: 'button', text: 'Start with my own dates', onclick: () => go(1) }),
      el('button.btn', { type: 'button', text: 'Follow Natori’s example', onclick: useExample }),
    ]),
  ];
}

function stepName() {
  const input = el('input.start-input#evname', {
    type: 'text',
    maxlength: '60',
    placeholder: 'e.g. Moved house',
    value: draft.name,
    autocomplete: 'off',
    'aria-describedby': 'evname-help',
  });
  const next = el('button.btn.primary', { type: 'button', text: 'Next', disabled: !draft.name.trim() });
  input.addEventListener('input', () => {
    draft.name = input.value;
    next.disabled = !draft.name.trim();
    store.write();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && draft.name.trim()) go(2);
  });
  next.onclick = () => go(2);

  return [
    head(1, 'What keeps happening?'),
    story('Natori wrote one heading at the top of the page: Power cuts. What would yours say?'),
    el('label.start-label', { for: 'evname', text: 'Name it' }),
    input,
    el('div.chips', { role: 'group', 'aria-label': 'Ideas' }, CHIPS.map((c) =>
      el('button.chip', {
        type: 'button',
        text: c,
        onclick: () => {
          draft.name = c;
          input.value = c;
          next.disabled = false;
          store.write();
          input.focus();
        },
      })
    )),
    el('div.rule#evname-help', {}, [
      el('p', {}, [el('strong', { text: 'Works: ' }), 'the same kind of event, more than once. The times you moved house. Every flare-up of an old injury.']),
      el('p', {}, [el('strong', { text: 'Doesn’t work: ' }), 'a mix of different events, like your birthday, your wedding and your graduation. There is no pattern between unrelated things to find.']),
    ]),
    el('div.btnrow.start-actions', {}, [
      el('button.btn', { type: 'button', text: 'Back', onclick: () => go(0) }),
      next,
    ]),
  ];
}

function stepDates() {
  const max = isoOf(todayUTC(now()));
  const notesHost = el('ul.coach', { 'aria-live': 'polite' });
  const next = el('button.btn.primary', { type: 'button', text: 'Show me the dates' });

  const refresh = () => {
    const { ok, notes } = coach(typedDates(), now(), { includeToday: draft.includeToday });
    const blank = draft.dates.some((d) => !d) && typedDates().length < 2;
    next.disabled = !ok;
    replace(notesHost, (blank && !notes.length ? [] : notes).map((n) => el(`li.${n.level}`, { text: n.text })));
    store.write();
  };

  const rows = el('ol.datelist');
  const paintRows = () => {
    replace(rows, draft.dates.map((value, i) => {
      const input = el('input.start-input', {
        type: 'date',
        max,
        value,
        'aria-label': `${ordinal(i)} time it happened`,
      });
      input.addEventListener('change', () => {
        draft.dates[i] = input.value;
        refresh();
      });
      const remove = el('button.btn.icon', {
        type: 'button',
        text: '✕',
        'aria-label': `Remove the ${ordinal(i)} date`,
        title: 'Remove this date',
        disabled: draft.dates.length <= 2,
        onclick: () => {
          draft.dates.splice(i, 1);
          draft.late.splice(i, 1);
          paintRows();
          refresh();
        },
      });
      const late = el('input', {
        type: 'checkbox',
        checked: draft.late[i] === true,
        'aria-label': `The ${ordinal(i)} time was after sunset`,
      });
      late.addEventListener('change', () => {
        draft.late[i] = late.checked;
        refresh();
      });
      return el('li', {}, [
        el('span.ord', { text: ordinal(i) }),
        input,
        remove,
        el('label.late', { title: 'Ophis counts days by sunset. An evening event is entered as the next day.' }, [
          late,
          ' After sunset (around 6 PM or later): count it as the next day',
        ]),
      ]);
    }));
  };
  paintRows();

  const add = el('button.btn', {
    type: 'button',
    text: '+ Add another date',
    onclick: () => {
      if (draft.dates.length >= 12) return;
      draft.dates.push('');
      draft.late.push(false);
      paintRows();
      refresh();
      rows.querySelector('li:last-child input')?.focus();
    },
  });

  const today = el('input#today', {
    type: 'checkbox',
    checked: draft.includeToday,
    'aria-labelledby': 'today-label',
    'aria-describedby': 'today-help',
  });
  today.addEventListener('change', () => {
    draft.includeToday = today.checked;
    refresh();
  });

  next.onclick = () => go(3);
  refresh();

  return [
    head(2, `When did “${draft.name.trim() || 'it'}” happen?`),
    said('Rogue:', '“Only real dates. Days it actually happened, as exactly as you can remember. A date that’s a month out is a different gap.”'),
    el('p.start-hint', { text: 'Any order is fine. Two dates is the minimum; three or more is where it gets interesting.' }),
    rows,
    add,
    el('label.toggle', { for: 'today' }, [
      today,
      el('span', {}, [
        el('strong#today-label', { text: 'Count today as a starting point' }),
        el('span.sub#today-help', { text: 'Turn this on if the pattern is about you personally. The method’s author says a personal pattern should end on the day you look; he calls it Protocol Prime.' }),
      ]),
    ]),
    notesHost,
    el('div.btnrow.start-actions', {}, [
      el('button.btn', { type: 'button', text: 'Back', onclick: () => go(1) }),
      next,
    ]),
  ];
}

/* ---------------------------------------------------------------- results -- */

function timeline(ev, picks) {
  const past = ev.x_dates.map((x) => Date.UTC(x.y, x.m - 1, x.d));
  const today = todayUTC(now());
  const all = [...past, today, ...picks.map((p) => p.at)];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pos = (ms) => `${(((ms - lo) / (hi - lo || 1)) * 100).toFixed(2)}%`;

  return el('figure.strip', { 'aria-label': 'Your dates, today, and the dates worth watching, on one line' }, [
    el('div.track', {}, [
      ...past.map((ms, i) => el('span.mark.past', { style: `left:${pos(ms)}`, title: `${ordinal(i)} date · ${SHORT.format(ms)}` })),
      el('span.mark.now', { style: `left:${pos(today)}`, title: `Today · ${SHORT.format(today)}` }),
      ...picks.map((p, i) => el('span.mark.pick', { style: `left:${pos(p.at)}`, title: `#${i + 1} · ${SHORT.format(p.at)}`, text: String(i + 1) })),
    ]),
    el('figcaption', {}, [
      el('span.key.past', { text: 'Your dates' }),
      el('span.key.now', { text: 'Today' }),
      el('span.key.pick', { text: 'Worth watching' }),
    ]),
  ]);
}

function workingLine(w) {
  const gap = `The gap between your ${ordinal(w.pair[0])} and ${ordinal(w.pair[1])} dates is ${w.gap} days. `;
  const how = w.words ? `${w.words[0].toUpperCase()}${w.words.slice(1)}` : 'The formula';
  return el('li', {}, [
    gap,
    `${how} gives `,
    el('strong', { text: `${w.after} days after your ${ordinal(w.from)} date` }),
    '. ',
    el('code', { text: w.equation, title: 'The formula as Ophis writes it' }),
  ]);
}

function beatsText(beats) {
  if (beats >= 100) return 'Your strongest date';
  if (beats <= 0) return 'Level with your other dates';
  return `Stronger than ${beats}% of your other dates`;
}

/** `phoenix` links the cycle note to the Chronotecture plates; only the first card carries it. */
function card(p, i, phoenix) {
  return el('article.pick', { data: { strength: p.strength.key } }, [
    el('header', {}, [
      el('span.rank', { text: String(i + 1), 'aria-hidden': 'true' }),
      el('div', {}, [
        el('h2', { text: LONG.format(p.at) }),
        el('div.when', { text: fromNow(p.at) }),
      ]),
      el('div.meter', {}, [
        el('span.pill', { text: p.strength.label }),
        el('span.beats', { text: beatsText(p.beats) }),
      ]),
    ]),
    el('ul.reasons', {}, p.reasons.map((r) => el('li', { text: r }))),
    el('details', {}, [
      el('summary', { text: 'How was this worked out?' }),
      el('ol.workings', {}, p.workings.map(workingLine)),
      el('p.small', { text: `Score ${p.score}. Strong formulas add 1, weak ones ½, and a resonance match raises it. The score only means something next to your other results.` }),
    ]),
    el('div.context', {}, [
      el('h3', { text: 'The bigger picture' }),
      el('ul', {}, [
        ...p.cycles.map((c, k) =>
          el('li', {}, k === 0 && phoenix.length
            ? [c, ' ', el('a', { href: phoenix[0].url, target: '_blank', rel: 'noopener', text: `Phoenix Chronometry ↗` })]
            : [c])
        ),
        ...p.plates.map((pl) =>
          el('li', {}, [
            'Chronotecture ',
            el('a', { href: pl.url, target: '_blank', rel: 'noopener', text: `${pl.label} (plate ${pl.plate}) ↗` }),
            ` names ${pl.why.join(' and ')}.`,
          ])
        ),
      ]),
    ]),
  ]);
}

function handOff(ev) {
  try {
    localStorage.setItem(START_KEYS.handoff, JSON.stringify(ev));
  } catch {
    /* storage blocked: the full app opens with what it had. */
  }
  location.href = 'index.html';
}

function stepResults() {
  const ev = buildEvent({ name: draft.name, dates: typedDates(), includeToday: draft.includeToday, now: now() });
  const check = coach(typedDates(), now(), { includeToday: draft.includeToday });
  if (!check.ok) {
    return [
      head(3, 'Not quite yet'),
      el('ul.coach', {}, check.notes.filter((n) => n.level === 'stop').map((n) => el('li.stop', { text: n.text }))),
      el('div.btnrow.start-actions', {}, [el('button.btn.primary', { type: 'button', text: 'Back to the dates', onclick: () => go(2) })]),
    ];
  }

  const read = readRun(ev, now());
  if (read.errors.length) {
    return [
      head(3, 'Something in the dates stopped it'),
      el('ul.coach', {}, read.errors.map((e) => el('li.stop', { text: e }))),
      el('div.btnrow.start-actions', {}, [el('button.btn.primary', { type: 'button', text: 'Back to the dates', onclick: () => go(2) })]),
    ];
  }

  const phoenix = phoenixPlates();
  const name = ev.name;

  return [
    head(3, 'Dates worth watching'),
    story(`Natori ran the numbers on “${name}”. Rogue circled a few days on the calendar. Not because they were certain, but because they were worth watching.`),
    el('p.verdict', { data: { kind: read.verdict.key }, text: read.verdict.text }),
    read.horizon ? el('p.start-hint', { text: `The method’s rule of thumb for these dates: ${read.horizon.text.replace(/^[^:]*: /, '')}` }) : null,
    read.picks.length ? timeline(ev, read.picks) : null,
    el('div.picks', {}, read.picks.map((p, i) => card(p, i, i === 0 ? phoenix : []))),
    read.total > read.picks.length
      ? el('p.start-hint', { text: `Showing the top ${read.picks.length} of ${read.total} future dates. The full app shows every one, with filters, a chart and an audit trail.` })
      : null,

    el('section.honest', {}, [
      said('Rogue:', '“It’s arithmetic, not prophecy. Watch the days. Don’t bet the farm on them.”'),
      el('p', { text: 'These dates come from fixed formulas run on the gaps between your dates. The formulas don’t know what your event was. With this many of them, some overlap happens by chance, which is why each date is ranked only against your own results.' }),
      el('p', {}, ['The ', el('a', { href: 'manual.html', text: 'Manual' }), ' explains how to read a score honestly, in plain English.']),
    ]),

    el('section.next', {}, [
      el('h3', { text: 'Where to next' }),
      el('div.nextgrid', {}, [
        nextCard('See the full workings', 'Open these dates in the full Ophis app: every result, the timeline chart, filters and the audit of each step. Your dates are added; nothing you had there is replaced.',
          el('button.btn.primary', { type: 'button', text: 'Open in Ophis →', onclick: () => handOff(ev) })),
        nextCard('The big cycles', 'Natori-on-Cyphr shows where any date sits in the Phoenix, Nemesis, NER and Metonic cycles, and where they line up.',
          el('a.btn', { href: 'natori-on-cyphr.html', text: 'Open Cyphr →' })),
        nextCard('Chronotecture', 'Breshears’ chart atlas, all 119 plates with rebuilt interactive charts. Start with the Phoenix Chronometry plates.',
          el('a.btn', { href: CHRONOTECTURE_URL + 'index.html', target: '_blank', rel: 'noopener', text: 'Open the atlas ↗' })),
      ]),
      el('div.btnrow.start-actions', {}, [
        el('button.btn', { type: 'button', text: 'Change the dates', onclick: () => go(2) }),
        el('button.btn', {
          type: 'button',
          text: 'Start over',
          onclick: () => {
            Object.assign(draft, { name: '', dates: ['', ''], late: [false, false], includeToday: false });
            go(0);
          },
        }),
      ]),
    ]),
  ];
}

const nextCard = (title, body, action) => el('div.nextcard', {}, [el('h4', { text: title }), el('p', { text: body }), action]);

/* ------------------------------------------------------------------ render -- */

const SCREENS = [intro, stepName, stepDates, stepResults];

function render() {
  replace($('start'), (SCREENS[draft.step] ?? intro)());
}

function applyTheme() {
  try {
    const theme = JSON.parse(localStorage.getItem('psyfr:options') ?? '{}').theme;
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
    else if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  } catch {
    /* keep the dark default. */
  }
}

applyTheme();
store.read();
render();
