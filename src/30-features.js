/* =====================================================================
   Features: parametric history, references, regeneration
   ===================================================================== */
function stdPlanes() {
  return {
    top: { id: 'top', name: 'Top', o: new V3(), x: new V3(1, 0, 0), y: new V3(0, 1, 0), n: new V3(0, 0, 1) },
    front: { id: 'front', name: 'Front', o: new V3(), x: new V3(1, 0, 0), y: new V3(0, 0, 1), n: new V3(0, -1, 0) },
    right: { id: 'right', name: 'Right', o: new V3(), x: new V3(0, 1, 0), y: new V3(0, 0, 1), n: new V3(1, 0, 0) },
  };
}
function planeFromNormal(n, o) {
  n = n.clone().normalize();
  let x;
  if (Math.abs(n.z) > 0.999) x = new V3(1, 0, 0);
  else x = new V3(0, 0, 1).cross(n).normalize();
  const y = new V3().crossVectors(n, x);
  return { o: o.clone(), x, y, n };
}
function planeFromFace(face) {
  const n = face.normal.clone();
  const o = n.clone().multiplyScalar(face.d); // projection of world origin
  return planeFromNormal(n, o);
}
function newCtx() {
  return { parts: [], planes: stdPlanes(), sketches: {}, tools: {}, vars: {}, featureIds: new Set() };
}
function cloneCtx(c) {
  return { parts: c.parts.slice(), planes: { ...c.planes }, sketches: { ...c.sketches }, tools: { ...c.tools }, vars: { ...c.vars }, featureIds: new Set(c.featureIds) };
}

/* ---------- reference resolution ---------- */
function findPart(ctx, id) { return ctx.parts.find((p) => p.id === id); }
function resolveFace(ctx, ref) {
  const n = v3(ref.n), p = v3(ref.p);
  const cands = ref.part && findPart(ctx, ref.part) ? [findPart(ctx, ref.part), ...ctx.parts.filter((q) => q.id !== ref.part)] : ctx.parts;
  let best = null, bd = Infinity;
  for (const part of cands) {
    const an = analyze(part.solid);
    for (const f of an.faces.values()) {
      const nd = 1 - f.normal.dot(n);
      if (nd > 0.02) continue;
      let d;
      if (f.planar) {
        const pd = Math.abs(f.normal.dot(p) - f.d);
        if (pd > 1e-2 + 1e-3 * Math.abs(f.d)) continue;
        d = nearestTriDist(part.solid, f, p);
      } else d = nearestTriDist(part.solid, f, p) + nd * 10;
      if (d < bd) { bd = d; best = { part, face: f }; }
    }
    if (best && part.id === ref.part && bd < 1e-3) break;
  }
  if (!best || bd > 5) throw new Error('A referenced face no longer exists');
  return best;
}
function nearestTriDist(s, f, p) {
  const tri = new THREE.Triangle(), q = new V3(); let best = Infinity;
  for (const t of f.tris) {
    tri.set(s.vert(s.idx[t * 3]), s.vert(s.idx[t * 3 + 1]), s.vert(s.idx[t * 3 + 2]));
    tri.closestPointToPoint(p, q); const d = q.distanceTo(p); if (d < best) best = d;
  }
  return best;
}
function resolveEdge(ctx, ref) {
  const a = v3(ref.a), b = v3(ref.b), m = a.clone().add(b).multiplyScalar(0.5), dir = b.clone().sub(a).normalize();
  let best = null, bd = Infinity;
  const cands = ref.part && findPart(ctx, ref.part) ? [findPart(ctx, ref.part)] : ctx.parts;
  for (const part of cands) for (const e of analyze(part.solid).edges) {
    const ea = e.pts[0], eb = e.pts[e.pts.length - 1];
    const em = e.straight ? ea.clone().add(eb).multiplyScalar(0.5) : e.pts[Math.floor(e.pts.length / 2)];
    let d = em.distanceTo(m) + Math.min(ea.distanceTo(a) + eb.distanceTo(b), ea.distanceTo(b) + eb.distanceTo(a)) * 0.25;
    if (e.straight && dir.lengthSq() > 0) d += (1 - Math.abs(eb.clone().sub(ea).normalize().dot(dir))) * 20;
    if (d < bd) { bd = d; best = { part, edge: e }; }
  }
  if (!best || bd > 5) throw new Error('A referenced edge no longer exists');
  return best;
}
function resolvePlane(ctx, ref) {
  if (!ref) throw new Error('Select a plane or planar face');
  if (ref.kind === 'plane') { const p = ctx.planes[ref.id]; if (!p) throw new Error('Referenced plane is missing'); return p; }
  if (ref.kind === 'face') {
    const { face } = resolveFace(ctx, ref);
    if (!face.planar) throw new Error('Selected face is not planar');
    return planeFromFace(face);
  }
  throw new Error('Select a plane or planar face');
}
function resolveRegion(ctx, ref) {
  const sk = ctx.sketches[ref.sketch];
  if (!sk) throw new Error('Referenced sketch is missing');
  const pt = ref.pt;
  let best = null;
  for (const r of sk.regions) if (regionContains(r, pt) && (!best || r.area < best.area)) best = r;
  if (!best) throw new Error('A selected sketch region no longer exists');
  return { plane: sk.plane, region: best };
}
function loopKeysByAngle(pts2) {
  const n = pts2.length; const keys = new Array(n); let k = 0;
  const dir = (i) => { const a = pts2[i], b = pts2[(i + 1) % n]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  let start = 0;
  for (let i = 0; i < n; i++) { const d0 = dir((i - 1 + n) % n), d1 = dir(i); if (d0[0] * d1[0] + d0[1] * d1[1] < 0.94) { start = i; break; } }
  for (let j = 0; j < n; j++) {
    const i = (start + j) % n;
    if (j > 0) { const d0 = dir((i - 1 + n) % n), d1 = dir(i); if (d0[0] * d1[0] + d0[1] * d1[1] < 0.94) k++; }
    keys[i] = 'f' + k;
  }
  return keys;
}
function faceAsRegion(part, face) {
  if (!face.planar) throw new Error('Only planar faces can be used as a profile');
  const pl = planeFromFace(face);
  const loops = faceLoops(part.solid, face.id).map((L) => {
    const pts = L.map((p) => { const q = toPlane(pl, p); return [q[0], q[1]]; });
    return { pts, ent: loopKeysByAngle(pts) };
  });
  if (!loops.length) throw new Error('Face has no boundary');
  loops.sort((a, b) => Math.abs(signedArea(b.pts)) - Math.abs(signedArea(a.pts)));
  return { plane: pl, region: { outer: loops[0], holes: loops.slice(1) } };
}
function gatherProfiles(ctx, refs) {
  const out = [];
  for (const r of refs || []) {
    if (r.kind === 'region') out.push(resolveRegion(ctx, r));
    else if (r.kind === 'face') { const { part, face } = resolveFace(ctx, r); out.push(faceAsRegion(part, face)); }
  }
  return out;
}
function groupByPlane(profs) {
  const groups = [];
  for (const p of profs) {
    let g = groups.find((q) => q.plane === p.plane || (q.plane.n.dot(p.plane.n) > 0.99999 && Math.abs(q.plane.n.dot(new V3().subVectors(p.plane.o, q.plane.o))) < 1e-6 && q.plane.x.dot(p.plane.x) > 0.99999));
    if (!g) groups.push((g = { plane: p.plane, regions: [] }));
    if (g.plane === p.plane) g.regions.push(p.region);
    else {
      // re-express in group plane coordinates
      const map = (L) => ({ pts: L.pts.map((q) => { const w = toWorld(p.plane, q[0], q[1]); const r = toPlane(g.plane, w); return [r[0], r[1]]; }), ent: L.ent });
      g.regions.push({ outer: map(p.region.outer), holes: p.region.holes.map(map) });
    }
  }
  return groups;
}
function axisFrom(ctx, P, key = 'axis', selKey = 'axisSel') {
  const sel = P[selKey] || 'pick';
  if (sel === 'X') return { o: new V3(), d: new V3(1, 0, 0) };
  if (sel === 'Y') return { o: new V3(), d: new V3(0, 1, 0) };
  if (sel === 'Z') return { o: new V3(), d: new V3(0, 0, 1) };
  const ref = (P[key] || [])[0];
  if (!ref) throw new Error('Select an axis');
  if (ref.kind === 'sketchEnt') {
    const sk = ctx.sketches[ref.sketch]; if (!sk) throw new Error('Axis sketch is missing');
    const e = sk.data.ents.find((q) => q.id === ref.ent); if (!e || e.type !== 'line') throw new Error('Axis must be a sketch line');
    const { P: PP } = skIndex(sk.data); const a = PP.get(e.p1), b = PP.get(e.p2);
    const A = toWorld(sk.plane, a.x, a.y), B = toWorld(sk.plane, b.x, b.y);
    return { o: A, d: B.sub(A).normalize() };
  }
  if (ref.kind === 'edge') {
    const { edge } = resolveEdge(ctx, ref);
    if (!edge.straight) throw new Error('Axis edge must be straight');
    const A = edge.pts[0].clone(), B = edge.pts[edge.pts.length - 1].clone();
    return { o: A, d: B.sub(A).normalize() };
  }
  throw new Error('Select a line or straight edge');
}

/* ---------- parts & booleans ---------- */
function setPart(ctx, id, solid) {
  const i = ctx.parts.findIndex((p) => p.id === id);
  if (!solid || !solid.nt) { if (i >= 0) ctx.parts.splice(i, 1); return; }
  if (i >= 0) ctx.parts[i] = { ...ctx.parts[i], solid };
  else ctx.parts.push({ id, solid });
}
function partTargets(ctx, ids, tool) {
  if (ids && ids.length) return ctx.parts.filter((p) => ids.includes(p.id));
  return ctx.parts.filter((p) => bboxOverlap(p.solid, tool));
}
function applyOp(ctx, fid, tool, op, targetRefs) {
  const ids = (targetRefs || []).map((r) => r.id);
  if (!tool || !tool.nt) throw new Error('Feature produced no geometry');
  if (op === 'new') {
    splitBodies(tool).forEach((b, k) => setPart(ctx, k ? fid + '.' + k : fid, b));
    return;
  }
  const targets = partTargets(ctx, ids, tool);
  if (op === 'add') {
    if (!targets.length) { splitBodies(tool).forEach((b, k) => setPart(ctx, k ? fid + '.' + k : fid, b)); return; }
    let s = csg(targets[0].solid, tool, 'union');
    for (const t of targets.slice(1)) { s = csg(s, t.solid, 'union'); setPart(ctx, t.id, null); }
    setPart(ctx, targets[0].id, s);
    return;
  }
  if (!targets.length) throw new Error('The tool does not touch any part');
  for (const t of targets) {
    const r = csg(t.solid, tool, op === 'remove' ? 'subtract' : 'intersect');
    const bodies = splitBodies(r);
    setPart(ctx, t.id, bodies[0] || null);
    bodies.slice(1).forEach((b, k) => setPart(ctx, t.id + '~' + fid.slice(-3) + k, b));
  }
}

/* ---------- field helpers ---------- */
const OPS = [['new', 'New'], ['add', 'Add'], ['remove', 'Remove'], ['intersect', 'Intersect']];
const F_OP = (def = 'new') => ({ key: 'op', type: 'seg', options: OPS, def });
const F_TARGETS = { key: 'targets', label: 'Merge scope', type: 'pick', pick: ['part'], multi: true, optional: true, hint: 'Blank = every part the tool touches', show: (p) => p.op !== 'new' };
const AXIS_SEL = [['pick', 'Pick'], ['X', 'X'], ['Y', 'Y'], ['Z', 'Z']];

/* ---------- fillet & chamfer cutters ---------- */
function edgeFrame(solid, edge) {
  const an = analyze(solid);
  const [fa, fb] = edge.faces; const F1 = an.faces.get(fa), F2 = an.faces.get(fb);
  if (!F1 || !F2 || fa < 0) return null;
  if (!F1.planar || !F2.planar || !edge.straight) return null;
  const v0 = edge.verts[0], v1 = edge.verts[1];
  const inward = (F) => {
    for (const t of F.tris) {
      const ids = [solid.idx[t * 3], solid.idx[t * 3 + 1], solid.idx[t * 3 + 2]];
      if (ids.includes(v0) && ids.includes(v1)) { const w = ids.find((i) => i !== v0 && i !== v1); return solid.vert(w); }
    }
    return null;
  };
  const A = edge.pts[0].clone(), B = edge.pts[edge.pts.length - 1].clone();
  const e = B.clone().sub(A); const len = e.length(); e.normalize();
  const w1 = inward(F1), w2 = inward(F2);
  if (!w1 || !w2) return null;
  const perp = (w) => { const q = w.clone().sub(A); return q.sub(e.clone().multiplyScalar(q.dot(e))).normalize(); };
  const u1 = perp(w1), u2 = perp(w2);
  const n1 = F1.normal.clone(), n2 = F2.normal.clone();
  const convex = u2.dot(n1) < 0;
  return { A, B, e, len, n1, n2, u1, u2, convex };
}
function cutterFromSection(fr, sec2, arcKeyFrom) {
  // sec2: array of V3 points in the plane through A perpendicular to e
  const x = fr.n1.clone(), y = new V3().crossVectors(fr.e, x);
  const ext = 2e-3;
  const pl = { o: fr.A.clone().addScaledVector(fr.e, -ext), x, y, n: fr.e.clone() };
  const pts = sec2.map((p) => { const q = p.clone().sub(fr.A); return [q.dot(x), q.dot(y)]; });
  const ent = pts.map((_, i) => (arcKeyFrom != null && i >= arcKeyFrom.from && i < arcKeyFrom.to ? 'arc' : 's' + i));
  return extrudeRegions([{ outer: { pts, ent }, holes: [] }], pl, 0, fr.len + 2 * ext);
}
function filletTool(fr, r) {
  const c = fr.n1.dot(fr.n2); const eps = Math.max(1e-3, r * 0.02);
  const s = fr.convex ? -1 : 1;
  const C = fr.A.clone().addScaledVector(fr.n1.clone().add(fr.n2), (s * r) / (1 + c));
  const T1 = C.clone().addScaledVector(fr.n1, -s * r), T2 = C.clone().addScaledVector(fr.n2, -s * r);
  const x = fr.n1.clone(), y = new V3().crossVectors(fr.e, x);
  const ang = (p) => Math.atan2(p.clone().sub(C).dot(y), p.clone().sub(C).dot(x));
  const a1 = ang(T1), a2 = ang(T2), am = ang(fr.A);
  let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  // choose arc direction that passes the side facing A
  let dm = am - a1; while (dm > Math.PI) dm -= 2 * Math.PI; while (dm < -Math.PI) dm += 2 * Math.PI;
  if (Math.sign(dm) !== Math.sign(d) || Math.abs(dm) > Math.abs(d)) d = d > 0 ? d - 2 * Math.PI : d + 2 * Math.PI;
  const N = Math.max(6, Math.round((segsFor(r) * Math.abs(d)) / (2 * Math.PI)));
  const pts = [fr.A.clone().addScaledVector(fr.n1.clone().add(fr.n2), -s * eps), T1.clone().addScaledVector(fr.n1, -s * eps)];
  for (let i = 0; i <= N; i++) { const t = a1 + (d * i) / N; pts.push(C.clone().addScaledVector(x, r * Math.cos(t)).addScaledVector(y, r * Math.sin(t))); }
  pts.push(T2.clone().addScaledVector(fr.n2, -s * eps));
  return cutterFromSection(fr, pts, { from: 2, to: 2 + N });
}
function chamferTool(fr, d1, d2) {
  const eps = Math.max(1e-3, d1 * 0.02); const s = fr.convex ? -1 : 1;
  const pts = [
    fr.A.clone().addScaledVector(fr.n1.clone().add(fr.n2), -s * eps),
    fr.A.clone().addScaledVector(fr.u1, d1).addScaledVector(fr.n1, -s * eps),
    fr.A.clone().addScaledVector(fr.u2, d2).addScaledVector(fr.n2, -s * eps),
  ];
  return cutterFromSection(fr, pts, null);
}
function collectEdges(ctx, refs) {
  const byPart = new Map(); let skipped = 0;
  const add = (part, edge) => {
    let l = byPart.get(part.id); if (!l) byPart.set(part.id, (l = { part, edges: [] }));
    if (!l.edges.includes(edge)) l.edges.push(edge);
  };
  for (const r of refs || []) {
    if (r.kind === 'edge') { const { part, edge } = resolveEdge(ctx, r); add(part, edge); }
    else if (r.kind === 'face') {
      const { part, face } = resolveFace(ctx, r);
      for (const e of analyze(part.solid).edges) if (e.faces.includes(face.id)) add(part, e);
    }
  }
  return { byPart, skipped };
}
function edgeBlend(ctx, f, P, kind) {
  const { byPart } = collectEdges(ctx, P.edges);
  if (!byPart.size) throw new Error('Select edges or faces');
  let skipped = 0, done = 0;
  for (const { part, edges } of byPart.values()) {
    const cuts = [], fills = [];
    for (const e of edges) {
      const fr = edgeFrame(part.solid, e);
      if (!fr) { skipped++; continue; }
      const tool = kind === 'fillet' ? filletTool(fr, P.radius) : chamferTool(fr, P.distance, P.asym ? P.distance2 : P.distance);
      (fr.convex ? cuts : fills).push(tool);
    }
    let s = findPart(ctx, part.id).solid;
    for (const c of cuts) { s = csg(s, c, 'subtract'); done++; }
    for (const c of fills) { s = csg(s, c, 'union'); done++; }
    setPart(ctx, part.id, s);
  }
  if (!done) throw new Error('Only straight edges between flat faces can be ' + (kind === 'fillet' ? 'filleted' : 'chamfered'));
  if (skipped) f._warn = `${skipped} curved edge${skipped > 1 ? 's' : ''} skipped`;
}

/* ---------- transforms for patterns ---------- */
function patternMatrices(ctx, P, kind) {
  const ms = [];
  if (kind === 'linear') {
    const dir = (key, sel, flip) => { const a = axisFrom(ctx, P, key, sel); return a.d.clone().multiplyScalar(P[flip] ? -1 : 1); };
    const d1 = dir('dir', 'dirSel', 'flip');
    const n1 = Math.max(1, Math.round(P.count)); const n2 = P.dir2Sel && P.dir2Sel !== 'none' ? Math.max(1, Math.round(P.count2)) : 1;
    const d2 = n2 > 1 ? dir('dir2', 'dir2Sel', 'flip2') : new V3();
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) {
      if (!i && !j) continue;
      const t = d1.clone().multiplyScalar(P.distance * i).addScaledVector(d2, (P.distance2 || 0) * j);
      ms.push(new THREE.Matrix4().makeTranslation(t.x, t.y, t.z));
    }
  } else if (kind === 'circular') {
    const ax = axisFrom(ctx, P, 'axis', 'axisSel');
    const n = Math.max(1, Math.round(P.count));
    const full = Math.abs(P.angle) >= 359.999;
    const step = P.equal ? (full ? P.angle / n : P.angle / Math.max(1, n - 1)) : P.angle;
    for (let i = 1; i < n; i++) {
      const m = new THREE.Matrix4().makeTranslation(ax.o.x, ax.o.y, ax.o.z)
        .multiply(new THREE.Matrix4().makeRotationAxis(ax.d, step * i * DEG * (P.flip ? -1 : 1)))
        .multiply(new THREE.Matrix4().makeTranslation(-ax.o.x, -ax.o.y, -ax.o.z));
      ms.push(m);
    }
  }
  return ms;
}
function applyCopies(ctx, f, P, ms) {
  if (P.mode === 'feature') {
    const feats = (P.features || []).map((r) => r.id);
    if (!feats.length) throw new Error('Select features to pattern');
    ms.forEach((m, k) => {
      for (const id of feats) {
        const t = ctx.tools[id]; if (!t) throw new Error('A selected feature cannot be patterned');
        applyOp(ctx, f.id + '#' + k + id.slice(-3), transformSolid(t.solid, m, true), t.op, t.targets);
      }
    });
  } else {
    const parts = (P.parts || []).map((r) => findPart(ctx, r.id)).filter(Boolean);
    if (!parts.length) throw new Error('Select parts');
    for (const part of parts) {
      const copies = ms.map((m) => transformSolid(part.solid, m, true));
      if (P.merge) { let s = part.solid; for (const c of copies) s = csg(s, c, 'union'); setPart(ctx, part.id, s); }
      else copies.forEach((c, k) => setPart(ctx, part.id + '·' + f.id.slice(-3) + (k + 1), c));
    }
  }
}

/* ---------- feature registry ---------- */
const FEATURES = {
  sketch: {
    label: 'Sketch', icon: 'sketch',
    fields: [{ key: 'plane', label: 'Sketch plane', type: 'pick', pick: ['plane', 'face'], multi: false }],
    exec(ctx, f, P) {
      const ref = (P.plane || [])[0];
      const plane = resolvePlane(ctx, ref);
      const data = deepClone(f.params.data || newSketchData());
      const sol = solveSketch(data, ctx.vars);
      const regions = computeRegions(data);
      ctx.sketches[f.id] = { id: f.id, plane, data, regions, solve: sol };
    },
  },
  extrude: {
    label: 'Extrude', icon: 'extrude', key: 'E',
    fields: [
      { key: 'entities', label: 'Faces and sketch regions', type: 'pick', pick: ['region', 'face'], multi: true },
      F_OP('new'),
      { key: 'endType', label: 'End type', type: 'select', options: [['blind', 'Blind'], ['symmetric', 'Symmetric'], ['through', 'Through all']], def: 'blind' },
      { key: 'depth', label: 'Depth', type: 'len', def: '20', show: (p) => p.endType !== 'through' },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false, show: (p) => p.endType !== 'symmetric' },
      { key: 'depth2On', label: 'Second direction', type: 'check', def: false, show: (p) => p.endType === 'blind' },
      { key: 'depth2', label: 'Second depth', type: 'len', def: '10', show: (p) => p.endType === 'blind' && p.depth2On },
      F_TARGETS,
    ],
    exec(ctx, f, P) {
      const profs = gatherProfiles(ctx, P.entities);
      if (!profs.length) throw new Error('Select sketch regions or planar faces');
      let D = P.depth;
      if (P.endType === 'through') { const bb = new THREE.Box3(); ctx.parts.forEach((p) => bb.union(p.solid.bbox())); D = bb.isEmpty() ? 1000 : bb.min.distanceTo(bb.max) * 2 + 10; }
      if (!(D > 0)) throw new Error('Depth must be greater than zero');
      let d0, d1;
      if (P.endType === 'symmetric') { d0 = -D / 2; d1 = D / 2; }
      else { const s = P.flip ? -1 : 1; d0 = 0; d1 = s * D; if (P.endType === 'blind' && P.depth2On) d0 = -s * P.depth2; }
      let tool = null;
      for (const g of groupByPlane(profs)) { const t = extrudeRegions(g.regions, g.plane, d0, d1); tool = tool ? csg(tool, t, 'union') : t; }
      ctx.tools[f.id] = { solid: tool, op: P.op, targets: P.targets };
      applyOp(ctx, f.id, tool, P.op, P.targets);
    },
  },
  revolve: {
    label: 'Revolve', icon: 'revolve', key: 'W',
    fields: [
      { key: 'entities', label: 'Sketch regions', type: 'pick', pick: ['region', 'face'], multi: true },
      F_OP('new'),
      { key: 'axisSel', label: 'Axis', type: 'seg', options: AXIS_SEL, def: 'pick' },
      { key: 'axis', label: 'Revolve axis', type: 'pick', pick: ['sketchLine', 'edge'], multi: false, show: (p) => p.axisSel === 'pick' },
      { key: 'revType', label: 'Revolve type', type: 'select', options: [['full', 'Full'], ['one', 'One direction'], ['symmetric', 'Symmetric']], def: 'full' },
      { key: 'angle', label: 'Angle', type: 'ang', def: '180', show: (p) => p.revType !== 'full' },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false, show: (p) => p.revType === 'one' },
      F_TARGETS,
    ],
    exec(ctx, f, P) {
      const profs = gatherProfiles(ctx, P.entities);
      if (!profs.length) throw new Error('Select sketch regions');
      const ax = axisFrom(ctx, P);
      let ang = 360, start = 0;
      if (P.revType === 'one') ang = P.angle * (P.flip ? -1 : 1);
      if (P.revType === 'symmetric') { ang = P.angle; start = -P.angle / 2; }
      if (Math.abs(ang) < 1e-6) throw new Error('Angle must not be zero');
      let tool = null;
      for (const g of groupByPlane(profs)) { const t = revolveRegions(g.regions, g.plane, ax.o, ax.d, ang, start); tool = tool ? csg(tool, t, 'union') : t; }
      ctx.tools[f.id] = { solid: tool, op: P.op, targets: P.targets };
      applyOp(ctx, f.id, tool, P.op, P.targets);
    },
  },
  sweep: {
    label: 'Sweep', icon: 'sweep',
    fields: [
      { key: 'entities', label: 'Profile regions', type: 'pick', pick: ['region', 'face'], multi: true },
      { key: 'path', label: 'Path (sketch or edge)', type: 'pick', pick: ['sketch', 'edge'], multi: false },
      F_OP('new'), F_TARGETS,
    ],
    exec(ctx, f, P) {
      const profs = gatherProfiles(ctx, P.entities);
      if (!profs.length) throw new Error('Select a profile region');
      const pref = (P.path || [])[0]; if (!pref) throw new Error('Select a path');
      let path;
      if (pref.kind === 'sketch') {
        const sk = ctx.sketches[pref.id]; if (!sk) throw new Error('Path sketch is missing');
        const p2 = sketchPath(sk.data); if (!p2) throw new Error('Path sketch is empty');
        path = p2.map((q) => toWorld(sk.plane, q[0], q[1]));
      } else { const { edge } = resolveEdge(ctx, pref); path = edge.pts.map((p) => p.clone()); }
      // start the path at the end nearest the profile
      const pc = toWorld(profs[0].plane, profs[0].region.sample?.[0] ?? profs[0].region.outer.pts[0][0], profs[0].region.sample?.[1] ?? profs[0].region.outer.pts[0][1]);
      if (path[path.length - 1].distanceTo(pc) < path[0].distanceTo(pc)) path.reverse();
      let tool = null;
      for (const g of groupByPlane(profs)) { const t = sweepRegions(g.regions, g.plane, path); tool = tool ? csg(tool, t, 'union') : t; }
      ctx.tools[f.id] = { solid: tool, op: P.op, targets: P.targets };
      applyOp(ctx, f.id, tool, P.op, P.targets);
    },
  },
  loft: {
    label: 'Loft', icon: 'loft',
    fields: [
      { key: 'profiles', label: 'Profiles (in order)', type: 'pick', pick: ['region', 'face'], multi: true },
      F_OP('new'), F_TARGETS,
    ],
    exec(ctx, f, P) {
      const profs = gatherProfiles(ctx, P.profiles);
      if (profs.length < 2) throw new Error('Select at least two profiles');
      const loops = profs.map((p) => p.region.outer.pts.map((q) => toWorld(p.plane, q[0], q[1])));
      if (profs.some((p) => p.region.holes.length)) f._warn = 'Holes in loft profiles are ignored';
      const tool = loftLoops(loops);
      ctx.tools[f.id] = { solid: tool, op: P.op, targets: P.targets };
      applyOp(ctx, f.id, tool, P.op, P.targets);
    },
  },
  fillet: {
    label: 'Fillet', icon: 'fillet', key: 'F',
    fields: [
      { key: 'edges', label: 'Edges or faces', type: 'pick', pick: ['edge', 'face'], multi: true },
      { key: 'radius', label: 'Radius', type: 'len', def: '3' },
    ],
    exec(ctx, f, P) { if (!(P.radius > 0)) throw new Error('Radius must be greater than zero'); edgeBlend(ctx, f, P, 'fillet'); },
  },
  chamfer: {
    label: 'Chamfer', icon: 'chamfer', key: 'C',
    fields: [
      { key: 'edges', label: 'Edges or faces', type: 'pick', pick: ['edge', 'face'], multi: true },
      { key: 'distance', label: 'Distance', type: 'len', def: '2' },
      { key: 'asym', label: 'Two distances', type: 'check', def: false },
      { key: 'distance2', label: 'Second distance', type: 'len', def: '4', show: (p) => p.asym },
    ],
    exec(ctx, f, P) { if (!(P.distance > 0)) throw new Error('Distance must be greater than zero'); edgeBlend(ctx, f, P, 'chamfer'); },
  },
  shell: {
    label: 'Shell', icon: 'shell',
    fields: [
      { key: 'faces', label: 'Faces to remove', type: 'pick', pick: ['face'], multi: true, optional: true },
      { key: 'part', label: 'Part (for a closed shell)', type: 'pick', pick: ['part'], multi: false, optional: true },
      { key: 'thickness', label: 'Thickness', type: 'len', def: '2' },
    ],
    exec(ctx, f, P) {
      if (!(P.thickness > 0)) throw new Error('Thickness must be greater than zero');
      const faces = (P.faces || []).map((r) => resolveFace(ctx, r));
      let part = faces[0]?.part || (P.part?.[0] && findPart(ctx, P.part[0].id));
      if (!part) throw new Error('Select faces to remove or a part');
      const removed = new Set(faces.filter((q) => q.part.id === part.id).map((q) => q.face.id));
      const inner = offsetSolid(part.solid, (fid) => (removed.has(fid) ? P.thickness * 1.5 : -P.thickness));
      setPart(ctx, part.id, csg(part.solid, inner, 'subtract'));
    },
  },
  hole: {
    label: 'Hole', icon: 'hole', key: 'H',
    fields: [
      { key: 'sketch', label: 'Sketch with hole points', type: 'pick', pick: ['sketch'], multi: false },
      { key: 'style', label: 'Style', type: 'seg', options: [['simple', 'Simple'], ['cbore', 'C-bore'], ['csink', 'C-sink']], def: 'simple' },
      { key: 'dia', label: 'Diameter', type: 'len', def: '6.6' },
      { key: 'cboreDia', label: 'Counterbore diameter', type: 'len', def: '11', show: (p) => p.style === 'cbore' },
      { key: 'cboreDepth', label: 'Counterbore depth', type: 'len', def: '6.4', show: (p) => p.style === 'cbore' },
      { key: 'csinkDia', label: 'Countersink diameter', type: 'len', def: '13', show: (p) => p.style === 'csink' },
      { key: 'csinkAngle', label: 'Countersink angle', type: 'ang', def: '90', show: (p) => p.style === 'csink' },
      { key: 'endType', label: 'Termination', type: 'select', options: [['through', 'Through all'], ['blind', 'Blind']], def: 'through' },
      { key: 'depth', label: 'Depth', type: 'len', def: '10', show: (p) => p.endType === 'blind' },
      { key: 'tipAngle', label: 'Tip angle', type: 'ang', def: '118', show: (p) => p.endType === 'blind' },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false },
      { key: 'targets', label: 'Parts', type: 'pick', pick: ['part'], multi: true, optional: true, hint: 'Blank = every part the holes touch' },
    ],
    exec(ctx, f, P) {
      const sref = (P.sketch || [])[0]; if (!sref) throw new Error('Select a sketch with points');
      const sk = ctx.sketches[sref.id]; if (!sk) throw new Error('Hole sketch is missing');
      const { P: PP } = skIndex(sk.data);
      let pts = sk.data.ents.filter((e) => e.type === 'point').map((e) => PP.get(e.p));
      if (!pts.length) pts = sk.data.ents.filter((e) => e.type === 'circle' && !e.construction).map((e) => PP.get(e.c));
      if (!pts.length) throw new Error('The sketch needs sketch points (or circles) to place holes');
      const r = P.dia / 2; if (!(r > 0)) throw new Error('Diameter must be greater than zero');
      const bb = new THREE.Box3(); ctx.parts.forEach((p) => bb.union(p.solid.bbox()));
      const big = bb.isEmpty() ? 1000 : bb.min.distanceTo(bb.max) * 2 + 10;
      const depth = P.endType === 'through' ? big : P.depth;
      const tipH = P.endType === 'blind' ? r / Math.tan((P.tipAngle * DEG) / 2) : 0;
      const top = 0.05;
      let prof = [];
      if (P.style === 'cbore') { const R = P.cboreDia / 2; if (R <= r) throw new Error('Counterbore must be wider than the hole'); prof = [[0, top], [R, top], [R, -P.cboreDepth], [r, -P.cboreDepth]]; }
      else if (P.style === 'csink') { const R = P.csinkDia / 2; if (R <= r) throw new Error('Countersink must be wider than the hole'); const h = (R - r) / Math.tan((P.csinkAngle * DEG) / 2); prof = [[0, top], [R + top * Math.tan((P.csinkAngle * DEG) / 2), top], [r, -h]]; }
      else prof = [[0, top], [r, top]];
      prof.push([r, -depth]);
      if (tipH > 0) prof.push([0, -depth - tipH]); else prof.push([0, -depth]);
      // holes drill into material: pick the side of the sketch plane that has material
      let side = 1;
      { const p0 = toWorld(sk.plane, pts[0].x, pts[0].y); const probe = (s) => ctx.parts.some((q) => pointInSolid(q.solid, p0.clone().addScaledVector(sk.plane.n, s * 0.05)));
        if (!probe(-1) && probe(1)) side = -1; }
      const n = sk.plane.n.clone().multiplyScalar(side * (P.flip ? -1 : 1));
      let tool = null;
      for (const p of pts) {
        const o = toWorld(sk.plane, p.x, p.y);
        const x = sk.plane.x.clone(); const y = n.clone(); const pl = { o, x, y, n: new V3().crossVectors(x, y) };
        const ent = prof.map((_, i) => 'h' + i);
        const t = revolveRegions([{ outer: { pts: prof.map((q) => [q[0], q[1]]), ent }, holes: [] }], pl, o, n, 360);
        tool = tool ? csg(tool, t, 'union') : t;
      }
      ctx.tools[f.id] = { solid: tool, op: 'remove', targets: P.targets };
      applyOp(ctx, f.id, tool, 'remove', P.targets);
    },
  },
  plane: {
    label: 'Plane', icon: 'plane',
    fields: [
      { key: 'ref', label: 'Reference plane or face', type: 'pick', pick: ['plane', 'face'], multi: false },
      { key: 'offset', label: 'Offset', type: 'len', def: '25' },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false },
    ],
    exec(ctx, f, P) {
      const b = resolvePlane(ctx, (P.ref || [])[0]);
      const s = P.flip ? -1 : 1;
      ctx.planes[f.id] = { id: f.id, name: f.name, o: b.o.clone().addScaledVector(b.n, P.offset * s), x: b.x.clone(), y: b.y.clone(), n: b.n.clone(), custom: true };
    },
  },
  lpattern: {
    label: 'Linear pattern', icon: 'lpattern',
    fields: [
      { key: 'mode', type: 'seg', options: [['part', 'Part'], ['feature', 'Feature']], def: 'feature' },
      { key: 'parts', label: 'Parts to pattern', type: 'pick', pick: ['part'], multi: true, show: (p) => p.mode === 'part' },
      { key: 'features', label: 'Features to pattern', type: 'pick', pick: ['feature'], multi: true, show: (p) => p.mode === 'feature', hint: 'Click features in the list' },
      { key: 'dirSel', label: 'Direction', type: 'seg', options: AXIS_SEL, def: 'X' },
      { key: 'dir', label: 'Direction edge or line', type: 'pick', pick: ['edge', 'sketchLine'], multi: false, show: (p) => p.dirSel === 'pick' },
      { key: 'distance', label: 'Spacing', type: 'len', def: '20' },
      { key: 'count', label: 'Instance count', type: 'int', def: '3' },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false },
      { key: 'dir2Sel', label: 'Second direction', type: 'select', options: [['none', 'None'], ['X', 'X'], ['Y', 'Y'], ['Z', 'Z'], ['pick', 'Pick edge']], def: 'none' },
      { key: 'dir2', label: 'Second direction edge', type: 'pick', pick: ['edge', 'sketchLine'], multi: false, show: (p) => p.dir2Sel === 'pick' },
      { key: 'distance2', label: 'Second spacing', type: 'len', def: '20', show: (p) => p.dir2Sel !== 'none' },
      { key: 'count2', label: 'Second count', type: 'int', def: '2', show: (p) => p.dir2Sel !== 'none' },
      { key: 'flip2', label: 'Flip second direction', type: 'check', def: false, show: (p) => p.dir2Sel !== 'none' },
      { key: 'merge', label: 'Merge copies with the original', type: 'check', def: false, show: (p) => p.mode === 'part' },
    ],
    exec(ctx, f, P) { applyCopies(ctx, f, P, patternMatrices(ctx, P, 'linear')); },
  },
  cpattern: {
    label: 'Circular pattern', icon: 'cpattern',
    fields: [
      { key: 'mode', type: 'seg', options: [['part', 'Part'], ['feature', 'Feature']], def: 'feature' },
      { key: 'parts', label: 'Parts to pattern', type: 'pick', pick: ['part'], multi: true, show: (p) => p.mode === 'part' },
      { key: 'features', label: 'Features to pattern', type: 'pick', pick: ['feature'], multi: true, show: (p) => p.mode === 'feature', hint: 'Click features in the list' },
      { key: 'axisSel', label: 'Axis', type: 'seg', options: AXIS_SEL, def: 'Z' },
      { key: 'axis', label: 'Axis edge or line', type: 'pick', pick: ['edge', 'sketchLine'], multi: false, show: (p) => p.axisSel === 'pick' },
      { key: 'angle', label: 'Angle', type: 'ang', def: '360' },
      { key: 'count', label: 'Instance count', type: 'int', def: '6' },
      { key: 'equal', label: 'Equal spacing', type: 'check', def: true },
      { key: 'flip', label: 'Opposite direction', type: 'check', def: false },
      { key: 'merge', label: 'Merge copies with the original', type: 'check', def: false, show: (p) => p.mode === 'part' },
    ],
    exec(ctx, f, P) { applyCopies(ctx, f, P, patternMatrices(ctx, P, 'circular')); },
  },
  mirror: {
    label: 'Mirror', icon: 'mirror',
    fields: [
      { key: 'mode', type: 'seg', options: [['part', 'Part'], ['feature', 'Feature']], def: 'part' },
      { key: 'parts', label: 'Parts to mirror', type: 'pick', pick: ['part'], multi: true, show: (p) => p.mode === 'part' },
      { key: 'features', label: 'Features to mirror', type: 'pick', pick: ['feature'], multi: true, show: (p) => p.mode === 'feature', hint: 'Click features in the list' },
      { key: 'plane', label: 'Mirror plane', type: 'pick', pick: ['plane', 'face'], multi: false },
      { key: 'merge', label: 'Merge with the original', type: 'check', def: true, show: (p) => p.mode === 'part' },
    ],
    exec(ctx, f, P) { const pl = resolvePlane(ctx, (P.plane || [])[0]); applyCopies(ctx, f, P, [mirrorMatrix(pl)]); },
  },
  boolean: {
    label: 'Boolean', icon: 'boolean',
    fields: [
      { key: 'bop', type: 'seg', options: [['union', 'Union'], ['subtract', 'Subtract'], ['intersect', 'Intersect']], def: 'union' },
      { key: 'tools', label: 'Tools', type: 'pick', pick: ['part'], multi: true },
      { key: 'targets', label: 'Targets', type: 'pick', pick: ['part'], multi: true, show: (p) => p.bop === 'subtract' },
      { key: 'keep', label: 'Keep tools', type: 'check', def: false, show: (p) => p.bop === 'subtract' },
    ],
    exec(ctx, f, P) {
      const tools = (P.tools || []).map((r) => findPart(ctx, r.id)).filter(Boolean);
      if (!tools.length) throw new Error('Select tool parts');
      if (P.bop === 'union') {
        if (tools.length < 2) throw new Error('Select at least two parts');
        let s = tools[0].solid; for (const t of tools.slice(1)) { s = csg(s, t.solid, 'union'); setPart(ctx, t.id, null); }
        setPart(ctx, tools[0].id, s);
      } else if (P.bop === 'intersect') {
        if (tools.length < 2) throw new Error('Select at least two parts');
        let s = tools[0].solid; for (const t of tools.slice(1)) { s = csg(s, t.solid, 'intersect'); setPart(ctx, t.id, null); }
        setPart(ctx, tools[0].id, s);
      } else {
        const targets = (P.targets || []).map((r) => findPart(ctx, r.id)).filter(Boolean);
        if (!targets.length) throw new Error('Select target parts');
        let tool = tools[0].solid; for (const t of tools.slice(1)) tool = csg(tool, t.solid, 'union');
        for (const t of targets) { const b = splitBodies(csg(t.solid, tool, 'subtract')); setPart(ctx, t.id, b[0] || null); b.slice(1).forEach((x, k) => setPart(ctx, t.id + '~' + k, x)); }
        if (!P.keep) tools.forEach((t) => setPart(ctx, t.id, null));
      }
    },
  },
  split: {
    label: 'Split', icon: 'split',
    fields: [
      { key: 'parts', label: 'Parts to split', type: 'pick', pick: ['part'], multi: true },
      { key: 'plane', label: 'Split plane', type: 'pick', pick: ['plane', 'face'], multi: false },
    ],
    exec(ctx, f, P) {
      const pl = resolvePlane(ctx, (P.plane || [])[0]);
      const parts = (P.parts || []).map((r) => findPart(ctx, r.id)).filter(Boolean);
      if (!parts.length) throw new Error('Select parts to split');
      for (const part of parts) {
        const bb = part.solid.bbox(); const D = bb.min.distanceTo(bb.max) + 10 + bb.getCenter(new V3()).distanceTo(pl.o);
        const sq = { outer: { pts: [[-D, -D], [D, -D], [D, D], [-D, D]], ent: ['a', 'b', 'c', 'd'] }, holes: [] };
        const up = extrudeRegions([sq], pl, 0, D), dn = extrudeRegions([sq], pl, -D, 0);
        const a = csg(part.solid, up, 'intersect'), b = csg(part.solid, dn, 'intersect');
        setPart(ctx, part.id, a.nt ? a : b.nt ? b : null);
        if (a.nt && b.nt) setPart(ctx, part.id + '/' + f.id.slice(-3), b);
      }
    },
  },
  transform: {
    label: 'Transform', icon: 'transform',
    fields: [
      { key: 'parts', label: 'Parts', type: 'pick', pick: ['part'], multi: true },
      { key: 'kind', type: 'seg', options: [['translate', 'Translate'], ['rotate', 'Rotate']], def: 'translate' },
      { key: 'dx', label: 'X', type: 'len', def: '0', show: (p) => p.kind === 'translate' },
      { key: 'dy', label: 'Y', type: 'len', def: '0', show: (p) => p.kind === 'translate' },
      { key: 'dz', label: 'Z', type: 'len', def: '20', show: (p) => p.kind === 'translate' },
      { key: 'axisSel', label: 'Axis', type: 'seg', options: AXIS_SEL, def: 'Z', show: (p) => p.kind === 'rotate' },
      { key: 'axis', label: 'Axis edge or line', type: 'pick', pick: ['edge', 'sketchLine'], multi: false, show: (p) => p.kind === 'rotate' && p.axisSel === 'pick' },
      { key: 'angle', label: 'Angle', type: 'ang', def: '90', show: (p) => p.kind === 'rotate' },
      { key: 'copy', label: 'Copy part', type: 'check', def: false },
    ],
    exec(ctx, f, P) {
      const parts = (P.parts || []).map((r) => findPart(ctx, r.id)).filter(Boolean);
      if (!parts.length) throw new Error('Select parts');
      let m;
      if (P.kind === 'translate') m = new THREE.Matrix4().makeTranslation(P.dx, P.dy, P.dz);
      else { const ax = axisFrom(ctx, P); m = new THREE.Matrix4().makeTranslation(ax.o.x, ax.o.y, ax.o.z).multiply(new THREE.Matrix4().makeRotationAxis(ax.d, P.angle * DEG)).multiply(new THREE.Matrix4().makeTranslation(-ax.o.x, -ax.o.y, -ax.o.z)); }
      for (const p of parts) {
        const s = transformSolid(p.solid, m, P.copy);
        if (P.copy) setPart(ctx, p.id + '+' + f.id.slice(-3), s); else setPart(ctx, p.id, s);
      }
    },
  },
  deletePart: {
    label: 'Delete part', icon: 'trash',
    fields: [{ key: 'parts', label: 'Parts to delete', type: 'pick', pick: ['part'], multi: true }],
    exec(ctx, f, P) { const ids = (P.parts || []).map((r) => r.id); if (!ids.length) throw new Error('Select parts'); ids.forEach((id) => setPart(ctx, id, null)); },
  },
  primitive: {
    label: 'Primitive', icon: 'box',
    fields: [
      { key: 'shape', label: 'Shape', type: 'select', options: [['box', 'Box'], ['cylinder', 'Cylinder'], ['sphere', 'Sphere'], ['cone', 'Cone'], ['torus', 'Torus']], def: 'box' },
      { key: 'w', label: 'Width (X)', type: 'len', def: '40', show: (p) => p.shape === 'box' },
      { key: 'd', label: 'Depth (Y)', type: 'len', def: '30', show: (p) => p.shape === 'box' },
      { key: 'h', label: 'Height', type: 'len', def: '20', show: (p) => ['box', 'cylinder', 'cone'].includes(p.shape) },
      { key: 'r', label: 'Radius', type: 'len', def: '15', show: (p) => ['cylinder', 'sphere', 'cone'].includes(p.shape) },
      { key: 'r2', label: 'Top radius', type: 'len', def: '5', show: (p) => p.shape === 'cone' },
      { key: 'R', label: 'Ring radius', type: 'len', def: '25', show: (p) => p.shape === 'torus' },
      { key: 'rt', label: 'Tube radius', type: 'len', def: '6', show: (p) => p.shape === 'torus' },
      { key: 'x', label: 'Position X', type: 'len', def: '0' },
      { key: 'y', label: 'Position Y', type: 'len', def: '0' },
      { key: 'z', label: 'Position Z', type: 'len', def: '0' },
      F_OP('new'), F_TARGETS,
    ],
    exec(ctx, f, P) {
      const at = new V3(P.x, P.y, P.z); let s;
      const pos = (...v) => { if (v.some((q) => !(q > 0))) throw new Error('Dimensions must be greater than zero'); };
      if (P.shape === 'box') { pos(P.w, P.d, P.h); s = primBox(P.w, P.d, P.h, at); }
      else if (P.shape === 'cylinder') { pos(P.r, P.h); s = primCylinder(P.r, P.h, at); }
      else if (P.shape === 'sphere') { pos(P.r); s = primSphere(P.r, at); }
      else if (P.shape === 'cone') { pos(P.r, P.h); if (P.r2 < 0) throw new Error('Top radius cannot be negative'); s = primCylinder(P.r, P.h, at, Math.max(P.r2, 1e-3)); }
      else { pos(P.R, P.rt); if (P.rt >= P.R) throw new Error('Tube radius must be smaller than ring radius'); s = primTorus(P.R, P.rt, at); }
      ctx.tools[f.id] = { solid: s, op: P.op, targets: P.targets };
      applyOp(ctx, f.id, s, P.op, P.targets);
    },
  },
  variable: {
    label: 'Variable', icon: 'variable',
    fields: [
      { key: 'vname', label: 'Name', type: 'text', def: 'width' },
      { key: 'value', label: 'Value', type: 'expr', def: '25 mm' },
    ],
    exec(ctx, f, P) {
      const n = String(P.vname || '').trim().replace(/^#/, '');
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) throw new Error('Use letters, digits and _ for the name');
      ctx.vars[n] = P.value;
    },
  },
};

function defaultParams(type) {
  const p = {};
  for (const fd of FEATURES[type].fields) {
    if (fd.type === 'pick') p[fd.key] = [];
    else if ('def' in fd) p[fd.key] = fd.def;
  }
  if (type === 'sketch') p.data = newSketchData();
  return p;
}
function evalParams(ctx, f) {
  const def = FEATURES[f.type]; const P = { ...f.params };
  for (const fd of def.fields) {
    if (fd.show && !fd.show(f.params)) continue;
    if (['len', 'ang', 'int', 'num', 'expr'].includes(fd.type)) {
      try { P[fd.key] = evalExpr(f.params[fd.key] ?? fd.def, ctx.vars); }
      catch (e) { throw new Error(`${fd.label || fd.key}: ${e.message}`); }
    }
  }
  return P;
}
function runFeature(ctx, f) {
  f._error = null; f._warn = null;
  if (f.suppressed) return ctx;
  const c2 = cloneCtx(ctx);
  try {
    const P = evalParams(c2, f);
    for (const fd of FEATURES[f.type].fields) if (fd.type === 'pick' && !fd.optional && (!fd.show || fd.show(f.params)) && !(P[fd.key] || []).length) throw new Error(`Select ${fd.label.toLowerCase()}`);
    FEATURES[f.type].exec(c2, f, P);
    c2.featureIds.add(f.id);
    return c2;
  } catch (e) {
    f._error = e.message || String(e);
    if (!/^(Select|A referenced|Referenced)/.test(f._error)) console.warn(f.name, e);
    return ctx;
  }
}
