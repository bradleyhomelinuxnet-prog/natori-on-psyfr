# Working in this repository

Read `docs/HANDOFF.md` first — fifteen minutes, and it is the difference
between helping and breaking things. The short form:

- **The maths is a contract.** `npm test` (134 fixtures, no dependencies) pins
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
- **The single-file build is generated.** `ophis-single.html` comes from
  `index.html` + `src/` via `npm run bundle`; CI fails if it is stale. Never
  hand-edit it. Two hand-made copies had already drifted apart and kept a fixed
  defect alive in both — that is what the generator exists to prevent.
- **`OPHIS-Natorion-Cipher.html` is NOT that generated build and is not a stale
  copy of it.** It is hand-maintained and in live use off-repo, with its own tile
  tree (`img/offline_map/map/...png`) and its own absolute doc links. Its eclipse
  canon has now been ported into `src/`, so that is no longer the reason to keep
  it; what it still holds alone is the calendar lift on the *original* table,
  which is deliberately not adopted -- see `DEVIATIONS.md` 13 for the measurement.
  Do not delete it without checking with the person who deploys it.
- Drive the app before pushing a UI change: `npm run serve`, then
  http://localhost:8777/. Several real defects here were invisible in source
  and obvious on the first hover.
- **Before debugging a deployed page, read `docs/DEPLOYING.md`.** Two traps have
  each cost a session: a stale page is usually the CDN, not your upload (test
  `?v=2` first), and localStorage is scoped to an ORIGIN, not a path, so a
  preview host and a live host do not share state and two copies in one folder
  do. `BUILD_TAG` in `src/io/oph.js` shows on the About screen — bump it when
  you ship, and use it rather than grepping view-source.
