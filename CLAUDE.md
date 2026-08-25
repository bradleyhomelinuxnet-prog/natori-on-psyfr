# Working in this repository

Read `docs/HANDOFF.md` first — fifteen minutes, and it is the difference
between helping and breaking things. The short form:

- **The maths is a contract.** `npm test` (94 fixtures, no dependencies) pins
  the engine against the original program. A failing test means your change
  drifted; it does not mean the fixture needs updating. Deliberate maths
  changes update the fixture AND say so in the commit message.
- **The traps table in the handoff is load-bearing.** `OPH_PI = 3.14`, the
  epsilon-free vortex tolerance, `round1(-1.25) === -1.2` — these look like
  bugs and are pinned behaviour. Do not "fix" them.
- `chronicon.html` is a **separate instrument** with its own data files. Never
  merge it with the Ophis app.
- No `eval`, no `new Function`, no `innerHTML` anywhere in `src/` — CI fails
  the build otherwise. User text goes in as text nodes via `src/ui/dom.js`.
- Docs are Markdown-first: edit `docs/*.md`, then `npm run docs` regenerates
  the HTML pages and fails on any broken link.
- Drive the app before pushing a UI change: `npm run serve`, then
  http://localhost:8777/. Several real defects here were invisible in source
  and obvious on the first hover.
