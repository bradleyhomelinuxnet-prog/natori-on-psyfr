# Deploying

Two places run this, and they behave differently. Most of the trouble here has
come from assuming a symptom was in the code when it was in the deployment.

## GitHub Pages — automatic

`.github/workflows/pages.yml` publishes the whole checkout on every push to
`main`. Merge a PR and the site updates; nothing to do by hand.

https://bradleyhomelinuxnet-prog.github.io/natori-on-psyfr/

## w3spaces — manual, single file

A single-file build is uploaded by hand to the `OPHIS-PSYFR/` folder. The file
in use is `OPHIS-Natorion-Cipher.html`, which is hand-maintained and carries its
own tile tree (`img/offline_map/map/{z}/{x}/{y}.png`) and absolute doc links —
so it is **not** interchangeable with the generated `ophis-single.html`.
See `CLAUDE.md`.

### Confirm which build is live

Open **About**. The first line reads:

    Build 13.0.0 · <tag>

That is `BUILD_TAG`, beside `APP_VERSION` in `src/io/oph.js`. **Bump it when you
ship a build** — a stamp that never changes is worse than none.

Do not confirm a deployment by searching view-source for a function name. It
needs developer tools, it is easy to search the rendered page by mistake, and an
empty result cannot distinguish "the upload failed" from "you searched the wrong
thing" from "that name is not in this build". All three happened here.

There is also a check that needs nothing at all: click **☉ Today · Protocol
Prime**. It should add rows. If it empties the table with *"X6 must be greater
than X5"*, the build predates the anchor-order fix.

## The two traps

### 1. A stale page is usually the CDN, not your upload

**A new filename always works; overwriting an existing one appears not to.**
That is the signature of a cached response, and it cost this project most of a
session. Uploading under a fresh name creates a cache entry that is by
definition current, so the new build "works". Overwriting `index.html` leaves
the edge still serving the old copy, so a correct upload looks like it never
happened.

Test it before you debug anything else:

    …/OPHIS-PSYFR/index.html?v=2

A query string the cache has not seen forces a fresh fetch. If that loads the
new build, your upload landed and the plain URL will catch up — `Ctrl+Shift+R`
in the meantime. Only if `?v=2` is *also* stale is it genuinely an upload
problem.

### 2. localStorage is scoped to an ORIGIN, not a path

Every path on a host shares one store. Consequences that have all bitten:

- Two copies of the app in one folder share a document. Fixing one file does
  not fix what the other wrote.
- A preview host (`*-preview.w3spaces.com`) is a *different* origin, so it has
  its own clean store. "Works in preview, not live" is usually this, not the
  file.
- The original program's `save_blob` key is read as a legacy document. On a host
  serving both, the original writes a blob this app then reads.

This is why `restoreDocument` normalises everything it reads and repairs an
anchor order it cannot cast, then writes the repair back. A bad document
outlives the build that created it, and no upload can reach into a browser to
fix one — the app has to.

Repair only covers anchor order, though. A document can still be saved into a
state that shows nothing and is perfectly valid — T-Dates whitelisting a day no
projection lands on, filters cutting every row, anchors all in the past. For
those, **About → Clear saved data** is the way out, and it is the first thing to
try when one host disagrees with another serving the identical file.

That panel is also the diagnostic. It says whether a *document* is stored under
this address, separately from preferences, because only the document changes
what you see. "No saved document under this address" on the host that works and
"a saved document is stored" on the host that does not is the whole answer, and
it takes one click on each to read.

Clearing names every key the app has ever written, including the earlier
build's `ophion-*` names. `tests/store.test.mjs` holds the two lists together,
so a key added without being cleared fails there rather than on a deployed
page. It also pins the one that is easy to miss: `beforeunload` persists the
document, so the reload that makes a clear visible would write back exactly
what was removed if writes were not disabled first.

### Known limitation

In a browser with site data blocked outright, the app does not start: three
legacy reads in `loadOptions()` and two in `src/ui/chrome.js` call
`localStorage` outside a `try`, and the `SecurityError` takes the page down
before anything renders. Measured, not inferred — a blank page with
`SecurityError: The operation is insecure.` in the console. Pre-dates the Clear
control and is not fixed by it; storage-disabled is a different bug from
storage-full-of-junk.

## Checklist

1. `npm test`, `npm run bundle`, `npm run docs` all clean.
2. Bump `BUILD_TAG` in `src/io/oph.js`.
3. Merge to `main` — Pages updates itself.
4. Upload the single-file build to w3spaces.
5. Open About; confirm the stamp. If it is old, try `?v=2` before re-uploading.
6. Keep exactly one copy of the app per folder. A second copy is the divergence
   trap the generator exists to prevent.
7. If the uploaded copy behaves differently from one that works, open About on
   both and compare what each says is stored before suspecting the file.
