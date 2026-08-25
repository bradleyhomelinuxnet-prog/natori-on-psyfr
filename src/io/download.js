/**
 * Handing a file to the user.
 *
 * The original wrote files through an Electron IPC bridge that called
 * fs.writeFile with no path validation — the renderer could drop a file
 * anywhere on disk. In a browser the only thing we can do is offer a download,
 * which is both sufficient and safe: the user picks the destination.
 */

/** Trigger a download of `text` as `filename`. */
export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Revoke on the next tick; revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A filesystem-safe timestamp for generated filenames: 2026-08-25_1432. */
export function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Hand a Blob to the user under `filename`. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
