/**
 * The offline coordinate picker.
 *
 * Two separate claims are checked here.
 *
 * The first is arithmetic: the Web Mercator forward and inverse transforms, the
 * tile grid, the viewport clamp, and the round-then-constrain-then-round that
 * the original applied to every picked coordinate. These are pinned against the
 * original's own constants (`MAP_MAX_ZOOM = 5`, `DEFAULT_MAP_SELECTION_ZOOM = 4`,
 * `LAT_LIMIT = 65`, `DECIMAL_PRECISION__LOCATION = 1`), not against this code.
 *
 * The second is about the shipped assets: `assets/map/` carries only the rows
 * the ±65 clamp can reach, so the last group walks every tile the picker can
 * ask for, at every zoom and a spread of viewport sizes, and asserts the file is
 * there. Trim the pyramid further and this fails rather than leaving a hole
 * somebody finds by panning.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  TILE_SIZE, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_DEFAULT_ZOOM, MERCATOR_LIMIT,
  worldSize, lonToWorldX, latToWorldY, worldXToLon, worldYToLat,
  roundLocation, pickCoordinate, tilesForView, clampOrigin, minZoomFor,
} from '../src/core/ophis/mercator.js';
import { LAT_LIMIT, LONG_LIMIT } from '../src/core/ophis/constants.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------- Group A --
 * The constants the original fixed, and the shape of the world they describe.
 */

test('the pyramid constants are the original’s', () => {
  assert.equal(TILE_SIZE, 256);
  assert.equal(MAP_MIN_ZOOM, 0);
  assert.equal(MAP_MAX_ZOOM, 5, 'tiles are only generated up to this point');
  assert.equal(MAP_DEFAULT_ZOOM, 4, 'DEFAULT_MAP_SELECTION_ZOOM');
});

test('zoom 0 is one tile and each level quadruples it', () => {
  for (let z = MAP_MIN_ZOOM; z <= MAP_MAX_ZOOM; z++) {
    assert.equal(worldSize(z), TILE_SIZE * 2 ** z);
  }
});

test('the corners of the world land on the corners of the pyramid', () => {
  for (let z = 0; z <= MAP_MAX_ZOOM; z++) {
    assert.equal(lonToWorldX(-180, z), 0);
    assert.equal(lonToWorldX(180, z), worldSize(z));
    assert.ok(Math.abs(latToWorldY(MERCATOR_LIMIT, z)) < 1e-6);
    assert.ok(Math.abs(latToWorldY(-MERCATOR_LIMIT, z) - worldSize(z)) < 1e-6);
  }
});

test('the null island sits at the centre of every level', () => {
  for (let z = 0; z <= MAP_MAX_ZOOM; z++) {
    assert.equal(lonToWorldX(0, z), worldSize(z) / 2);
    assert.ok(Math.abs(latToWorldY(0, z) - worldSize(z) / 2) < 1e-9);
  }
});

/* ---------------------------------------------------------------- Group B --
 * Projection round trips. A click has to come back out as the place it was.
 */

test('longitude survives the round trip at every zoom', () => {
  for (let z = 0; z <= MAP_MAX_ZOOM; z++) {
    for (const lon of [-180, -123.4, -0.1, 0, 0.1, 45, 179.9, 180]) {
      assert.ok(Math.abs(worldXToLon(lonToWorldX(lon, z), z) - lon) < 1e-9, `z${z} lon ${lon}`);
    }
  }
});

test('latitude survives the round trip inside the clamp', () => {
  for (let z = 0; z <= MAP_MAX_ZOOM; z++) {
    for (const lat of [-65, -51.5, -0.1, 0, 0.1, 33.9, 65]) {
      assert.ok(Math.abs(worldYToLat(latToWorldY(lat, z), z) - lat) < 1e-9, `z${z} lat ${lat}`);
    }
  }
});

test('latitude beyond the projection’s limit is folded to it, not to NaN', () => {
  assert.equal(latToWorldY(90, 3), latToWorldY(MERCATOR_LIMIT, 3));
  assert.equal(latToWorldY(-90, 3), latToWorldY(-MERCATOR_LIMIT, 3));
  assert.ok(Number.isFinite(latToWorldY(89.999, 5)));
});

test('north is up: a larger latitude is a smaller y', () => {
  assert.ok(latToWorldY(60, 4) < latToWorldY(0, 4));
  assert.ok(latToWorldY(0, 4) < latToWorldY(-60, 4));
});

/* ---------------------------------------------------------------- Group C --
 * A picked coordinate. The original rounded to a tenth, constrained, and
 * rounded again on the way out of `constrainLatOrLongValue`.
 */

test('a pick rounds to a tenth of a degree', () => {
  assert.equal(pickCoordinate(51.5074, -0.1278).lat, 51.5);
  assert.equal(pickCoordinate(51.5074, -0.1278).long, -0.1);
  assert.equal(roundLocation(12.34), 12.3);
  assert.equal(roundLocation(12.35), 12.4);
});

test('a pick is clamped to the band the sunset arithmetic survives', () => {
  assert.equal(pickCoordinate(84.2, 0).lat, LAT_LIMIT);
  assert.equal(pickCoordinate(-84.2, 0).lat, -LAT_LIMIT);
  assert.equal(pickCoordinate(0, 300).long, LONG_LIMIT);
  assert.equal(pickCoordinate(0, -300).long, -LONG_LIMIT);
});

test('a pick inside the band is left alone', () => {
  assert.deepEqual(pickCoordinate(65, 180), { lat: 65, long: 180 });
  assert.deepEqual(pickCoordinate(-65, -180), { lat: -65, long: -180 });
  assert.deepEqual(pickCoordinate(0, 0), { lat: 0, long: 0 });
});

test('a pick carries the same EPSILON rounding as every other number here', () => {
  // round1(-1.25) is -1.2, not -1.3 — the original's nudge, reproduced.
  assert.equal(roundLocation(-1.25), -1.2);
});

/* ---------------------------------------------------------------- Group D --
 * The tile grid.
 */

test('a viewport of exactly one tile asks for exactly one tile', () => {
  const tiles = tilesForView({ originX: 0, originY: 0, width: 256, height: 256, zoom: 0 });
  assert.equal(tiles.length, 1);
  assert.deepEqual(tiles[0], { x: 0, y: 0, z: 0, left: 0, top: 0 });
});

test('a half-tile offset asks for the neighbours and places them negatively', () => {
  const tiles = tilesForView({ originX: 128, originY: 128, width: 256, height: 256, zoom: 1 });
  assert.equal(tiles.length, 4);
  assert.deepEqual(
    tiles.map((t) => `${t.x}/${t.y}@${t.left},${t.top}`).sort(),
    ['0/0@-128,-128', '0/1@-128,128', '1/0@128,-128', '1/1@128,128']
  );
});

test('the grid never asks for a tile outside the pyramid', () => {
  for (let z = 0; z <= MAP_MAX_ZOOM; z++) {
    const n = 2 ** z;
    const tiles = tilesForView({
      originX: -600, originY: -600, width: worldSize(z) + 1200, height: worldSize(z) + 1200, zoom: z,
    });
    for (const t of tiles) {
      assert.ok(t.x >= 0 && t.x < n, `z${z} x ${t.x}`);
      assert.ok(t.y >= 0 && t.y < n, `z${z} y ${t.y}`);
    }
    assert.equal(tiles.length, n * n, `z${z} covers the whole level`);
  }
});

/* ---------------------------------------------------------------- Group E --
 * The viewport clamp — the original's `maxBounds`.
 */

test('a view larger than the reachable band is centred on it', () => {
  const width = 4000;
  const height = 4000;
  const { originX, originY } = clampOrigin({ originX: 9e9, originY: -9e9, width, height, zoom: 2 });
  const centreLon = worldXToLon(originX + width / 2, 2);
  const centreLat = worldYToLat(originY + height / 2, 2);
  assert.ok(Math.abs(centreLon) < 1e-9);
  assert.ok(Math.abs(centreLat) < 1e-9);
});

test('a view smaller than the band cannot be dragged past the clamp', () => {
  const width = 800;
  const height = 400;
  const far = clampOrigin({ originX: -9e9, originY: -9e9, width, height, zoom: 5 });
  assert.ok(worldYToLat(far.originY, 5) <= LAT_LIMIT + 1e-9);
  assert.ok(worldXToLon(far.originX, 5) >= -LONG_LIMIT - 1e-9);

  const other = clampOrigin({ originX: 9e9, originY: 9e9, width, height, zoom: 5 });
  assert.ok(worldYToLat(other.originY + height, 5) >= -LAT_LIMIT - 1e-9);
  assert.ok(worldXToLon(other.originX + width, 5) <= LONG_LIMIT + 1e-9);
});

test('the lowest useful zoom is the one where the world fills the frame', () => {
  // The picker's own surface: a 1040px dialog, capped at 520px tall.
  assert.equal(minZoomFor(1006, 520), 2, 'z2 is 1024px — the first to cover 1006');
  assert.equal(minZoomFor(1024, 520), 2);
  assert.equal(minZoomFor(1025, 520), 3);
  // A phone-sized surface may legitimately go further out.
  assert.equal(minZoomFor(320, 240), 1);
  assert.equal(minZoomFor(256, 200), 0);
  // And a wall of a screen cannot go past the pyramid.
  assert.equal(minZoomFor(20000, 20000), MAP_MAX_ZOOM);
});

test('the minimum never exceeds the zoom the picker opens at', () => {
  for (const [w, h] of [[320, 240], [640, 360], [1006, 520], [1400, 520]]) {
    assert.ok(minZoomFor(w, h) <= MAP_DEFAULT_ZOOM, `${w}x${h}`);
  }
});

/* ---------------------------------------------------------------- Group F --
 * The shipped pyramid covers everything the clamp can reach.
 */

/** Every tile the picker can request, over the viewport sizes it can have. */
function reachableTiles() {
  const wanted = new Set();
  // The surface is `min(58vh, 520px)` tall and as wide as a 1040px dialog allows;
  // the spread here brackets that on both sides.
  const viewports = [
    [320, 240], [640, 360], [900, 520], [1000, 520], [1400, 520],
  ];
  for (let z = MAP_MIN_ZOOM; z <= MAP_MAX_ZOOM; z++) {
    for (const [width, height] of viewports) {
      for (const corner of [[-9e9, -9e9], [9e9, 9e9], [-9e9, 9e9], [9e9, -9e9], [0, 0]]) {
        const { originX, originY } = clampOrigin({
          originX: corner[0], originY: corner[1], width, height, zoom: z,
        });
        for (const t of tilesForView({ originX, originY, width, height, zoom: z })) {
          wanted.add(`${t.z}/${t.x}/${t.y}`);
        }
      }
    }
  }
  return [...wanted];
}

test('every tile the picker can reach is present in assets/map', () => {
  const missing = reachableTiles().filter((key) => !existsSync(join(ROOT, 'assets', 'map', `${key}.jpg`)));
  assert.deepEqual(missing, [], `missing tiles: ${missing.slice(0, 12).join(', ')}`);
});

test('the pyramid is trimmed, not complete — the polar rows are deliberately absent', () => {
  // Documented in assets/map/README.md: z0-z3 whole, z4/z5 only the +/-66 band.
  assert.ok(existsSync(join(ROOT, 'assets', 'map', '5', '0', '8.jpg')), 'first shipped z5 row');
  assert.ok(!existsSync(join(ROOT, 'assets', 'map', '5', '0', '0.jpg')), 'polar z5 row not shipped');
});
