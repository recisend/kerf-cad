/* =====================================================================
   Geometry kernel: triangle-mesh solids that carry a face id per
   triangle, so faces and edges keep their identity through booleans.
   ===================================================================== */
let FID = 1;
const newFid = () => FID++;
const WELD = 4e-4;

class Solid {
  constructor(pos, idx, fid) { this.pos = pos; this.idx = idx; this.fid = fid; this._an = null; this._brush = null; this._bb = null; }
  get nt() { return this.idx.length / 3; }
  get nv() { return this.pos.length / 3; }
  vert(i, t = new V3()) { return t.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]); }
  bbox() {
    if (this._bb) return this._bb;
    const b = new THREE.Box3();
    const p = this.pos;
    for (let i = 0; i < p.length; i += 3) b.expandByPoint(new V3(p[i], p[i + 1], p[i + 2]));
    return (this._bb = b);
  }
}

/* Build a solid from triangle soup: P = flat xyz per triangle corner, F = face id per triangle */
function weldTris(P, F) {
  const map = new Map(), pos = [], idx = [], fid = [];
  const inv = 1 / WELD, t2 = WELD * WELD;
  const vid = (x, y, z) => {
    const i = Math.round(x * inv), j = Math.round(y * inv), k = Math.round(z * inv);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const l = map.get((i + a) + ',' + (j + b) + ',' + (k + c));
      if (l) for (const v of l) { const dx = pos[v * 3] - x, dy = pos[v * 3 + 1] - y, dz = pos[v * 3 + 2] - z; if (dx * dx + dy * dy + dz * dz <= t2) return v; }
    }
    const v = pos.length / 3; pos.push(x, y, z);
    const key = i + ',' + j + ',' + k; const l = map.get(key); if (l) l.push(v); else map.set(key, [v]);
    return v;
  };
  const nt = F.length;
  for (let t = 0; t < nt; t++) {
    const o = t * 9;
    const a = vid(P[o], P[o + 1], P[o + 2]), b = vid(P[o + 3], P[o + 4], P[o + 5]), c = vid(P[o + 6], P[o + 7], P[o + 8]);
    if (a === b || b === c || a === c) continue;
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * cx + cy * cy + cz * cz < 1e-14) continue;
    idx.push(a, b, c); fid.push(F[t]);
  }
  return fixT(new Solid(Float32Array.from(pos), Uint32Array.from(idx), Int32Array.from(fid)));
}

/* Remove T-junctions so neighbouring triangles share whole edges */
function fixT(s) {
  const { pos, idx, fid } = s; const nv = s.nv, nt = s.nt;
  if (!nt) return s;
  const bb = s.bbox(); const diag = bb.max.distanceTo(bb.min) || 1;
  let L = 0;
  for (let t = 0; t < Math.min(nt, 2000); t++) { const a = idx[t * 3], b = idx[t * 3 + 1]; L += Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]); }
  L /= Math.min(nt, 2000);
  const cell = Math.max(L, diag / 80, 1e-3);
  const grid = new Map();
  const key = (i, j, k) => i + ',' + j + ',' + k;
  for (let v = 0; v < nv; v++) {
    const k = key(Math.floor(pos[v * 3] / cell), Math.floor(pos[v * 3 + 1] / cell), Math.floor(pos[v * 3 + 2] / cell));
    let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(v);
  }
  const tol = Math.max(WELD * 0.6, diag * 1e-7);
  const cand = new Set();
  const useCnt = new Map();
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = idx[t * 3 + k], b = idx[t * 3 + (k + 1) % 3]; const key = a < b ? a * nv + b : b * nv + a;
    useCnt.set(key, (useCnt.get(key) || 0) + 1);
  }
  let openCount = 0; for (const v of useCnt.values()) if (v === 1) openCount++;
  if (!openCount) return s;
  const onEdge = (a, b, c) => {
    if (useCnt.get(a < b ? a * nv + b : b * nv + a) !== 1) return null;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const dx = pos[b * 3] - ax, dy = pos[b * 3 + 1] - ay, dz = pos[b * 3 + 2] - az;
    const len = Math.hypot(dx, dy, dz); if (len < 1e-9) return null;
    const steps = Math.ceil(len / cell) + 1;
    cand.clear();
    for (let s2 = 0; s2 <= steps; s2++) {
      const f = s2 / steps;
      const ci = Math.floor((ax + dx * f) / cell), cj = Math.floor((ay + dy * f) / cell), ck = Math.floor((az + dz * f) / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const g = grid.get(key(ci + i, cj + j, ck + k)); if (g) for (const v of g) cand.add(v);
      }
    }
    let out = null;
    for (const v of cand) {
      if (v === a || v === b || v === c) continue;
      const px = pos[v * 3] - ax, py = pos[v * 3 + 1] - ay, pz = pos[v * 3 + 2] - az;
      const t = (px * dx + py * dy + pz * dz) / (len * len);
      if (t <= 1e-6 || t >= 1 - 1e-6) continue;
      const ex = px - dx * t, ey = py - dy * t, ez = pz - dz * t;
      if (ex * ex + ey * ey + ez * ez < tol * tol) (out || (out = [])).push([t, v]);
    }
    if (out) out.sort((p, q) => p[0] - q[0]);
    return out;
  };
  const newPos = Array.from(pos), newIdx = [], newFid = [];
  let changed = false;
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    const e1 = onEdge(a, b, c), e2 = onEdge(b, c, a), e3 = onEdge(c, a, b);
    if (!e1 && !e2 && !e3) { newIdx.push(a, b, c); newFid.push(fid[t]); continue; }
    changed = true;
    const poly = [a, ...(e1 || []).map((q) => q[1]), b, ...(e2 || []).map((q) => q[1]), c, ...(e3 || []).map((q) => q[1])];
    // project to the triangle plane and ear-clip (no new vertices)
    const ox = pos[a * 3], oy = pos[a * 3 + 1], oz = pos[a * 3 + 2];
    const ux = pos[b * 3] - ox, uy = pos[b * 3 + 1] - oy, uz = pos[b * 3 + 2] - oz;
    const wx = pos[c * 3] - ox, wy = pos[c * 3 + 1] - oy, wz = pos[c * 3 + 2] - oz;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const ul = Math.hypot(ux, uy, uz) || 1; const X = [ux / ul, uy / ul, uz / ul];
    const nl = Math.hypot(nx, ny, nz) || 1; const N = [nx / nl, ny / nl, nz / nl];
    const Y = [N[1] * X[2] - N[2] * X[1], N[2] * X[0] - N[0] * X[2], N[0] * X[1] - N[1] * X[0]];
    const p2 = poly.map((v) => { const dx = pos[v * 3] - ox, dy = pos[v * 3 + 1] - oy, dz = pos[v * 3 + 2] - oz; return new V2(dx * X[0] + dy * X[1] + dz * X[2], dx * Y[0] + dy * Y[1] + dz * Y[2]); });
    let tris = THREE.ShapeUtils.triangulateShape(p2, []);
    let covered = 0; for (const [i, j, k] of tris) covered += Math.abs((p2[j].x - p2[i].x) * (p2[k].y - p2[i].y) - (p2[k].x - p2[i].x) * (p2[j].y - p2[i].y));
    const full = Math.abs((p2[poly.indexOf(b)].x) * (p2[poly.indexOf(c)].y) - (p2[poly.indexOf(c)].x) * (p2[poly.indexOf(b)].y));
    if (Math.abs(covered - full) > full * 1e-3 + 1e-12) {
      // fallback: centroid fan
      const ci = newPos.length / 3;
      newPos.push((pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3, (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3);
      for (let i = 0; i < poly.length; i++) { newIdx.push(ci, poly[i], poly[(i + 1) % poly.length]); newFid.push(fid[t]); }
      continue;
    }
    for (const [i, j, k] of tris) {
      const cr = (p2[j].x - p2[i].x) * (p2[k].y - p2[i].y) - (p2[k].x - p2[i].x) * (p2[j].y - p2[i].y);
      if (cr > 0) newIdx.push(poly[i], poly[j], poly[k]); else newIdx.push(poly[i], poly[k], poly[j]);
      newFid.push(fid[t]);
    }
  }
  if (!changed) return s;
  return new Solid(Float32Array.from(newPos), Uint32Array.from(newIdx), Int32Array.from(newFid));
}

/* Triangle builder */
class MeshBuilder {
  constructor() { this.P = []; this.F = []; }
  tri(a, b, c, f) { this.P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); this.F.push(f); }
  quad(a, b, c, d, f) { this.tri(a, b, c, f); this.tri(a, c, d, f); }
  /* triangle with orientation forced to face `n` */
  triN(a, b, c, f, n) {
    const cr = new V3().subVectors(b, a).cross(new V3().subVectors(c, a));
    if (cr.dot(n) < 0) this.tri(a, c, b, f); else this.tri(a, b, c, f);
  }
  build() { return weldTris(this.P, this.F); }
}

function fromThreeGeometry(g, fidFor) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position.array; const nt = p.length / 9;
  const F = new Array(nt);
  const groupFid = new Map();
  for (let t = 0; t < nt; t++) {
    let gi = 0;
    for (let k = 0; k < g.groups.length; k++) { const gr = g.groups[k]; if (t * 3 >= gr.start && t * 3 < gr.start + gr.count) { gi = gr.materialIndex; break; } }
    if (!groupFid.has(gi)) groupFid.set(gi, fidFor ? fidFor(gi) : newFid());
    F[t] = groupFid.get(gi);
  }
  return weldTris(p, F);
}

/* ---------- analysis: faces, edges, render data ---------- */
function analyze(s) {
  if (s._an) return s._an;
  const { pos, idx, fid } = s; const nt = s.nt, nv = s.nv;
  const tn = new Float32Array(nt * 3), ta = new Float32Array(nt);
  const A = new V3(), B = new V3(), C = new V3(), U = new V3(), W = new V3();
  for (let t = 0; t < nt; t++) {
    s.vert(idx[t * 3], A); s.vert(idx[t * 3 + 1], B); s.vert(idx[t * 3 + 2], C);
    U.subVectors(B, A); W.subVectors(C, A); U.cross(W);
    const l = U.length(); ta[t] = l / 2; if (l > 0) U.divideScalar(l);
    tn[t * 3] = U.x; tn[t * 3 + 1] = U.y; tn[t * 3 + 2] = U.z;
  }
  // faces
  const faces = new Map();
  for (let t = 0; t < nt; t++) {
    let f = faces.get(fid[t]);
    if (!f) faces.set(fid[t], (f = { id: fid[t], tris: [], area: 0, nsum: new V3(), csum: new V3() }));
    f.tris.push(t); f.area += ta[t];
    f.nsum.x += tn[t * 3] * ta[t]; f.nsum.y += tn[t * 3 + 1] * ta[t]; f.nsum.z += tn[t * 3 + 2] * ta[t];
    s.vert(idx[t * 3], A); s.vert(idx[t * 3 + 1], B); s.vert(idx[t * 3 + 2], C);
    f.csum.addScaledVector(A.add(B).add(C), ta[t] / 3);
  }
  for (const f of faces.values()) {
    f.normal = f.nsum.clone().normalize();
    f.centroid = f.csum.clone().divideScalar(f.area || 1);
    let planar = true;
    const d0 = f.normal.dot(f.centroid);
    for (const t of f.tris) {
      for (let k = 0; k < 3; k++) { s.vert(idx[t * 3 + k], A); if (Math.abs(f.normal.dot(A) - d0) > 2e-3) { planar = false; break; } }
      if (!planar) break;
    }
    f.planar = planar;
    if (planar) f.d = d0;
  }
  // edges
  const em = new Map();
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = idx[t * 3 + k], b = idx[t * 3 + (k + 1) % 3];
    const key = a < b ? a * nv + b : b * nv + a;
    let e = em.get(key); if (!e) em.set(key, (e = [])); e.push(t);
  }
  const groups = new Map();
  for (const [key, ts] of em) {
    const f1 = fid[ts[0]], f2 = ts.length > 1 ? fid[ts[1]] : -1;
    if (f1 === f2 && ts.length === 2) continue;
    const a = Math.floor(key / nv), b = key % nv;
    const gk = f1 < f2 ? f1 + ':' + f2 : f2 + ':' + f1;
    let g = groups.get(gk); if (!g) groups.set(gk, (g = { faces: [Math.min(f1, f2), Math.max(f1, f2)], segs: [] }));
    g.segs.push([a, b]);
  }
  const edges = [];
  for (const g of groups.values()) {
    const adj = new Map();
    for (const sg of g.segs) for (const v of sg) { let l = adj.get(v); if (!l) adj.set(v, (l = [])); l.push(sg); }
    const used = new Set();
    const walk = (start, seg) => {
      const chain = [start]; let cur = start, sgm = seg;
      while (sgm && !used.has(sgm)) {
        used.add(sgm);
        const nx = sgm[0] === cur ? sgm[1] : sgm[0];
        chain.push(nx); cur = nx;
        const l = adj.get(cur); if (l.length !== 2) break;
        sgm = l[0] === sgm ? l[1] : l[0];
      }
      return chain;
    };
    // start at endpoints (degree != 2) first, then loops
    for (const [v, l] of adj) if (l.length !== 2) for (const sg of l) if (!used.has(sg)) pushChain(walk(v, sg));
    for (const sg of g.segs) if (!used.has(sg)) pushChain(walk(sg[0], sg));
    function pushChain(ch) {
      // split chain into straight runs / single curve
      const pts = ch.map((i) => s.vert(i));
      const closed = ch[0] === ch[ch.length - 1];
      let length = 0; for (let i = 1; i < pts.length; i++) length += pts[i].distanceTo(pts[i - 1]);
      const a = pts[0], b = pts[pts.length - 1];
      let straight = !closed && a.distanceTo(b) > 1e-6;
      if (straight) {
        const d = new V3().subVectors(b, a).normalize();
        for (const p of pts) { const q = new V3().subVectors(p, a); if (q.sub(d.clone().multiplyScalar(q.dot(d))).length() > 1e-3) { straight = false; break; } }
      }
      if (!straight && !closed && pts.length > 2) {
        // break at sharp corners into separate edges
        const breaks = [0];
        for (let i = 1; i < pts.length - 1; i++) {
          const d1 = new V3().subVectors(pts[i], pts[i - 1]).normalize(), d2 = new V3().subVectors(pts[i + 1], pts[i]).normalize();
          if (d1.dot(d2) < 0.7) breaks.push(i);
        }
        if (breaks.length > 1) {
          breaks.push(pts.length - 1);
          for (let k = 0; k < breaks.length - 1; k++) pushChain(ch.slice(breaks[k], breaks[k + 1] + 1));
          return;
        }
      }
      edges.push({ id: edges.length, faces: g.faces, verts: ch, pts, closed, straight, length });
    }
  }
  // corner vertices
  const vset = new Map();
  for (const e of edges) if (!e.closed) for (const v of [e.verts[0], e.verts[e.verts.length - 1]]) if (!vset.has(v)) vset.set(v, s.vert(v));
  const corners = [...vset.entries()].map(([i, p]) => ({ i, p }));
  return (s._an = { tn, ta, faces, edges, corners });
}

function renderData(s) {
  if (s._rd) return s._rd;
  const an = analyze(s); const { idx, fid } = s; const nt = s.nt;
  const pos = new Float32Array(nt * 9), nor = new Float32Array(nt * 9);
  const acc = new Map();
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const v = idx[t * 3 + k], key = v + ':' + fid[t];
    let a = acc.get(key); if (!a) acc.set(key, (a = [0, 0, 0]));
    a[0] += an.tn[t * 3] * an.ta[t]; a[1] += an.tn[t * 3 + 1] * an.ta[t]; a[2] += an.tn[t * 3 + 2] * an.ta[t];
  }
  for (let t = 0; t < nt; t++) {
    const f = an.faces.get(fid[t]);
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k], o = t * 9 + k * 3;
      pos[o] = s.pos[v * 3]; pos[o + 1] = s.pos[v * 3 + 1]; pos[o + 2] = s.pos[v * 3 + 2];
      if (f.planar) { nor[o] = f.normal.x; nor[o + 1] = f.normal.y; nor[o + 2] = f.normal.z; }
      else {
        const a = acc.get(v + ':' + fid[t]); const l = Math.hypot(a[0], a[1], a[2]) || 1;
        nor[o] = a[0] / l; nor[o + 1] = a[1] / l; nor[o + 2] = a[2] / l;
      }
    }
  }
  const lines = [];
  for (const e of an.edges) for (let i = 1; i < e.pts.length; i++) { const p = e.pts[i - 1], q = e.pts[i]; lines.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  return (s._rd = { pos, nor, lines: new Float32Array(lines) });
}

/* ---------- mass properties ---------- */
function massProps(s) {
  const { idx } = s; let V = 0, A = 0; const C = new V3();
  const a = new V3(), b = new V3(), c = new V3(), t1 = new V3();
  for (let t = 0; t < s.nt; t++) {
    s.vert(idx[t * 3], a); s.vert(idx[t * 3 + 1], b); s.vert(idx[t * 3 + 2], c);
    const v = a.dot(t1.copy(b).cross(c)) / 6;
    V += v; C.x += v * (a.x + b.x + c.x) / 4; C.y += v * (a.y + b.y + c.y) / 4; C.z += v * (a.z + b.z + c.z) / 4;
    A += t1.subVectors(b, a).cross(new V3().subVectors(c, a)).length() / 2;
  }
  if (Math.abs(V) > 1e-12) C.divideScalar(V);
  return { volume: V, area: A, centroid: C };
}

/* ---------- transforms ---------- */
function transformSolid(s, m, refid = false) {
  const pos = new Float32Array(s.pos.length); const v = new V3();
  for (let i = 0; i < s.nv; i++) { v.set(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]).applyMatrix4(m); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
  let idx = s.idx;
  if (m.determinant() < 0) { idx = new Uint32Array(s.idx.length); for (let t = 0; t < s.nt; t++) { idx[t * 3] = s.idx[t * 3]; idx[t * 3 + 1] = s.idx[t * 3 + 2]; idx[t * 3 + 2] = s.idx[t * 3 + 1]; } }
  let fid = s.fid;
  if (refid) { const mp = new Map(); fid = new Int32Array(s.fid.length); for (let t = 0; t < s.nt; t++) { let n = mp.get(s.fid[t]); if (n === undefined) mp.set(s.fid[t], (n = newFid())); fid[t] = n; } }
  return new Solid(pos, idx, fid);
}
function flipSolid(s) {
  const idx = new Uint32Array(s.idx.length);
  for (let t = 0; t < s.nt; t++) { idx[t * 3] = s.idx[t * 3]; idx[t * 3 + 1] = s.idx[t * 3 + 2]; idx[t * 3 + 2] = s.idx[t * 3 + 1]; }
  return new Solid(s.pos, idx, s.fid);
}
function mergeSolids(list) {
  let nv = 0; const P = [], I = [], F = [];
  for (const s of list) { for (const p of s.pos) P.push(p); for (const i of s.idx) I.push(i + nv); for (const f of s.fid) F.push(f); nv += s.nv; }
  return new Solid(Float32Array.from(P), Uint32Array.from(I), Int32Array.from(F));
}
function mirrorMatrix(plane) {
  const n = plane.n.clone().normalize(), d = n.dot(plane.o);
  const m = new THREE.Matrix4().set(
    1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x,
    -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y,
    -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * d * n.z,
    0, 0, 0, 1);
  return m;
}

/* ---------- booleans ---------- */
const evaluator = new Evaluator();
evaluator.attributes = ['position', 'faceId'];
evaluator.useGroups = false;
evaluator.useCDTClipping = true;
function toBrush(s) {
  if (s._brush) return s._brush;
  const nt = s.nt; const p = new Float32Array(nt * 9), f = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const v = s.idx[t * 3 + k];
    p[t * 9 + k * 3] = s.pos[v * 3]; p[t * 9 + k * 3 + 1] = s.pos[v * 3 + 1]; p[t * 9 + k * 3 + 2] = s.pos[v * 3 + 2];
    f[t * 3 + k] = s.fid[t];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('faceId', new THREE.BufferAttribute(f, 1));
  const b = new Brush(g); b.updateMatrixWorld();
  return (s._brush = b);
}
function fromCSGGeometry(g) {
  const pa = g.attributes.position.array, fa = g.attributes.faceId.array;
  const index = g.index ? g.index.array : null;
  const nt = (index ? index.length : pa.length / 3) / 3;
  const P = new Float32Array(nt * 9), F = new Array(nt);
  for (let t = 0; t < nt; t++) {
    for (let k = 0; k < 3; k++) {
      const v = index ? index[t * 3 + k] : t * 3 + k;
      P[t * 9 + k * 3] = pa[v * 3]; P[t * 9 + k * 3 + 1] = pa[v * 3 + 1]; P[t * 9 + k * 3 + 2] = pa[v * 3 + 2];
    }
    const v0 = index ? index[t * 3] : t * 3;
    F[t] = Math.round(fa[v0]);
  }
  return weldTris(P, F);
}
function bboxOverlap(a, b, pad = 1e-3) {
  const A = a.bbox(), B = b.bbox();
  return !(A.max.x < B.min.x - pad || B.max.x < A.min.x - pad || A.max.y < B.min.y - pad || B.max.y < A.min.y - pad || A.max.z < B.min.z - pad || B.max.z < A.min.z - pad);
}
function csg(a, b, op) {
  if (!a.nt) return op === 'union' ? b : a;
  if (!b.nt) return op === 'intersect' ? b : a;
  if (!bboxOverlap(a, b)) {
    if (op === 'union') return mergeSolids([a, b]);
    if (op === 'subtract') return a;
    return new Solid(new Float32Array(0), new Uint32Array(0), new Int32Array(0));
  }
  const OP = op === 'union' ? ADDITION : op === 'subtract' ? SUBTRACTION : INTERSECTION;
  const r = evaluator.evaluate(toBrush(a), toBrush(b), OP);
  return fromCSGGeometry(r.geometry);
}

/* Split into connected bodies; inner voids stay with their enclosing body */
function splitBodies(s) {
  if (!s.nt) return [];
  const nv = s.nv, par = new Int32Array(nv).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < s.nt; t++) { const a = find(s.idx[t * 3]), b = find(s.idx[t * 3 + 1]), c = find(s.idx[t * 3 + 2]); par[b] = a; par[find(c)] = a; }
  const groups = new Map();
  for (let t = 0; t < s.nt; t++) { const r = find(s.idx[t * 3]); let g = groups.get(r); if (!g) groups.set(r, (g = [])); g.push(t); }
  if (groups.size === 1) return [s];
  const parts = [...groups.values()].map((tris) => {
    const P = [], F = [];
    for (const t of tris) { for (let k = 0; k < 3; k++) { const v = s.idx[t * 3 + k]; P.push(s.pos[v * 3], s.pos[v * 3 + 1], s.pos[v * 3 + 2]); } F.push(s.fid[t]); }
    const so = weldTris(P, F); so._vol = massProps(so).volume; return so;
  }).filter((p) => Math.abs(p._vol) > 1e-6);
  const shells = parts.filter((p) => p._vol > 0), voids = parts.filter((p) => p._vol < 0);
  const bins = shells.map((sh) => [sh]);
  for (const vd of voids) {
    let best = -1, bv = Infinity;
    shells.forEach((sh, i) => { if (sh.bbox().containsBox(vd.bbox()) && sh._vol < bv) { bv = sh._vol; best = i; } });
    if (best >= 0) bins[best].push(vd);
  }
  return bins.map((b) => (b.length === 1 ? b[0] : mergeSolids(b))).sort((p, q) => massProps(q).volume - massProps(p).volume);
}

/* ---------- builders ---------- */
const segsFor = (r, ang = 360) => {
  const n = Math.ceil(Math.PI / Math.acos(clamp(1 - 0.015 / Math.max(r, 0.01), -1, 0.99999)));
  return Math.max(4, Math.ceil((clamp(n, 24, 72) * ang) / 360 / 2) * 2);
};

/* plane: {o,x,y,n}; region: {outer:{pts:[[u,v]],ent:[key]}, holes:[...]} in plane coords */
const toWorld = (pl, u, v, w = 0) => pl.o.clone().addScaledVector(pl.x, u).addScaledVector(pl.y, v).addScaledVector(pl.n, w);
const toPlane = (pl, p) => { const d = new V3().subVectors(p, pl.o); return [d.dot(pl.x), d.dot(pl.y), d.dot(pl.n)]; };
const signedArea = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
function orientLoop(loop, ccw) {
  const a = signedArea(loop.pts);
  if ((a > 0) === ccw) return loop;
  const n = loop.pts.length;
  const pts = loop.pts.slice().reverse();
  // ent[i] labels edge pts[i]->pts[i+1]; after reverse, edge j corresponds to old edge n-2-j
  const ent = pts.map((_, j) => loop.ent[(n - 2 - j + n) % n]);
  return { pts, ent };
}
function triangulateRegion(region) {
  const outer = orientLoop(region.outer, true);
  const holes = (region.holes || []).map((h) => orientLoop(h, false));
  const contour = outer.pts.map((p) => new V2(p[0], p[1]));
  const hs = holes.map((h) => h.pts.map((p) => new V2(p[0], p[1])));
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = [...outer.pts, ...holes.flatMap((h) => h.pts)];
  return { outer, holes, all, tris };
}
function fidMapper() { const m = new Map(); return (k) => { if (k == null) return newFid(); let f = m.get(k); if (f === undefined) m.set(k, (f = newFid())); return f; }; }

function extrudeRegions(regions, pl, d0, d1) {
  const mb = new MeshBuilder();
  const fm = fidMapper();
  if (d1 < d0) [d0, d1] = [d1, d0];
  for (const r of regions) {
    const T = triangulateRegion(r);
    const fb = newFid(), ft = newFid();
    const nB = pl.n.clone().negate(), nT = pl.n.clone();
    for (const [a, b, c] of T.tris) {
      const A = T.all[a], B = T.all[b], C = T.all[c];
      mb.triN(toWorld(pl, A[0], A[1], d0), toWorld(pl, B[0], B[1], d0), toWorld(pl, C[0], C[1], d0), fb, nB);
      mb.triN(toWorld(pl, A[0], A[1], d1), toWorld(pl, B[0], B[1], d1), toWorld(pl, C[0], C[1], d1), ft, nT);
    }
    for (const L of [T.outer, ...T.holes]) {
      const n = L.pts.length;
      for (let i = 0; i < n; i++) {
        const p = L.pts[i], q = L.pts[(i + 1) % n], f = fm(L.ent[i]);
        mb.quad(toWorld(pl, p[0], p[1], d0), toWorld(pl, q[0], q[1], d0), toWorld(pl, q[0], q[1], d1), toWorld(pl, p[0], p[1], d1), f);
      }
    }
  }
  return mb.build();
}

/* revolve regions (plane coords) about a 3D axis */
function revolveRegions(regions, pl, axisO, axisD, angDeg, startDeg = 0) {
  const full = Math.abs(angDeg) >= 359.999;
  const ax = axisD.clone().normalize();
  const mb = new MeshBuilder(); const fm = fidMapper();
  const rot = (p, deg) => p.clone().sub(axisO).applyAxisAngle(ax, deg * DEG).add(axisO);
  for (const r of regions) {
    const T = triangulateRegion(r);
    const W = T.all.map((p) => toWorld(pl, p[0], p[1]));
    let maxR = 0; const cen = new V3();
    for (const w of W) { const q = w.clone().sub(axisO); maxR = Math.max(maxR, q.sub(ax.clone().multiplyScalar(q.dot(ax))).length()); cen.add(w); }
    cen.divideScalar(W.length);
    const steps = Math.max(full ? 8 : 2, segsFor(maxR, Math.abs(angDeg)));
    const tang = rot(cen, startDeg + Math.sign(angDeg) * 0.5).sub(rot(cen, startDeg));
    const sgn = tang.dot(rot(pl.n.clone().add(axisO), startDeg).sub(rot(axisO.clone(), startDeg))) >= 0 ? 1 : -1;
    const ring = (k) => (full && k === steps ? 0 : k);
    const rings = [];
    for (let k = 0; k <= steps; k++) rings.push(W.map((w) => rot(w, startDeg + (angDeg * ring(k)) / steps)));
    let off = 0;
    for (const L of [T.outer, ...T.holes]) {
      const n = L.pts.length;
      for (let i = 0; i < n; i++) {
        const f = fm(L.ent[i]); const i0 = off + i, i1 = off + ((i + 1) % n);
        for (let k = 0; k < steps; k++) {
          const a = rings[k][i0], b = rings[k][i1], c = rings[k + 1][i1], d = rings[k + 1][i0];
          if (sgn > 0) mb.quad(a, b, c, d, f); else mb.quad(a, d, c, b, f);
        }
      }
      off += n;
    }
    if (!full) {
      const f0 = newFid(), f1 = newFid();
      const t0 = rot(cen, startDeg + Math.sign(angDeg) * 0.01).sub(rot(cen, startDeg)).normalize();
      const endA = startDeg + angDeg;
      const t1 = rot(cen, endA).sub(rot(cen, endA - Math.sign(angDeg) * 0.01)).normalize();
      for (const [a, b, c] of T.tris) {
        mb.triN(rings[0][a], rings[0][b], rings[0][c], f0, t0.clone().negate());
        mb.triN(rings[steps][a], rings[steps][b], rings[steps][c], f1, t1);
      }
    }
  }
  let s = mb.build();
  if (massProps(s).volume < 0) s = flipSolid(s);
  return s;
}

/* loft between closed 3D loops (outer only) */
function resampleLoop(pts3, N) {
  const n = pts3.length; const L = [0];
  for (let i = 1; i <= n; i++) L.push(L[i - 1] + pts3[i % n].distanceTo(pts3[i - 1]));
  const tot = L[n]; const out = []; let j = 0;
  for (let k = 0; k < N; k++) {
    const t = (tot * k) / N;
    while (L[j + 1] < t) j++;
    const f = (t - L[j]) / (L[j + 1] - L[j] || 1);
    out.push(pts3[j].clone().lerp(pts3[(j + 1) % n], f));
  }
  return out;
}
function loopNormal(pts) { const n = new V3(); for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; n.x += (p.y - q.y) * (p.z + q.z); n.y += (p.z - q.z) * (p.x + q.x); n.z += (p.x - q.x) * (p.y + q.y); } return n.normalize(); }
function centroidOf(pts) { const c = new V3(); pts.forEach((p) => c.add(p)); return c.divideScalar(pts.length); }
function capLoop(mb, pts, n, f) {
  // triangulate a planar-ish 3D loop by projection
  const x = new V3(); const ref = Math.abs(n.z) < 0.9 ? new V3(0, 0, 1) : new V3(1, 0, 0);
  x.crossVectors(ref, n).normalize(); const y = new V3().crossVectors(n, x);
  const c = centroidOf(pts);
  const p2 = pts.map((p) => new V2(new V3().subVectors(p, c).dot(x), new V3().subVectors(p, c).dot(y)));
  const tris = THREE.ShapeUtils.triangulateShape(p2, []);
  for (const [a, b, cc] of tris) mb.triN(pts[a], pts[b], pts[cc], f, n);
}
function loftLoops(loops) {
  const N = 96;
  const prof = loops.map((l) => resampleLoop(l, N));
  const cents = prof.map(centroidOf);
  // orient: loop normal points along loft direction
  for (let k = 0; k < prof.length; k++) {
    const dir = k < prof.length - 1 ? cents[k + 1].clone().sub(cents[k]) : cents[k].clone().sub(cents[k - 1]);
    if (loopNormal(prof[k]).dot(dir) < 0) prof[k].reverse();
  }
  // align start indices
  for (let k = 1; k < prof.length; k++) {
    let best = 0, bd = Infinity;
    for (let s = 0; s < N; s++) {
      let d = 0; for (let i = 0; i < N; i += 4) d += prof[k - 1][i].clone().sub(cents[k - 1]).distanceTo(prof[k][(i + s) % N].clone().sub(cents[k]));
      if (d < bd) { bd = d; best = s; }
    }
    prof[k] = prof[k].map((_, i) => prof[k][(i + best) % N]);
  }
  const mb = new MeshBuilder(); const fs = newFid();
  for (let k = 0; k < prof.length - 1; k++) for (let i = 0; i < N; i++) {
    const a = prof[k][i], b = prof[k][(i + 1) % N], c = prof[k + 1][(i + 1) % N], d = prof[k + 1][i];
    mb.quad(a, b, c, d, fs);
  }
  const dir0 = cents[1].clone().sub(cents[0]).normalize(), dirN = cents[prof.length - 1].clone().sub(cents[prof.length - 2]).normalize();
  capLoop(mb, prof[0], loopNormal(prof[0]).multiplyScalar(-1).dot(dir0) < 0 ? loopNormal(prof[0]).negate() : loopNormal(prof[0]), newFid());
  capLoop(mb, prof[prof.length - 1], loopNormal(prof[prof.length - 1]).dot(dirN) > 0 ? loopNormal(prof[prof.length - 1]) : loopNormal(prof[prof.length - 1]).negate(), newFid());
  let s = mb.build();
  if (massProps(s).volume < 0) s = flipSolid(s);
  return s;
}

/* sweep regions along a 3D polyline path using rotation-minimising frames */
function sweepRegions(regions, pl, path) {
  const P = path.filter((p, i) => i === 0 || p.distanceTo(path[i - 1]) > 1e-6);
  if (P.length < 2) throw new Error('Path is too short');
  const closed = P[0].distanceTo(P[P.length - 1]) < 1e-4;
  if (closed) P.pop();
  const n = P.length;
  const T = P.map((p, i) => {
    const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return new V3().subVectors(b, a).normalize();
  });
  const Q = [new THREE.Quaternion()];
  for (let i = 1; i < n; i++) Q.push(new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]).multiply(Q[i - 1]));
  const xf = (i, w) => w.clone().sub(P[0]).applyQuaternion(Q[i]).add(P[i]);
  const mb = new MeshBuilder(); const fm = fidMapper();
  const reverse = pl.n.dot(T[0]) < 0;
  for (const r of regions) {
    const Tr = triangulateRegion(r);
    const loops = [Tr.outer, ...Tr.holes].map((L) => (reverse ? orientLoop(L, signedArea(L.pts) < 0) : L));
    for (const L of loops) {
      const W = L.pts.map((p) => toWorld(pl, p[0], p[1]));
      const m = W.length; const rings = []; for (let i = 0; i < n; i++) rings.push(W.map((w) => xf(i, w)));
      const segs = closed ? n : n - 1;
      for (let j = 0; j < m; j++) {
        const f = fm(L.ent[(j) % L.ent.length]);
        for (let i = 0; i < segs; i++) {
          const i2 = (i + 1) % n;
          mb.quad(rings[i][j], rings[i][(j + 1) % m], rings[i2][(j + 1) % m], rings[i2][j], f);
        }
      }
    }
    if (!closed) {
      const W = Tr.all.map((p) => toWorld(pl, p[0], p[1]));
      const f0 = newFid(), f1 = newFid();
      for (const [a, b, c] of Tr.tris) {
        mb.triN(W[a], W[b], W[c], f0, T[0].clone().negate());
        mb.triN(xf(n - 1, W[a]), xf(n - 1, W[b]), xf(n - 1, W[c]), f1, T[n - 1]);
      }
    }
  }
  let s = mb.build();
  if (massProps(s).volume < 0) s = flipSolid(s);
  return s;
}

/* ---------- primitives (Z up) ---------- */
function primBox(w, d, h, at) { const g = new THREE.BoxGeometry(w, d, h); g.translate(at.x, at.y, at.z + h / 2); return fromThreeGeometry(g); }
function primCylinder(r, h, at, r2 = r) { const g = new THREE.CylinderGeometry(r2, r, h, segsFor(Math.max(r, r2)), 1); g.rotateX(Math.PI / 2); g.translate(at.x, at.y, at.z + h / 2); return fromThreeGeometry(g); }
function primSphere(r, at) { const n = segsFor(r); const g = new THREE.SphereGeometry(r, n, Math.max(8, n / 2)); g.translate(at.x, at.y, at.z); const f = newFid(); return fromThreeGeometry(g, () => f); }
function primTorus(R, r, at) { const g = new THREE.TorusGeometry(R, r, Math.max(12, segsFor(r) / 2), segsFor(R + r)); g.translate(at.x, at.y, at.z); const f = newFid(); return fromThreeGeometry(g, () => f); }

/* ---------- shell (uniform offset of a closed mesh) ---------- */
function offsetSolid(s, distForFace) {
  const an = analyze(s);
  const vf = new Map(); // vertex -> list of [n, d]
  for (let t = 0; t < s.nt; t++) {
    const f = an.faces.get(s.fid[t]);
    const n = f.planar ? f.normal : new V3(an.tn[t * 3], an.tn[t * 3 + 1], an.tn[t * 3 + 2]);
    const d = distForFace(f.id);
    for (let k = 0; k < 3; k++) {
      const v = s.idx[t * 3 + k]; let l = vf.get(v); if (!l) vf.set(v, (l = []));
      if (!l.some((q) => q[0].dot(n) > 0.9998)) l.push([n, d]);
    }
  }
  const pos = new Float32Array(s.pos.length);
  for (let v = 0; v < s.nv; v++) {
    const l = vf.get(v) || [];
    // least squares: minimise sum (n.delta - d)^2 + eps|delta|^2
    const M = [[1e-6, 0, 0], [0, 1e-6, 0], [0, 0, 1e-6]], b = [0, 0, 0];
    for (const [n, d] of l) { const a = [n.x, n.y, n.z]; for (let i = 0; i < 3; i++) { b[i] += a[i] * d; for (let j = 0; j < 3; j++) M[i][j] += a[i] * a[j]; } }
    const x = solve3(M, b);
    pos[v * 3] = s.pos[v * 3] + x[0]; pos[v * 3 + 1] = s.pos[v * 3 + 1] + x[1]; pos[v * 3 + 2] = s.pos[v * 3 + 2] + x[2];
  }
  const fm = fidMapper();
  const fid = Int32Array.from(s.fid, (f) => fm(f));
  return new Solid(pos, s.idx, fid);
}
function solve3(M, b) {
  const m = new THREE.Matrix3().set(M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]);
  if (Math.abs(m.determinant()) < 1e-14) return [0, 0, 0];
  const v = new V3(b[0], b[1], b[2]).applyMatrix3(m.invert());
  return [v.x, v.y, v.z];
}

/* ---------- face boundary loops (for extruding a face / sketching) ---------- */
function faceLoops(s, faceId) {
  const an = analyze(s); const f = an.faces.get(faceId); if (!f) return [];
  const nv = s.nv; const inFace = new Set(f.tris);
  const cnt = new Map();
  for (const t of f.tris) for (let k = 0; k < 3; k++) {
    const a = s.idx[t * 3 + k], b = s.idx[t * 3 + (k + 1) % 3];
    const key = a < b ? a * nv + b : b * nv + a; cnt.set(key, (cnt.get(key) || 0) + 1);
  }
  const next = new Map();
  for (const t of inFace) for (let k = 0; k < 3; k++) {
    const a = s.idx[t * 3 + k], b = s.idx[t * 3 + (k + 1) % 3];
    const key = a < b ? a * nv + b : b * nv + a;
    if (cnt.get(key) === 1) next.set(a, b);
  }
  const loops = []; const used = new Set();
  for (const st of next.keys()) {
    if (used.has(st)) continue;
    const L = []; let v = st; let guard = 0;
    while (!used.has(v) && guard++ < 100000) { used.add(v); L.push(v); v = next.get(v); if (v === undefined) break; }
    if (L.length >= 3) loops.push(L.map((i) => s.vert(i)));
  }
  return loops;
}

/* ---------- export ---------- */
function solidsToSTL(list) {
  const nt = list.reduce((a, s) => a + s.nt, 0);
  const buf = new ArrayBuffer(84 + nt * 50); const dv = new DataView(buf);
  const hdr = 'Binary STL exported from Kerf CAD';
  for (let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i));
  dv.setUint32(80, nt, true); let o = 84;
  const a = new V3(), b = new V3(), c = new V3();
  for (const s of list) for (let t = 0; t < s.nt; t++) {
    s.vert(s.idx[t * 3], a); s.vert(s.idx[t * 3 + 1], b); s.vert(s.idx[t * 3 + 2], c);
    const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).normalize();
    for (const v of [n, a, b, c]) { dv.setFloat32(o, v.x, true); dv.setFloat32(o + 4, v.y, true); dv.setFloat32(o + 8, v.z, true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}
function solidsToOBJ(list, names) {
  let out = '# Kerf CAD OBJ export (mm)\n', base = 1;
  list.forEach((s, k) => {
    out += `o ${(names[k] || 'Part').replace(/\s+/g, '_')}\n`;
    for (let i = 0; i < s.nv; i++) out += `v ${fmt(s.pos[i * 3], 5)} ${fmt(s.pos[i * 3 + 1], 5)} ${fmt(s.pos[i * 3 + 2], 5)}\n`;
    for (let t = 0; t < s.nt; t++) out += `f ${s.idx[t * 3] + base} ${s.idx[t * 3 + 1] + base} ${s.idx[t * 3 + 2] + base}\n`;
    base += s.nv;
  });
  return out;
}
/* minimal store-only zip */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(); const chunks = []; const central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name); const data = f.data instanceof Uint8Array ? f.data : typeof f.data === 'string' ? enc.encode(f.data) : new Uint8Array(f.data);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  }
  const csize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/* point containment by ray parity (+X ray, slightly skewed) */
function pointInSolid(s, p) {
  const dir = new V3(1, 0.000123, 0.000071).normalize(); const ray = new THREE.Ray(p, dir);
  const a = new V3(), b = new V3(), c = new V3(), hit = new V3(); let n = 0;
  const bb = s.bbox(); if (!bb.containsPoint(p)) return false;
  for (let t = 0; t < s.nt; t++) {
    s.vert(s.idx[t * 3], a); s.vert(s.idx[t * 3 + 1], b); s.vert(s.idx[t * 3 + 2], c);
    if (ray.intersectTriangle(a, b, c, false, hit)) n++;
  }
  return n % 2 === 1;
}

/* ---------- 3MF (3D Manufacturing Format) ---------- */
function xmlEsc(s) { return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }
function solidsTo3MFParts(list, names = [], colors = []) {
  const hex = (c) => { const h = String(c || '#9aa7b4').replace('#', ''); return '#' + (h.length === 3 ? h.split('').map((q) => q + q).join('') : h.slice(0, 6)).toUpperCase() + 'FF'; };
  const out = ['<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n <metadata name="Application">Kerf CAD</metadata>\n <resources>\n  <basematerials id="1">\n'];
  list.forEach((_, k) => out.push(`   <base name="${xmlEsc(names[k] || 'Part ' + (k + 1))}" displaycolor="${hex(colors[k])}"/>\n`));
  out.push('  </basematerials>\n');
  list.forEach((s, k) => {
    out.push(`  <object id="${k + 2}" type="model" name="${xmlEsc(names[k] || 'Part ' + (k + 1))}" pid="1" pindex="${k}">\n   <mesh>\n    <vertices>\n`);
    const v = []; for (let i = 0; i < s.nv; i++) v.push(`     <vertex x="${+s.pos[i * 3].toFixed(5)}" y="${+s.pos[i * 3 + 1].toFixed(5)}" z="${+s.pos[i * 3 + 2].toFixed(5)}"/>\n`);
    out.push(v.join(''), '    </vertices>\n    <triangles>\n');
    const t = []; for (let i = 0; i < s.nt; i++) t.push(`     <triangle v1="${s.idx[i * 3]}" v2="${s.idx[i * 3 + 1]}" v3="${s.idx[i * 3 + 2]}"/>\n`);
    out.push(t.join(''), '    </triangles>\n   </mesh>\n  </object>\n');
  });
  out.push(' </resources>\n <build>\n');
  list.forEach((_, k) => out.push(`  <item objectid="${k + 2}"/>\n`));
  out.push(' </build>\n</model>\n');
  return [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>\n' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>\n' },
    { name: '3D/3dmodel.model', data: out.join('') },
  ];
}
function solidsTo3MF(list, names, colors) { return makeZip(solidsTo3MFParts(list, names, colors)); }
