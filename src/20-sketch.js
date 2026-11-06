/* =====================================================================
   Sketches: points + entities + constraints, a Levenberg–Marquardt
   solver, and planar region detection for profiles.
   ===================================================================== */
const ORIGIN_ID = 'O';

function newSketchData() { return { pts: [], ents: [], cons: [] }; }
function skIndex(sk) {
  const P = new Map(); P.set(ORIGIN_ID, { id: ORIGIN_ID, x: 0, y: 0, origin: true });
  for (const p of sk.pts) P.set(p.id, p);
  const E = new Map(); for (const e of sk.ents) E.set(e.id, e);
  return { P, E };
}
function entPointIds(e) {
  if (e.type === 'line') return [e.p1, e.p2];
  if (e.type === 'arc') return [e.c, e.p1, e.p2];
  if (e.type === 'circle') return [e.c];
  if (e.type === 'point') return [e.p];
  if (e.type === 'spline') return e.pts.slice();
  return [];
}
function arcAngles(P, e) {
  const c = P.get(e.c), a = P.get(e.p1), b = P.get(e.p2);
  const a0 = Math.atan2(a.y - c.y, a.x - c.x); let a1 = Math.atan2(b.y - c.y, b.x - c.x);
  while (a1 <= a0 + 1e-9) a1 += Math.PI * 2;
  return [a0, a1, Math.hypot(a.x - c.x, a.y - c.y)];
}
function catmull(pts, sub = 12) {
  if (pts.length < 2) return pts.slice();
  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let s = 0; s < sub; s++) {
      const t = s / sub, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/* polyline for an entity in sketch coords */
function entPolyline(P, e) {
  if (e.type === 'line') { const a = P.get(e.p1), b = P.get(e.p2); return [[a.x, a.y], [b.x, b.y]]; }
  if (e.type === 'circle') {
    const c = P.get(e.c); const n = segsFor(e.r); const out = [];
    for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; out.push([c.x + e.r * Math.cos(t), c.y + e.r * Math.sin(t)]); }
    return out;
  }
  if (e.type === 'arc') {
    const c = P.get(e.c); const [a0, a1, r] = arcAngles(P, e);
    const n = Math.max(2, segsFor(r, ((a1 - a0) / DEG)));
    const out = []; for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; out.push([c.x + r * Math.cos(t), c.y + r * Math.sin(t)]); }
    const b = P.get(e.p2); out[out.length - 1] = [b.x, b.y]; const a = P.get(e.p1); out[0] = [a.x, a.y];
    return out;
  }
  if (e.type === 'spline') return catmull(e.pts.map((id) => { const p = P.get(id); return [p.x, p.y]; }));
  return [];
}

/* ---------------- constraint residuals ---------------- */
const CONS_INFO = {
  horizontal: { label: 'Horizontal', glyph: 'H' }, vertical: { label: 'Vertical', glyph: 'V' },
  parallel: { label: 'Parallel', glyph: '∥' }, perpendicular: { label: 'Perpendicular', glyph: '⊥' },
  equal: { label: 'Equal', glyph: '=' }, tangent: { label: 'Tangent', glyph: 'T' },
  midpoint: { label: 'Midpoint', glyph: 'M' }, fix: { label: 'Fix', glyph: '⚓' },
  onEntity: { label: 'Coincident', glyph: '•' }, concentric: { label: 'Concentric', glyph: '◎' },
  distance: { label: 'Distance', dim: true }, hdistance: { label: 'Horizontal distance', dim: true }, vdistance: { label: 'Vertical distance', dim: true },
  length: { label: 'Length', dim: true }, radius: { label: 'Radius', dim: true }, diameter: { label: 'Diameter', dim: true },
  angle: { label: 'Angle', dim: true }, pldist: { label: 'Distance', dim: true },
};

function makeResidualFn(sk, vars) {
  const { P, E } = skIndex(sk);
  // parameter vector layout
  const params = []; // {obj, key}
  for (const p of sk.pts) { params.push({ o: p, k: 'x' }); params.push({ o: p, k: 'y' }); }
  for (const e of sk.ents) if (e.type === 'circle') params.push({ o: e, k: 'r' });
  const read = () => params.map((q) => q.o[q.k]);
  const write = (x) => params.forEach((q, i) => (q.o[q.k] = x[i]));
  const R = (e) => (e.type === 'circle' ? e.r : Math.hypot(P.get(e.p1).x - P.get(e.c).x, P.get(e.p1).y - P.get(e.c).y));
  const C = (e) => P.get(e.c);
  const dirOf = (e) => { const a = P.get(e.p1), b = P.get(e.p2); const dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1e-9; return [dx / l, dy / l, l]; };
  const plDist = (p, e) => { const a = P.get(e.p1), b = P.get(e.p2); const [ux, uy] = dirOf(e); return (p.x - a.x) * uy - (p.y - a.y) * ux; };
  const val = (c) => { try { return evalExpr(c.value, vars); } catch { return c._last ?? 0; } };
  const res = [];
  const cons = sk.cons.filter((c) => !c.driven);
  const residuals = () => {
    res.length = 0;
    for (const e of sk.ents) if (e.type === 'arc') { const c = C(e), a = P.get(e.p1), b = P.get(e.p2); res.push(Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y)); }
    for (const c of cons) {
      const e1 = E.get(c.e1), e2 = E.get(c.e2), pa = P.get(c.a), pb = P.get(c.b);
      switch (c.type) {
        case 'horizontal': if (e1) res.push(P.get(e1.p2).y - P.get(e1.p1).y); else if (pa && pb) res.push(pb.y - pa.y); break;
        case 'vertical': if (e1) res.push(P.get(e1.p2).x - P.get(e1.p1).x); else if (pa && pb) res.push(pb.x - pa.x); break;
        case 'parallel': { const [a, b] = dirOf(e1), [c2, d] = dirOf(e2); res.push(a * d - b * c2); break; }
        case 'perpendicular': { const [a, b] = dirOf(e1), [c2, d] = dirOf(e2); res.push(a * c2 + b * d); break; }
        case 'equal':
          if (e1.type === 'line' && e2.type === 'line') res.push(dirOf(e1)[2] - dirOf(e2)[2]);
          else res.push(R(e1) - R(e2));
          break;
        case 'tangent': {
          if (e1.type === 'line') res.push(Math.abs(plDist(C(e2), e1)) - R(e2));
          else if (e2.type === 'line') res.push(Math.abs(plDist(C(e1), e2)) - R(e1));
          else { const d = Math.hypot(C(e1).x - C(e2).x, C(e1).y - C(e2).y); res.push(c.inner ? d - Math.abs(R(e1) - R(e2)) : d - R(e1) - R(e2)); }
          break;
        }
        case 'midpoint': { const a = P.get(e1.p1), b = P.get(e1.p2); res.push(pa.x - (a.x + b.x) / 2, pa.y - (a.y + b.y) / 2); break; }
        case 'fix': res.push(pa.x - c.x, pa.y - c.y); break;
        case 'onEntity':
          if (e1.type === 'line') res.push(plDist(pa, e1));
          else res.push(Math.hypot(pa.x - C(e1).x, pa.y - C(e1).y) - R(e1));
          break;
        case 'concentric': res.push(C(e1).x - C(e2).x, C(e1).y - C(e2).y); break;
        case 'distance': res.push(Math.hypot(pb.x - pa.x, pb.y - pa.y) - val(c)); break;
        case 'hdistance': res.push(Math.abs(pb.x - pa.x) - val(c)); break;
        case 'vdistance': res.push(Math.abs(pb.y - pa.y) - val(c)); break;
        case 'length': res.push(dirOf(e1)[2] - val(c)); break;
        case 'radius': res.push(R(e1) - val(c)); break;
        case 'diameter': res.push(2 * R(e1) - val(c)); break;
        case 'pldist': res.push(Math.abs(plDist(pa, e1)) - val(c)); break;
        case 'angle': {
          const [a, b] = dirOf(e1), [c2, d] = dirOf(e2);
          const s1 = c.s1 || 1, s2 = c.s2 || 1;
          const cr = (a * s1) * (d * s2) - (b * s1) * (c2 * s2), dt = (a * s1) * (c2 * s2) + (b * s1) * (d * s2);
          res.push(Math.atan2(Math.abs(cr), dt) - val(c) * DEG);
          break;
        }
      }
    }
    return res.slice();
  };
  return { params, read, write, residuals, P, E };
}

function linSolve(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-14 ? 0 : r[n] / r[i]));
}
function jacobian(fn, x, f0) {
  const J = f0.map(() => new Array(x.length).fill(0));
  for (let j = 0; j < x.length; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(x[j]));
    const xj = x[j]; x[j] = xj + h; fn.write(x); const f1 = fn.residuals(); x[j] = xj;
    for (let i = 0; i < f0.length; i++) J[i][j] = (f1[i] - f0[i]) / h;
  }
  fn.write(x);
  return J;
}

/* Solve sketch in place. drag: {id, x, y} pulls a point toward a target. */
function solveSketch(sk, vars, drag = null) {
  const fn = makeResidualFn(sk, vars);
  const n = fn.params.length;
  let x = fn.read();
  const drags = (drag ? (Array.isArray(drag) ? drag : [drag]) : []).map((d) => ({ ...d, i: fn.params.findIndex((q) => q.o.id === d.id && q.k === (d.k || 'x')) })).filter((d) => d.i >= 0);
  let lambda = 1e-3;
  const passes = drags.length ? [true, false] : [false];
  let ok = true, err = 0;
  for (const withDrag of passes) {
    const ev = () => {
      const r = fn.residuals();
      if (withDrag) for (const d of drags) { if (d.k === 'r') r.push(0.08 * (x[d.i] - d.r)); else r.push(0.08 * (x[d.i] - d.x), 0.08 * (x[d.i + 1] - d.y)); }
      return r;
    };
    const w = { write: (v) => fn.write(v), residuals: ev };
    let f = ev(); let cost = f.reduce((a, v) => a + v * v, 0);
    for (let it = 0; it < 60 && f.length && cost > 1e-20; it++) {
      const J = jacobian(w, x, f);
      const JTJ = Array.from({ length: n }, () => new Array(n).fill(0)), JTf = new Array(n).fill(0);
      for (let i = 0; i < f.length; i++) { const Ji = J[i]; for (let a = 0; a < n; a++) { if (!Ji[a]) continue; JTf[a] += Ji[a] * f[i]; for (let b = 0; b < n; b++) if (Ji[b]) JTJ[a][b] += Ji[a] * Ji[b]; } }
      for (let a = 0; a < n; a++) JTJ[a][a] += lambda * (1 + JTJ[a][a]) + 1e-9;
      const dx = linSolve(JTJ, JTf.map((v) => -v));
      const xn = x.map((v, i) => v + dx[i]);
      fn.write(xn); const fnew = ev(); const cn = fnew.reduce((a, v) => a + v * v, 0);
      if (cn < cost) { x = xn; f = fnew; cost = cn; lambda = Math.max(lambda / 3, 1e-9); }
      else { fn.write(x); lambda *= 4; if (lambda > 1e8) break; }
    }
    if (!withDrag) { err = Math.sqrt(cost); ok = err < 1e-5; }
  }
  // DOF / per-parameter determinacy
  const f = fn.residuals(); let dof = n; const det = new Array(n).fill(false);
  if (f.length && n) {
    const J = jacobian(fn, x, f);
    const { rank, free } = rref(J, n);
    dof = n - rank;
    // a parameter is determined if every nullspace vector has ~0 on it
    const nulls = free.vecs;
    for (let j = 0; j < n; j++) det[j] = nulls.every((v) => Math.abs(v[j]) < 1e-6);
  } else if (!n) dof = 0;
  const detPts = new Set();
  for (let i = 0; i < sk.pts.length; i++) if (det[i * 2] && det[i * 2 + 1]) detPts.add(sk.pts[i].id);
  const detR = new Set(); let k = sk.pts.length * 2;
  for (const e of sk.ents) if (e.type === 'circle') { if (det[k]) detR.add(e.id); k++; }
  return { ok, err, dof, detPts, detR };
}
function rref(J, n) {
  const M = J.map((r) => r.slice()); const m = M.length; const piv = []; let row = 0;
  for (let c = 0; c < n && row < m; c++) {
    let p = row; for (let r = row + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-7) continue;
    [M[row], M[p]] = [M[p], M[row]];
    const d = M[row][c]; for (let k = c; k < n; k++) M[row][k] /= d;
    for (let r = 0; r < m; r++) if (r !== row) { const f = M[r][c]; if (Math.abs(f) > 0) for (let k = c; k < n; k++) M[r][k] -= f * M[row][k]; }
    piv.push(c); row++;
  }
  const pset = new Set(piv); const vecs = [];
  for (let fc = 0; fc < n; fc++) {
    if (pset.has(fc)) continue;
    const v = new Array(n).fill(0); v[fc] = 1;
    piv.forEach((pc, r) => (v[pc] = -M[r][fc]));
    vecs.push(v);
  }
  return { rank: piv.length, free: { vecs } };
}

/* ---------------- regions ---------------- */
function pointInPoly(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) ins = !ins;
  }
  return ins;
}
function computeRegions(sk) {
  const { P } = skIndex(sk);
  const ents = sk.ents.filter((e) => !e.construction && e.type !== 'point');
  const loopsClosed = []; // isolated closed loops
  const hedges = [];
  const out = new Map();
  const key = (x, y) => Math.round(x * 1e4) + ',' + Math.round(y * 1e4);
  for (const e of ents) {
    const pl = entPolyline(P, e);
    if (e.type === 'circle') { pl.pop(); loopsClosed.push({ pts: pl, ent: pl.map(() => e.id) }); continue; }
    if (pl.length < 2) continue;
    const s = key(...pl[0]), t = key(...pl[pl.length - 1]);
    if (s === t) { pl.pop(); if (pl.length >= 3) loopsClosed.push({ pts: pl, ent: pl.map(() => e.id) }); continue; }
    const h1 = { from: s, to: t, pts: pl, ent: e.id }, h2 = { from: t, to: s, pts: pl.slice().reverse(), ent: e.id };
    h1.twin = h2; h2.twin = h1; hedges.push(h1, h2);
  }
  // prune dangling
  let alive = new Set(hedges);
  for (let changed = true; changed;) {
    changed = false; const deg = new Map();
    for (const h of alive) deg.set(h.from, (deg.get(h.from) || 0) + 1);
    for (const h of [...alive]) if ((deg.get(h.from) || 0) < 2 || (deg.get(h.to) || 0) < 2) { alive.delete(h); alive.delete(h.twin); changed = true; }
  }
  for (const h of alive) {
    const a = h.pts[0], b = h.pts[1]; h.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    let l = out.get(h.from); if (!l) out.set(h.from, (l = [])); l.push(h);
  }
  for (const l of out.values()) l.sort((p, q) => p.ang - q.ang);
  const faces = []; const used = new Set();
  for (const h0 of alive) {
    if (used.has(h0)) continue;
    const pts = [], ent = []; let h = h0, guard = 0;
    while (!used.has(h) && guard++ < 10000) {
      used.add(h);
      for (let i = 0; i < h.pts.length - 1; i++) { pts.push(h.pts[i]); ent.push(h.ent); }
      const n = h.pts.length; const back = Math.atan2(h.pts[n - 2][1] - h.pts[n - 1][1], h.pts[n - 2][0] - h.pts[n - 1][0]);
      const l = out.get(h.to);
      // next edge: the first one clockwise from the reverse direction
      let best = null, bestD = Infinity;
      for (const c of l) {
        if (c === h.twin && l.length > 1) continue;
        let d = back - c.ang; while (d <= 1e-9) d += Math.PI * 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      h = best || h.twin;
    }
    if (pts.length >= 3) faces.push({ pts, ent });
  }
  const bounded = [], outerB = [];
  for (const f of faces) { const a = signedArea(f.pts); if (a > 1e-9) bounded.push(f); else outerB.push(f); }
  for (const L of loopsClosed) { const o = orientLoop(L, true); bounded.push(o); outerB.push(orientLoop(L, false)); }
  // assign holes: each outer boundary goes into the smallest bounded face that strictly contains it
  const regions = bounded.map((f) => ({ outer: f, holes: [], area: Math.abs(signedArea(f.pts)) }));
  for (const ob of outerB) {
    const pt = ob.pts[0]; let best = null;
    const obA = Math.abs(signedArea(ob.pts));
    for (const r of regions) {
      if (r.area <= obA + 1e-9) continue;
      if (r.outer.pts.some((p) => Math.abs(p[0] - pt[0]) < 1e-7 && Math.abs(p[1] - pt[1]) < 1e-7)) continue;
      if (pointInPoly(pt, r.outer.pts) && (!best || r.area < best.area)) best = r;
    }
    if (best) best.holes.push(ob);
  }
  // keep only direct holes (not holes of holes)
  for (const r of regions) {
    r.holes = r.holes.filter((h) => !r.holes.some((o) => o !== h && Math.abs(signedArea(o.pts)) > Math.abs(signedArea(h.pts)) && pointInPoly(h.pts[0], o.pts)));
    r.area -= r.holes.reduce((a, h) => a + Math.abs(signedArea(h.pts)), 0);
    try {
      const T = triangulateRegion(r); let bestA = -1;
      for (const [a, b, c] of T.tris) {
        const A = T.all[a], B = T.all[b], C2 = T.all[c];
        const ar = Math.abs((B[0] - A[0]) * (C2[1] - A[1]) - (C2[0] - A[0]) * (B[1] - A[1]));
        if (ar > bestA) { bestA = ar; r.sample = [(A[0] + B[0] + C2[0]) / 3, (A[1] + B[1] + C2[1]) / 3]; }
      }
      r.tris = T;
    } catch { r.sample = r.outer.pts[0]; }
  }
  return regions.filter((r) => r.tris && r.tris.tris.length);
}
function regionContains(r, pt) {
  if (!pointInPoly(pt, r.outer.pts)) return false;
  return !r.holes.some((h) => pointInPoly(pt, h.pts));
}
/* depth of nesting for default selection: count outer boundaries containing region */
function regionDepth(regions, r) {
  // nesting depth by outline area: a ring's net area can be smaller than the disc inside it
  const outline = (x) => Math.abs(signedArea(x.outer.pts));
  return regions.filter((o) => o !== r && outline(o) > outline(r) && pointInPoly(r.sample, o.outer.pts)).length;
}

/* open path from sketch entities, chained end to end */
function sketchPath(sk) {
  const { P } = skIndex(sk);
  const ents = sk.ents.filter((e) => !e.construction && e.type !== 'point');
  if (!ents.length) return null;
  const polys = ents.map((e) => entPolyline(P, e));
  if (polys.length === 1) return polys[0];
  const key = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
  const deg = new Map();
  for (const pl of polys) for (const p of [pl[0], pl[pl.length - 1]]) deg.set(key(p), (deg.get(key(p)) || 0) + 1);
  let start = polys.findIndex((pl) => deg.get(key(pl[0])) === 1 || deg.get(key(pl[pl.length - 1])) === 1);
  if (start < 0) start = 0;
  let cur = polys[start]; if (deg.get(key(cur[0])) !== 1 && deg.get(key(cur[cur.length - 1])) === 1) cur = cur.slice().reverse();
  const used = new Set([start]); const path = cur.slice();
  for (;;) {
    const end = key(path[path.length - 1]); let found = false;
    for (let i = 0; i < polys.length; i++) {
      if (used.has(i)) continue; const pl = polys[i];
      if (key(pl[0]) === end) { path.push(...pl.slice(1)); used.add(i); found = true; break; }
      if (key(pl[pl.length - 1]) === end) { path.push(...pl.slice().reverse().slice(1)); used.add(i); found = true; break; }
    }
    if (!found) break;
  }
  return path;
}
