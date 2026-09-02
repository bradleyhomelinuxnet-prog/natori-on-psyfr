/**
 * The offline coordinate picker.
 *
 * The original shipped a 1 365-tile pyramid — 97 % of its asset payload — and
 * 144 KB of Leaflet, so that an air-gapped machine could still click a place on
 * a map instead of typing two numbers. The tiles were the reason; Leaflet was
 * not. This is the same pyramid (trimmed to the rows the ±65 clamp can reach,
 * see `assets/map/README.md`) driven by ~200 lines of pan-and-zoom.
 *
 * Three things it does that the original did not, all of them cheap once the
 * overlay canvas exists:
 *
 *   - a graticule, so a coastline is not the only way to know where you are;
 *   - the ±65 latitude clamp drawn as a shaded band rather than applied
 *     silently after the click;
 *   - the sunset time the picked point actually produces, which is the one
 *     thing a coordinate changes in this program.
 *
 * It works with the tiles absent: the graticule, the readout and the pick all
 * come from arithmetic, so a checkout without `assets/map/` still picks
 * coordinates — it just does it over an empty sea.
 */

import { el } from '../dom.js';
import {
  MAP_MAX_ZOOM, MAP_DEFAULT_ZOOM, minZoomFor, worldSize,
  lonToWorldX, latToWorldY, worldXToLon, worldYToLat,
  tilesForView, clampOrigin, pickCoordinate,
} from '../../core/ophis/mercator.js';
import { LAT_LIMIT, LONG_LIMIT } from '../../core/ophis/constants.js';
import { sunsetMs, roundToNearestMinute } from '../../core/ophis/sun.js';

const TILE_URL = (z, x, y) => `assets/map/${z}/${x}/${y}.jpg`;

/** Graticule spacing per zoom. Coarse when zoomed out, or it turns to hatching. */
const GRATICULE_STEP = [60, 60, 30, 30, 15, 10];

/** How far the pointer may travel before a click counts as a drag, in pixels. */
const DRAG_SLOP = 4;

/* --------------------------------------------------------------- readouts -- */

/** `12.3° N` — the sign spelled out, because a leading minus is easy to miss. */
function readableCoordinate(value, axis) {
  const hemi = axis === 'lat' ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
  return `${Math.abs(value).toFixed(1)}° ${hemi}`;
}

/** The sunset the engine would compute there, or why it cannot. */
function sunsetLabel(lat, long, whenMs) {
  if (Math.abs(lat) > LAT_LIMIT) return 'outside the ±65 band';
  const ms = roundToNearestMinute(sunsetMs(whenMs, lat, long));
  if (!Number.isFinite(ms)) return 'no sunset (polar day or night)';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/* ------------------------------------------------------------------ picker -- */

/**
 * Open the picker.
 *
 * @param {object} opts
 * @param {number} opts.lat starting latitude
 * @param {number} opts.long starting longitude
 * @param {number} opts.whenMs the date the sunset preview is computed for
 * @returns {Promise<{lat:number,long:number}|null>} null if dismissed
 */
export function openMapPicker({ lat = 0, long = 0, whenMs = Date.now() } = {}) {
  return new Promise((resolve) => {
    let zoom = MAP_DEFAULT_ZOOM;
    let originX = 0;
    let originY = 0;
    let picked = { lat: pickCoordinate(lat, long).lat, long: pickCoordinate(lat, long).long };
    let settled = false;

    /* ---- the furniture ---- */

    const surface = el('div.mapsurface', { tabindex: '0', role: 'application',
      'aria-label': 'Map. Drag to pan, plus and minus to zoom, Enter to place the marker at the centre.' });
    const tileLayer = el('div.maptiles', { 'aria-hidden': 'true' });
    const overlay = el('canvas.mapoverlay', { 'aria-hidden': 'true' });
    surface.append(tileLayer, overlay);

    const hudCoords = el('b', { text: '' });
    const hudSunset = el('span', { text: '' });
    const hud = el('div.maphud', {}, [hudCoords, el('span.sep', { text: '·' }), hudSunset]);

    const zoomLabel = el('span.mapzoom', { text: '' });
    const zoomBtn = (label, delta, title) =>
      el('button.btn.sm', { type: 'button', text: label, title, onclick: () => setZoom(zoom + delta) });

    const confirm = el('button.btn.primary', {
      type: 'button', text: 'Use these coordinates', onclick: () => finish(picked),
    });

    const dlg = el('dialog.mapdlg', {}, [
      el('header', {}, [
        el('h3', { text: 'Pick a location' }),
        el('div.grow', {}),
        zoomBtn('−', -1, 'Zoom out'),
        zoomLabel,
        zoomBtn('+', 1, 'Zoom in'),
      ]),
      el('div.body', {}, [
        surface,
        hud,
        el('p.note', {
          text:
            'Latitude is clamped to ±65: every sunset library becomes unreliable nearer the poles, ' +
            'and the original clamped there for the same reason. Coordinates round to a tenth of a degree.',
        }),
      ]),
      el('footer', {}, [
        el('button.btn', { type: 'button', text: 'Cancel', onclick: () => finish(null) }),
        confirm,
      ]),
    ]);

    /* ---- rendering ---- */

    const live = new Map(); // "z/x/y" -> img, so a pan reuses what is already decoded

    function paintTiles(width, height) {
      const wanted = tilesForView({ originX, originY, width, height, zoom });
      const seen = new Set();

      for (const t of wanted) {
        const key = `${t.z}/${t.x}/${t.y}`;
        seen.add(key);
        let img = live.get(key);
        if (!img) {
          img = el('img', { src: TILE_URL(t.z, t.x, t.y), alt: '', draggable: 'false', loading: 'eager' });
          img.addEventListener('error', () => img.classList.add('missing'), { once: true });
          live.set(key, img);
          tileLayer.append(img);
        }
        img.style.transform = `translate(${Math.round(t.left)}px, ${Math.round(t.top)}px)`;
      }

      for (const [key, img] of live) {
        if (!seen.has(key)) { img.remove(); live.delete(key); }
      }
    }

    function paintOverlay(width, height) {
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (overlay.width !== Math.round(width * dpr) || overlay.height !== Math.round(height * dpr)) {
        overlay.width = Math.round(width * dpr);
        overlay.height = Math.round(height * dpr);
      }
      const g = overlay.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, height);

      const css = getComputedStyle(document.documentElement);
      const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
      const line = token('--map-grid', 'rgba(255,255,255,.3)');
      const axis = token('--map-axis', 'rgba(255,255,255,.55)');
      const veil = token('--map-veil', 'rgba(6,6,11,.58)');
      const halo = token('--map-halo', 'rgba(6,6,11,.85)');
      const gold = token('--gold', '#d8a943');

      const px = (lon) => lonToWorldX(lon, zoom) - originX;
      const py = (lat) => latToWorldY(lat, zoom) - originY;

      // Everything below is geography, so it stops where the world does — a
      // graticule ruled across the void either side of a zoomed-out map reads
      // as ocean that is not there.
      g.save();
      g.beginPath();
      g.rect(-originX, -originY, worldSize(zoom), worldSize(zoom));
      g.clip();

      // The band the sunset arithmetic cannot leave — drawn, rather than
      // applied silently to the coordinate after the click.
      g.fillStyle = veil;
      const top = py(LAT_LIMIT);
      const bottom = py(-LAT_LIMIT);
      if (top > 0) g.fillRect(0, 0, width, top);
      if (bottom < height) g.fillRect(0, bottom, width, height - bottom);

      // Graticule.
      const step = GRATICULE_STEP[zoom] ?? 15;
      g.lineWidth = 1;
      g.beginPath();
      for (let lon = -180; lon <= 180; lon += step) {
        const x = Math.round(px(lon)) + 0.5;
        g.moveTo(x, 0); g.lineTo(x, height);
      }
      for (let la = -80; la <= 80; la += step) {
        const y = Math.round(py(la)) + 0.5;
        g.moveTo(0, y); g.lineTo(width, y);
      }
      g.strokeStyle = line;
      g.stroke();

      // Equator and prime meridian, drawn heavier.
      g.beginPath();
      g.moveTo(0, Math.round(py(0)) + 0.5); g.lineTo(width, Math.round(py(0)) + 0.5);
      g.moveTo(Math.round(px(0)) + 0.5, 0); g.lineTo(Math.round(px(0)) + 0.5, height);
      g.strokeStyle = axis;
      g.globalAlpha = 0.45;
      g.stroke();
      g.globalAlpha = 1;

      // The clamp edges.
      g.beginPath();
      g.moveTo(0, Math.round(top) + 0.5); g.lineTo(width, Math.round(top) + 0.5);
      g.moveTo(0, Math.round(bottom) + 0.5); g.lineTo(width, Math.round(bottom) + 0.5);
      g.strokeStyle = gold;
      g.globalAlpha = 0.35;
      g.stroke();
      g.globalAlpha = 1;

      g.restore();

      // The marker. Drawn twice — a dark halo under a gold stroke — because the
      // basemap runs from pale ocean to saturated yellow and a single-colour
      // marker disappears into one of them.
      const mx = px(picked.long);
      const my = py(picked.lat);
      if (mx >= -20 && mx <= width + 20 && my >= -20 && my <= height + 20) {
        const crosshair = () => {
          g.beginPath();
          g.moveTo(mx - 12, my); g.lineTo(mx - 5, my);
          g.moveTo(mx + 5, my); g.lineTo(mx + 12, my);
          g.moveTo(mx, my - 12); g.lineTo(mx, my - 5);
          g.moveTo(mx, my + 5); g.lineTo(mx, my + 12);
          g.arc(mx, my, 4.5, 0, Math.PI * 2);
          g.stroke();
        };
        g.lineCap = 'round';
        g.strokeStyle = halo;
        g.lineWidth = 4;
        crosshair();
        g.strokeStyle = gold;
        g.lineWidth = 1.6;
        crosshair();
        g.beginPath();
        g.arc(mx, my, 2, 0, Math.PI * 2);
        g.fillStyle = gold;
        g.fill();
      }
    }

    function paintHud(lat, long) {
      hudCoords.textContent = `${readableCoordinate(lat, 'lat')}   ${readableCoordinate(long, 'long')}`;
      hudSunset.textContent = `sunset ${sunsetLabel(lat, long, whenMs)}`;
    }

    function render() {
      const r = surface.getBoundingClientRect();
      const width = Math.max(1, Math.round(r.width));
      const height = Math.max(1, Math.round(r.height));
      // A window can shrink under a zoom that was legal when it was picked.
      zoom = Math.max(minZoomFor(width, height), Math.min(MAP_MAX_ZOOM, zoom));
      ({ originX, originY } = clampOrigin({ originX, originY, width, height, zoom }));
      paintTiles(width, height);
      paintOverlay(width, height);
      zoomLabel.textContent = `z${zoom}`;
    }

    /* ---- view control ---- */

    function centreOn(lat, long) {
      const r = surface.getBoundingClientRect();
      originX = lonToWorldX(long, zoom) - r.width / 2;
      originY = latToWorldY(lat, zoom) - r.height / 2;
      render();
    }

    function setZoom(next, anchor) {
      const r = surface.getBoundingClientRect();
      const z = Math.max(minZoomFor(r.width, r.height), Math.min(MAP_MAX_ZOOM, next));
      if (z === zoom) return;
      const ax = anchor ? anchor.x : r.width / 2;
      const ay = anchor ? anchor.y : r.height / 2;
      // Hold the point under the anchor still across the zoom.
      const lon = worldXToLon(originX + ax, zoom);
      const la = worldYToLat(originY + ay, zoom);
      zoom = z;
      originX = lonToWorldX(lon, zoom) - ax;
      originY = latToWorldY(la, zoom) - ay;
      render();
    }

    function setPicked(lat, long) {
      picked = pickCoordinate(lat, long);
      paintHud(picked.lat, picked.long);
      render();
    }

    const atPointer = (e) => {
      const r = surface.getBoundingClientRect();
      return {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        lat: worldYToLat(originY + (e.clientY - r.top), zoom),
        long: worldXToLon(originX + (e.clientX - r.left), zoom),
      };
    };

    /* ---- interaction ---- */

    let dragFrom = null;
    let dragged = false;

    surface.addEventListener('pointerdown', (e) => {
      dragFrom = { x: e.clientX, y: e.clientY, originX, originY };
      dragged = false;
      surface.setPointerCapture(e.pointerId);
    });

    surface.addEventListener('pointermove', (e) => {
      if (dragFrom) {
        const dx = e.clientX - dragFrom.x;
        const dy = e.clientY - dragFrom.y;
        if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) dragged = true;
        originX = dragFrom.originX - dx;
        originY = dragFrom.originY - dy;
        render();
      }
      const p = atPointer(e);
      paintHud(pickCoordinate(p.lat, p.long).lat, pickCoordinate(p.lat, p.long).long);
    });

    const endDrag = (e) => {
      if (!dragFrom) return;
      const wasDrag = dragged;
      dragFrom = null;
      surface.releasePointerCapture?.(e.pointerId);
      if (!wasDrag) {
        const p = atPointer(e);
        setPicked(p.lat, p.long);
      }
    };
    surface.addEventListener('pointerup', endDrag);
    surface.addEventListener('pointercancel', () => { dragFrom = null; });

    surface.addEventListener('mouseleave', () => paintHud(picked.lat, picked.long));

    surface.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = surface.getBoundingClientRect();
      setZoom(zoom + (e.deltaY < 0 ? 1 : -1), { x: e.clientX - r.left, y: e.clientY - r.top });
    }, { passive: false });

    surface.addEventListener('dblclick', (e) => {
      const r = surface.getBoundingClientRect();
      setZoom(zoom + 1, { x: e.clientX - r.left, y: e.clientY - r.top });
    });

    surface.addEventListener('keydown', (e) => {
      const nudge = e.shiftKey ? 120 : 40;
      const moves = {
        ArrowLeft: [-nudge, 0], ArrowRight: [nudge, 0],
        ArrowUp: [0, -nudge], ArrowDown: [0, nudge],
      };
      if (moves[e.key]) {
        e.preventDefault();
        originX += moves[e.key][0];
        originY += moves[e.key][1];
        render();
        const r = surface.getBoundingClientRect();
        paintHud(
          pickCoordinate(worldYToLat(originY + r.height / 2, zoom), 0).lat,
          pickCoordinate(0, worldXToLon(originX + r.width / 2, zoom)).long
        );
        return;
      }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom + 1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(zoom - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const r = surface.getBoundingClientRect();
        setPicked(
          worldYToLat(originY + r.height / 2, zoom),
          worldXToLon(originX + r.width / 2, zoom)
        );
      }
    });

    /* ---- lifecycle ---- */

    function finish(value) {
      if (settled) return;
      settled = true;
      removeEventListener('resize', onResize);
      dlg.close();
      dlg.remove();
      resolve(value);
    }

    const onResize = () => render();
    addEventListener('resize', onResize);

    dlg.addEventListener('close', () => finish(null));
    dlg.addEventListener('cancel', () => finish(null));

    document.body.append(dlg);
    dlg.showModal();

    // The dialog has to be laid out before the viewport has a size to fill.
    requestAnimationFrame(() => {
      const r = surface.getBoundingClientRect();
      zoom = Math.max(minZoomFor(r.width, r.height), MAP_DEFAULT_ZOOM);
      centreOn(picked.lat, picked.long);
      paintHud(picked.lat, picked.long);
      surface.focus();
    });
  });
}
