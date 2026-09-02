#!/usr/bin/env python3
"""
Rebuild `assets/map/` from the original's offline pyramid.

This is a study tool, like `tools/extract-data.mjs`. The app never runs it; it
exists so the provenance of every tile in the repository is a command rather
than a claim.

    python3 tools/build-map-tiles.py path/to/Ophis_v12_Browser/img/offline_map/map

The source tiles are named `.png` and are, every one of them, JPEG. They are
copied byte for byte and renamed to `.jpg` — nothing is re-encoded, so a tile
here hashes the same as the tile the original shipped.

What is *not* copied is the polar rows at zoom 4 and 5. The picker clamps to
±65° latitude (`LAT_LIMIT`, which is also where the original set its Leaflet
`maxBounds`), so those rows cannot be brought on screen. Dropping them takes
1 365 tiles / 9.5 MiB down to 725 tiles / 6.4 MiB with nothing reachable lost;
`tests/map.test.mjs` walks every tile the picker can request and fails if one
of them is missing.
"""

import hashlib
import math
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "assets" / "map"

MAX_ZOOM = 5
"""`MAP_MAX_ZOOM` — tiles are only generated up to this point."""

WHOLE_THROUGH_ZOOM = 3
"""Below this the band is smaller than the viewport, so the view is centred and
can show rows outside it. Those levels are cheap; ship them whole."""

TRIM_LIMIT = 66.0
"""A degree of margin on `LAT_LIMIT`, so the row containing the clamp is whole."""


def y_normalised(lat: float) -> float:
    """Web Mercator y for a latitude, as a fraction of the world."""
    phi = math.radians(lat)
    return (1 - math.log(math.tan(phi) + 1 / math.cos(phi)) / math.pi) / 2


def rows_for_zoom(z: int) -> range:
    n = 2 ** z
    if z <= WHOLE_THROUGH_ZOOM:
        return range(n)
    first = int(math.floor(y_normalised(TRIM_LIMIT) * n))
    last = int(math.ceil(y_normalised(-TRIM_LIMIT) * n)) - 1
    return range(first, last + 1)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip())
        return 2

    source = Path(argv[1])
    if not (source / "0" / "0" / "0.png").exists():
        print(f"no pyramid at {source} — expected {source}/0/0/0.png", file=sys.stderr)
        return 1

    if DEST.exists():
        shutil.rmtree(DEST)

    digest = hashlib.sha256()
    kept = 0
    total = 0

    for z in range(MAX_ZOOM + 1):
        n = 2 ** z
        for x in range(n):
            for y in rows_for_zoom(z):
                src = source / str(z) / str(x) / f"{y}.png"
                if not src.exists():
                    print(f"missing source tile {src}", file=sys.stderr)
                    return 1
                data = src.read_bytes()
                if not data.startswith(b"\xff\xd8"):
                    print(f"{src} is not the JPEG the original shipped", file=sys.stderr)
                    return 1
                out = DEST / str(z) / str(x) / f"{y}.jpg"
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(data)
                digest.update(data)
                kept += 1
                total += len(data)

    print(f"{kept} tiles, {total / 1024 / 1024:.2f} MiB")
    print(f"sha256 over the set, in z/x/y order: {digest.hexdigest()}")
    for z in range(MAX_ZOOM + 1):
        rows = rows_for_zoom(z)
        print(f"  z{z}: rows {rows.start}..{rows.stop - 1} of {2 ** z}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
