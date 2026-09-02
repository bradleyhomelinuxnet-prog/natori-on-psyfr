/**
 * Web Mercator, for the offline coordinate picker.
 *
 * The original reached this geometry through Leaflet 1.8 (144 KB) purely to put
 * a marker on a 1 365-tile pyramid and read a latitude back out of a click. The
 * whole of what it used is on this page: forward and inverse projection, a tile
 * grid, and the clamp that keeps a picked point inside the band the sunset
 * arithmetic can survive.
 *
 * Pure, no DOM. The picker's arithmetic is therefore testable headless, which
 * is the point — `tests/map.test.mjs` checks the round trip and the corners
 * without a browser.
 */

import { roundToPrecision } from './numeric.js';
import { LAT_LIMIT, LONG_LIMIT } from './constants.js';

/** Tile edge, in pixels. Fixed by the pyramid shipped with the original. */
export const TILE_SIZE = 256;

/** `MAP_MAX_ZOOM` in the original: "tiles are only generated up to this point." */
export const MAP_MAX_ZOOM = 5;
export const MAP_MIN_ZOOM = 0;

/** `DEFAULT_MAP_SELECTION_ZOOM` — the zoom the picker opens at. */
export const MAP_DEFAULT_ZOOM = 4;

/**
 * The latitude at which the Mercator world becomes square. Beyond it the
 * projection runs to infinity, so it is the edge of the tile pyramid — not a
 * limit on where an event may be, which is `LAT_LIMIT` and much tighter.
 */
export const MERCATOR_LIMIT = 85.05112877980659;

const RAD = Math.PI / 180;

/** Width of the whole world at zoom `z`, in pixels. */
export const worldSize = (z) => TILE_SIZE * 2 ** z;

/** Longitude to world pixels. Wraps nothing: the pyramid is `noWrap`. */
export function lonToWorldX(lon, z) {
  return ((lon + 180) / 360) * worldSize(z);
}

/** Latitude to world pixels, clamped to where the projection is finite. */
export function latToWorldY(lat, z) {
  const phi = Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lat)) * RAD;
  const y = (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
  return y * worldSize(z);
}

export function worldXToLon(x, z) {
  return (x / worldSize(z)) * 360 - 180;
}

export function worldYToLat(y, z) {
  const n = Math.PI * (1 - (2 * y) / worldSize(z));
  return Math.atan(Math.sinh(n)) / RAD;
}

/**
 * Round a coordinate the way the original did — `DECIMAL_PRECISION__LOCATION`
 * is 1, and the rounding carries the same `Number.EPSILON` nudge as every other
 * number in the program.
 */
export const roundLocation = (v) => roundToPrecision(v, 1);

/**
 * A picked point, as the original produced one: rounded to a tenth of a degree,
 * then constrained, then rounded again. `constrainLatOrLongValue` rounds on its
 * way out, so the double rounding is the original's, not an accident here.
 */
export function pickCoordinate(lat, long) {
  const clampedLat = Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, roundLocation(lat)));
  const clampedLong = Math.max(-LONG_LIMIT, Math.min(LONG_LIMIT, roundLocation(long)));
  return { lat: roundLocation(clampedLat), long: roundLocation(clampedLong) };
}

/**
 * The tiles covering a viewport.
 *
 * @param {object} view
 * @param {number} view.originX world pixels at the left edge of the viewport
 * @param {number} view.originY world pixels at the top edge
 * @param {number} view.width viewport width in pixels
 * @param {number} view.height viewport height in pixels
 * @param {number} view.zoom integer zoom
 * @returns {Array<{x:number,y:number,z:number,left:number,top:number}>}
 *   `left`/`top` are viewport-relative pixel offsets for the tile's corner.
 */
export function tilesForView({ originX, originY, width, height, zoom }) {
  const n = 2 ** zoom;
  const x0 = Math.floor(originX / TILE_SIZE);
  const y0 = Math.floor(originY / TILE_SIZE);
  const x1 = Math.floor((originX + width - 1) / TILE_SIZE);
  const y1 = Math.floor((originY + height - 1) / TILE_SIZE);

  const out = [];
  for (let y = Math.max(0, y0); y <= Math.min(n - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(n - 1, x1); x++) {
      out.push({
        x,
        y,
        z: zoom,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }
  return out;
}

/**
 * The lowest zoom worth showing at this viewport size.
 *
 * `MAP_MIN_ZOOM` is a property of the pyramid; this is a property of the
 * window. Zooming out past the point where the world stops filling the frame
 * leaves a postage stamp adrift in an empty rectangle, which is what the
 * original did at zoom 0 and is no use to anyone. Below the whole pyramid the
 * answer is `MAP_MIN_ZOOM`, so a very large viewport still opens somewhere.
 */
export function minZoomFor(width, height) {
  const need = Math.max(width, height);
  for (let z = MAP_MIN_ZOOM; z <= MAP_MAX_ZOOM; z++) {
    if (worldSize(z) >= need) return z;
  }
  return MAP_MAX_ZOOM;
}

/**
 * Keep the viewport over the reachable world.
 *
 * The original set `maxBounds` to ±`LAT_LIMIT` / ±`LONG_LIMIT`, which is why
 * the pyramid in `assets/map/` carries only the rows that band can reach. When
 * the world is smaller than the viewport the axis is centred instead of
 * clamped, which is what stops a zoomed-out map from pinning to one corner.
 */
export function clampOrigin({ originX, originY, width, height, zoom }) {
  const minX = lonToWorldX(-LONG_LIMIT, zoom);
  const maxX = lonToWorldX(LONG_LIMIT, zoom);
  const minY = latToWorldY(LAT_LIMIT, zoom);
  const maxY = latToWorldY(-LAT_LIMIT, zoom);

  const fit = (origin, lo, hi, extent) =>
    hi - lo <= extent ? (lo + hi - extent) / 2 : Math.max(lo, Math.min(hi - extent, origin));

  return {
    originX: fit(originX, minX, maxX, width),
    originY: fit(originY, minY, maxY, height),
  };
}
