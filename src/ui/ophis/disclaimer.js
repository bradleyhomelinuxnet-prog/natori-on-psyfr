/**
 * The users' group's own message, in short form. One source, so the About
 * screen and the line under the results can never say two different things.
 * Plain and calm: a statement of what the tool is, not a warning banner.
 */

import { el } from '../dom.js';

export const DISCLAIMER =
  'Ophis is a prediction tool, not a betting tool. How you use its dates is your decision and ' +
  'your responsibility; there are no guarantees. Never wager money you and your family can’t ' +
  'live without.';

/** The one quiet line shown under the results. */
export const disclaimerLine = () => el('p.disclaimer', { text: DISCLAIMER });
