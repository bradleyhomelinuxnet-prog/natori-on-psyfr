/**
 * A minimal ZIP writer, and the deflate wrapper the PDF exporter borrows.
 *
 * An .xlsx is a ZIP of XML parts, so writing one means writing a ZIP. Pulling in
 * a compression library for that would be the only runtime dependency in the
 * whole application, to save bytes on files that are a few kilobytes of text.
 * Instead this stores entries uncompressed — which the format explicitly allows
 * — and every spreadsheet program opens the result.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const utf8 = (s) => new TextEncoder().encode(s);

/**
 * Wrap bytes as a zlib stream using stored (uncompressed) deflate blocks.
 *
 * Valid deflate: BTYPE 00 means "no compression", and a decoder must accept it.
 * That makes this a legal /FlateDecode stream for a PDF without shipping a
 * compressor.
 */
export function zlibStored(bytes) {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(bytes.length / MAX));
  const out = new Uint8Array(2 + bytes.length + blocks * 5 + 4);
  let p = 0;

  out[p++] = 0x78; // CMF: deflate, 32K window
  out[p++] = 0x01; // FLG: no dictionary, fastest

  for (let i = 0; i < blocks; i++) {
    const start = i * MAX;
    const len = Math.min(MAX, bytes.length - start);
    out[p++] = i === blocks - 1 ? 1 : 0; // BFINAL on the last block, BTYPE 00
    out[p++] = len & 0xff;
    out[p++] = (len >> 8) & 0xff;
    out[p++] = ~len & 0xff;
    out[p++] = (~len >> 8) & 0xff;
    out.set(bytes.subarray(start, start + len), p);
    p += len;
  }

  // Adler-32 of the uncompressed data.
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = ((b << 16) | a) >>> 0;
  out[p++] = (adler >>> 24) & 0xff;
  out[p++] = (adler >>> 16) & 0xff;
  out[p++] = (adler >>> 8) & 0xff;
  out[p++] = adler & 0xff;

  return out.subarray(0, p);
}

/**
 * Build a ZIP from `{ name -> string | Uint8Array }`.
 *
 * @returns {Blob}
 */
export function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];

  for (const [name, content] of Object.entries(files)) {
    const data = typeof content === 'string' ? utf8(content) : content;
    const nameBytes = utf8(name);
    const sum = crc32(data);

    // Local file header. Stored, no data descriptor, a fixed DOS timestamp so
    // the same input always produces byte-identical output.
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0x2151), // 1990-01-01, arbitrary but stable
      ...u32(sum), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), ...u16(0),
    ];
    chunks.push(new Uint8Array(local), nameBytes, data);

    central.push([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0x2151),
      ...u32(sum), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(offset),
      ...Array.from(nameBytes),
    ]);

    offset += local.length + nameBytes.length + data.length;
  }

  const dir = new Uint8Array(central.flat());
  chunks.push(dir);
  chunks.push(
    new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0),
      ...u16(central.length), ...u16(central.length),
      ...u32(dir.length), ...u32(offset), ...u16(0),
    ])
  );

  return new Blob(chunks, { type: 'application/octet-stream' });
}
