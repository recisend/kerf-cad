// Small software rasterizer: shaded parts + feature edges -> PNG bytes.
// No GPU or browser needed, so the MCP server can show Claude the model.
import { deflateSync } from 'node:zlib';
import { THREE, renderData, analyze } from './kernel.mjs';

const V3 = THREE.Vector3;
export const VIEWS = {
  iso: [1, -1, 0.85], 'iso-back': [-1, 1, 0.85], 'iso-left': [-1, -1, 0.85], 'iso-right': [1, 1, 0.85],
  top: [0, 0, 1], bottom: [0, 0, -1], front: [0, -1, 0], back: [0, 1, 0], right: [1, 0, 0], left: [-1, 0, 0],
};
const hex = (c) => { const h = String(c || '#9aa7b4').replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };

export function renderPNG(items, opts = {}) {
  const W = Math.round(Math.min(2000, Math.max(64, opts.width || 900))), H = Math.round(Math.min(2000, Math.max(64, opts.height || 650)));
  const SS = 2, w = W * SS, h = H * SS;
  const d = new V3(...(opts.direction || VIEWS[opts.view || 'iso'] || VIEWS.iso)).normalize();
  const up = Math.abs(d.z) > 0.99 ? new V3(0, 1, 0) : new V3(0, 0, 1);
  const R = new V3().crossVectors(up, d).normalize(), U = new V3().crossVectors(d, R).normalize();
  const L = d.clone().addScaledVector(R, -0.45).addScaledVector(U, 0.7).normalize();
  // fit
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, diag = 1;
  const box = new THREE.Box3();
  for (const it of items) { const b = it.solid.bbox(); box.union(b); for (const p of [b.min, b.max]) void p; }
  if (box.isEmpty()) box.set(new V3(-10, -10, -10), new V3(10, 10, 10));
  diag = box.min.distanceTo(box.max) || 1;
  for (let i = 0; i < 8; i++) {
    const p = new V3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    const sx = p.dot(R), sy = p.dot(U); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const scale = Math.min((w * 0.84) / Math.max(x1 - x0, 1e-6), (h * 0.84) / Math.max(y1 - y0, 1e-6));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const proj = (x, y, z) => { const sx = x * R.x + y * R.y + z * R.z, sy = x * U.x + y * U.y + z * U.z; return [(sx - cx) * scale + w / 2, h / 2 - (sy - cy) * scale, x * d.x + y * d.y + z * d.z]; };
  const col = new Float32Array(w * h * 3), zb = new Float32Array(w * h).fill(-Infinity);
  const top = opts.dark ? [0.17, 0.2, 0.23] : [0.965, 0.973, 0.98], bot = opts.dark ? [0.09, 0.1, 0.12] : [0.84, 0.87, 0.9];
  for (let y = 0; y < h; y++) { const t = y / (h - 1); for (let x = 0; x < w; x++) { const o = (y * w + x) * 3; for (let k = 0; k < 3; k++) col[o + k] = top[k] + (bot[k] - top[k]) * t; } }
  for (const it of items) {
    const base = hex(it.color); const rd = renderData(it.solid); const P = rd.pos, N = rd.nor; const nt = P.length / 9;
    for (let t = 0; t < nt; t++) {
      const vs = [0, 1, 2].map((k) => proj(P[t * 9 + k * 3], P[t * 9 + k * 3 + 1], P[t * 9 + k * 3 + 2]));
      const area = (vs[1][0] - vs[0][0]) * (vs[2][1] - vs[0][1]) - (vs[2][0] - vs[0][0]) * (vs[1][1] - vs[0][1]);
      if (area >= 0) continue; // back-facing (screen y points down)
      const I = [0, 1, 2].map((k) => { const nx = N[t * 9 + k * 3], ny = N[t * 9 + k * 3 + 1], nz = N[t * 9 + k * 3 + 2]; const ndl = Math.max(0, nx * L.x + ny * L.y + nz * L.z); const ndv = Math.max(0, nx * d.x + ny * d.y + nz * d.z); return 0.32 + 0.6 * ndl + 0.18 * Math.pow(ndv, 24); });
      const minX = Math.max(0, Math.floor(Math.min(vs[0][0], vs[1][0], vs[2][0]))), maxX = Math.min(w - 1, Math.ceil(Math.max(vs[0][0], vs[1][0], vs[2][0])));
      const minY = Math.max(0, Math.floor(Math.min(vs[0][1], vs[1][1], vs[2][1]))), maxY = Math.min(h - 1, Math.ceil(Math.max(vs[0][1], vs[1][1], vs[2][1])));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((vs[1][0] - px) * (vs[2][1] - py) - (vs[2][0] - px) * (vs[1][1] - py)) / area;
        const w1 = ((vs[2][0] - px) * (vs[0][1] - py) - (vs[0][0] - px) * (vs[2][1] - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const z = w0 * vs[0][2] + w1 * vs[1][2] + w2 * vs[2][2]; const i = y * w + x;
        if (z <= zb[i]) continue;
        zb[i] = z; const s = w0 * I[0] + w1 * I[1] + w2 * I[2];
        for (let k = 0; k < 3; k++) col[i * 3 + k] = Math.min(1, base[k] * s + (s > 0.95 ? (s - 0.95) * 0.8 : 0));
      }
    }
  }
  if (opts.edges !== false) {
    const eps = diag * 0.004; const ec = opts.dark ? [0.03, 0.04, 0.05] : [0.1, 0.13, 0.16];
    for (const it of items) for (const e of analyze(it.solid).edges) for (let i = 1; i < e.pts.length; i++) {
      const a = proj(e.pts[i - 1].x, e.pts[i - 1].y, e.pts[i - 1].z), b = proj(e.pts[i].x, e.pts[i].y, e.pts[i].z);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const steps = Math.max(1, Math.ceil(len * 2));
      for (let s = 0; s <= steps; s++) {
        const f = s / steps; const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + (b[2] - a[2]) * f;
        for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
          const X = Math.round(x) + ox, Y = Math.round(y) + oy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const i = Y * w + X; if (z < zb[i] - eps) continue;
          col[i * 3] = ec[0]; col[i * 3 + 1] = ec[1]; col[i * 3 + 2] = ec[2];
        }
      }
    }
  }
  // downsample + PNG
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) {
      let s = 0; for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) s += col[((y * SS + j) * w + x * SS + i) * 3 + k];
      raw[y * (W * 3 + 1) + 1 + x * 3 + k] = Math.round(Math.min(1, Math.max(0, s / (SS * SS))) * 255);
    }
  }
  return encodePNG(W, H, raw);
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(W, H, raw) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
