# The offline map pyramid

725 tiles, 6.40 MiB, zoom 0 through 5. They are the original's own tiles,
copied byte for byte.

`Ophis_v12_Windows.exe` shipped `img/offline_map/map/{z}/{x}/{y}.png` — 1 365
tiles and about 97 % of its asset payload — so that an air-gapped machine could
still click a place on a map instead of typing two numbers. Every one of those
files is named `.png` and is in fact a JPEG; they are renamed here to what they
are. Nothing is re-encoded: a tile in this directory hashes the same as the
tile the original shipped.

## What is missing, and why

Zoom 0 to 3 are whole. At zoom 4 and 5 only the rows between about ±66°
latitude are here.

The picker clamps to ±65° (`LAT_LIMIT` — where the original set its Leaflet
`maxBounds`, and where the sunset arithmetic stops being trustworthy), so at
those zooms the polar rows cannot be brought on screen. Below zoom 4 the
reachable band is smaller than the viewport, the view is centred rather than
clamped, and rows outside the band *can* show — which is why those levels are
complete.

| Zoom | Rows shipped | Of |
|---|---|---|
| 0 | 0 | 1 |
| 1 | 0–1 | 2 |
| 2 | 0–3 | 4 |
| 3 | 0–7 | 8 |
| 4 | 4–11 | 16 |
| 5 | 8–23 | 32 |

1 365 tiles / 9.5 MiB becomes 725 / 6.40 MiB, and nothing reachable is lost.
`tests/map.test.mjs` walks every tile the picker can request — every zoom,
every corner of the clamp, a spread of viewport sizes — and fails if one of
them is not here. A missing tile in the app hides itself rather than showing a
broken-image glyph, so the test is the only thing that would catch a further
trim.

## Rebuilding

```bash
python3 tools/build-map-tiles.py path/to/Ophis_v12_Browser/img/offline_map/map
```

The set hashes to
`92c9f3e711badeda7a7fcd018d8543aee5a99203d88b4d1edb59f89322cb4652`
(SHA-256 over the tile bytes in z/x/y order).

## Deleting them

The picker works without this directory. The graticule, the coordinate readout,
the ±65 band and the pick itself are all arithmetic; only the basemap comes
from here. A checkout with `assets/map/` removed still picks coordinates — over
an empty sea.
