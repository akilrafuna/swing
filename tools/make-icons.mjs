// Renders the home-screen PNG icons for both apps without any dependencies.
// Run: node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/* ---------- minimal PNG encoder ---------- */
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, shade) {
  const SS = 4, stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = shade((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
        r += c[0]; g += c[1]; b += c[2];
      }
      const o = y * stride + 1 + x * 4, n = SS * SS;
      raw[o] = Math.round(r / n); raw[o + 1] = Math.round(g / n); raw[o + 2] = Math.round(b / n); raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- drawing helpers ---------- */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
// signed distance to a rotated rounded rectangle
function rrect(px, py, cx, cy, w, h, r, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const dx = px - cx, dy = py - cy;
  const x = dx * c + dy * s, y = -dx * s + dy * c;
  const qx = Math.abs(x) - (w / 2 - r), qy = Math.abs(y) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const toWorld = (cx, cy, rot, lx, ly) => [cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)];

/* ---------- Nebula: ringed planet on violet ---------- */
function nebula(u, v) {
  let col = mix(hex('#8b6cff'), hex('#3b1d9e'), (u + v) / 2);
  col = mix(col, hex('#c4b5ff'), Math.max(0, 1 - Math.hypot(u - 0.28, v - 0.22) / 0.55) * 0.35);
  const dx = u - 0.5, dy = v - 0.5, R = 0.2;
  const a = -0.42, ca = Math.cos(a), sa = Math.sin(a);
  const rx = dx * ca + dy * sa, ry = -dx * sa + dy * ca;
  const A = 0.37, B = 0.1;
  const q = Math.hypot(rx / A, ry / B) || 1e-6;
  const ringD = Math.abs((q - 1) / Math.hypot(rx / (A * A * q), ry / (B * B * q)));
  const inPlanet = Math.hypot(dx, dy) < R;
  const front = ry > 0;
  if (!front && !inPlanet && ringD < 0.022) col = hex('#ffffff');
  if (inPlanet) col = mix(hex('#ffffff'), hex('#cdbfff'), Math.hypot(dx + 0.07, dy + 0.08) / (R * 1.6));
  if (front && inPlanet && ringD < 0.036) col = hex('#5a3fd0');
  if (front && ringD < 0.022) col = hex('#ffffff');
  return col;
}

/* ---------- Pocket: two tilted cards on black ---------- */
function pocket(u, v) {
  let col = mix(hex('#2c2c2e'), hex('#050505'), v);
  const back = rrect(u, v, 0.56, 0.41, 0.6, 0.38, 0.055, 0.2);
  if (back < 0) col = mix(hex('#2dd4bf'), hex('#3b82f6'), u);
  const F = [0.46, 0.58, -0.14];
  const front = rrect(u, v, F[0], F[1], 0.62, 0.39, 0.055, F[2]);
  if (front >= 0 && front < 0.035) col = mix(col, [0, 0, 0], 0.55 * (1 - front / 0.035));
  if (front < 0) {
    col = mix(hex('#ff9f0a'), hex('#ff375f'), (u + v) / 2 - 0.15);
    const [chx, chy] = toWorld(F[0], F[1], F[2], -0.17, -0.02);
    if (rrect(u, v, chx, chy, 0.1, 0.075, 0.016, F[2]) < 0) col = hex('#ffe4a3');
    const [lx, ly] = toWorld(F[0], F[1], F[2], 0.05, 0.11);
    if (rrect(u, v, lx, ly, 0.36, 0.03, 0.015, F[2]) < 0) col = mix(col, hex('#ffffff'), 0.55);
  }
  return col;
}

for (const [app, shade] of [['nebula', nebula], ['pocket', pocket]]) {
  for (const size of [180, 192, 512]) {
    writeFileSync(`${root}${app}/icon-${size}.png`, png(size, shade));
  }
  console.log(`${app}: icons written`);
}
