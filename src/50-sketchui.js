/* =====================================================================
   Sketch editor
   ===================================================================== */
let SK = null; // active sketch session

const SKETCH_TOOLS = [
  { id: 'select', label: 'Select', key: 'Escape', icon: 'cursor' },
  { id: 'line', label: 'Line', key: 'L', icon: 'line' },
  { id: 'rect', label: 'Corner rectangle', key: 'R', icon: 'rect' },
  { id: 'crect', label: 'Center rectangle', key: '', icon: 'crect' },
  { id: 'circle', label: 'Circle', key: 'C', icon: 'circle' },
  { id: 'arc', label: '3-point arc', key: 'A', icon: 'arc' },
  { id: 'polygon', label: 'Polygon', key: 'G', icon: 'polygon' },
  { id: 'slot', label: 'Slot', key: 'O', icon: 'slot' },
  { id: 'spline', label: 'Spline', key: 'S', icon: 'spline' },
  { id: 'point', label: 'Point', key: 'P', icon: 'point' },
  { id: 'dim', label: 'Dimension', key: 'D', icon: 'dim' },
];
const SKETCH_CONS = [
  { id: 'construction', label: 'Construction', key: 'Q', icon: 'construction' },
  { id: 'coincident', label: 'Coincident', key: 'I', icon: 'coincident' },
  { id: 'horizontal', label: 'Horizontal', key: 'H', icon: 'horizontal' },
  { id: 'vertical', label: 'Vertical', key: 'V', icon: 'vertical' },
  { id: 'parallel', label: 'Parallel', key: '', icon: 'parallel' },
  { id: 'perpendicular', label: 'Perpendicular', key: '', icon: 'perpendicular' },
  { id: 'equal', label: 'Equal', key: 'E', icon: 'equal' },
  { id: 'tangent', label: 'Tangent', key: 'T', icon: 'tangent' },
  { id: 'midpoint', label: 'Midpoint', key: 'M', icon: 'midpoint' },
  { id: 'concentric', label: 'Concentric', key: '', icon: 'concentric' },
  { id: 'fix', label: 'Fix', key: 'F', icon: 'fix' },
  { id: 'delete', label: 'Delete selected', key: 'Delete', icon: 'trash' },
];

function startSketchSession(feature, plane, ctxBefore) {
  const data = deepClone(feature.params.data || newSketchData());
  SK = { feature, data, plane, ctx: ctxBefore, tool: 'select', sel: new Set(), hover: null, draw: null, undo: [], redo: [], polySides: 6, gridSnap: true, info: null };
  View.groups.active.visible = true;
  solveActive();
  viewNormalTo(plane);
  renderSketch();
  updateSketchToolbar();
}
function endSketchSession() {
  SK = null; clearGroup(View.groups.active); setOverlays('sk', []); requestRender();
  const inp = $('#dimInput'); if (inp) inp.remove();
}
const skPush = () => { SK.undo.push(JSON.stringify(SK.data)); if (SK.undo.length > 100) SK.undo.shift(); SK.redo = []; };
function skUndo() { if (!SK.undo.length) return; SK.redo.push(JSON.stringify(SK.data)); SK.data = JSON.parse(SK.undo.pop()); SK.sel.clear(); solveActive(); renderSketch(); }
function skRedo() { if (!SK.redo.length) return; SK.undo.push(JSON.stringify(SK.data)); SK.data = JSON.parse(SK.redo.pop()); SK.sel.clear(); solveActive(); renderSketch(); }
function solveActive(drag) {
  SK.info = solveSketch(SK.data, SK.ctx.vars, drag);
  for (const c of SK.data.cons) if (CONS_INFO[c.type]?.dim) { try { c._last = evalExpr(c.value, SK.ctx.vars); } catch { /* keep */ } }
  updateSketchStatus();
}

/* ---------- coordinates ---------- */
function skFromScreen(x, y) {
  const rc = rayFrom(x, y); const pl = SK.plane;
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(pl.n, pl.o);
  const hit = rc.ray.intersectPlane(plane, new V3());
  if (!hit) return null;
  const q = toPlane(pl, hit); return [q[0], q[1]];
}
const skW = (u, v) => toWorld(SK.plane, u, v);
const skScr = (u, v) => toScreen(skW(u, v));
function pxPerUnit() { const a = skScr(0, 0), b = skScr(1, 0); return Math.hypot(b.x - a.x, b.y - a.y) || 1; }
function gridStep() {
  const ppu = pxPerUnit(); const target = 28 / ppu; const p = Math.pow(10, Math.floor(Math.log10(target)));
  for (const m of [1, 2, 5, 10]) if (p * m >= target) return p * m;
  return p * 10;
}

/* ---------- snapping ---------- */
function snap(x, y, opts = {}) {
  const { P, E } = skIndex(SK.data);
  const exclude = opts.exclude || new Set();
  let best = null, bd = 9;
  for (const p of P.values()) {
    if (exclude.has(p.id)) continue;
    const s = skScr(p.x, p.y); const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = { u: p.x, v: p.y, kind: 'point', id: p.id }; }
  }
  if (best) return best;
  // midpoints
  bd = 8;
  for (const e of SK.data.ents) {
    if (e.type !== 'line') continue;
    const a = P.get(e.p1), b = P.get(e.p2); if (exclude.has(e.p1) || exclude.has(e.p2)) continue;
    const m = [(a.x + b.x) / 2, (a.y + b.y) / 2]; const s = skScr(m[0], m[1]); const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = { u: m[0], v: m[1], kind: 'mid', ent: e.id }; }
  }
  if (best) return best;
  const q = skFromScreen(x, y); if (!q) return null;
  // on entity
  bd = 7;
  for (const e of SK.data.ents) {
    if (e.type === 'point' || e.type === 'spline') continue;
    if (entPointIds(e).some((id) => exclude.has(id))) continue;
    let pt = null;
    if (e.type === 'line') { const a = P.get(e.p1), b = P.get(e.p2); const dx = b.x - a.x, dy = b.y - a.y; const l = dx * dx + dy * dy; if (!l) continue; const t = clamp(((q[0] - a.x) * dx + (q[1] - a.y) * dy) / l, 0, 1); pt = [a.x + dx * t, a.y + dy * t]; }
    else { const c = P.get(e.c); const r = e.type === 'circle' ? e.r : Math.hypot(P.get(e.p1).x - c.x, P.get(e.p1).y - c.y); const ang = Math.atan2(q[1] - c.y, q[0] - c.x); pt = [c.x + r * Math.cos(ang), c.y + r * Math.sin(ang)]; if (e.type === 'arc') { const [a0, a1] = arcAngles(P, e); let t = ang; while (t < a0) t += 2 * Math.PI; if (t > a1) continue; } }
    const s = skScr(pt[0], pt[1]); const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = { u: pt[0], v: pt[1], kind: 'on', ent: e.id }; }
  }
  if (best) return best;
  if (SK.gridSnap && !opts.noGrid) { const g = gridStep() / 2; return { u: Math.round(q[0] / g) * g, v: Math.round(q[1] / g) * g, kind: 'free' }; }
  return { u: q[0], v: q[1], kind: 'free' };
}
/* make or reuse a point for a snap result, adding inferred constraints */
function pointFor(sn, newCons) {
  if (sn.kind === 'point') return sn.id;
  const id = uid('p'); SK.data.pts.push({ id, x: sn.u, y: sn.v });
  if (sn.kind === 'mid') newCons.push({ id: uid('c'), type: 'midpoint', a: id, e1: sn.ent });
  if (sn.kind === 'on') newCons.push({ id: uid('c'), type: 'onEntity', a: id, e1: sn.ent });
  return id;
}
function inferHV(p1, p2, cons, lineId) {
  const { P } = skIndex(SK.data); const a = P.get(p1), b = P.get(p2);
  const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) / DEG;
  if (ang < 2.5 || ang > 177.5) cons.push({ id: uid('c'), type: 'horizontal', e1: lineId });
  else if (Math.abs(ang - 90) < 2.5) cons.push({ id: uid('c'), type: 'vertical', e1: lineId });
}

/* ---------- hit-testing existing sketch items ---------- */
function skHit(x, y) {
  const { P } = skIndex(SK.data);
  // dimension / constraint labels are DOM; handled separately
  let best = null, bd = 8;
  for (const p of SK.data.pts) { const s = skScr(p.x, p.y); const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = 'p:' + p.id; } }
  if (best) return best;
  bd = 7;
  for (const e of SK.data.ents) {
    if (e.type === 'point') { const p = P.get(e.p); const s = skScr(p.x, p.y); const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = 'e:' + e.id; } continue; }
    const pl = entPolyline(P, e); let sp = skScr(...pl[0]);
    for (let i = 1; i < pl.length; i++) { const sq = skScr(...pl[i]); const r = distToSeg(x, y, sp, sq); if (r.d < bd) { bd = r.d; best = 'e:' + e.id; } sp = sq; }
  }
  return best;
}

/* ---------- pointer handling ---------- */
function skPointer(type, e) {
  if (!SK) return false;
  const r = View.renderer.domElement.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
  const t = SK.tool;
  if (type === 'down' && e.button !== 0) return false;
  if (t === 'select') return skSelectPointer(type, e, x, y);
  if (t === 'dim') return skDimPointer(type, e, x, y);
  const sn = snap(x, y, { exclude: SK.draw?.exclude });
  if (!sn) return true;
  SK.cursor = sn;
  if (type === 'move') { renderSketch(); return true; }
  if (type === 'down') { skToolClick(sn, e); return true; }
  if (type === 'dbl') { finishDraw(); return true; }
  return true;
}
function skSelectPointer(type, e, x, y) {
  if (type === 'move') {
    if (SK.drag) {
      const q = skFromScreen(x, y); if (!q) return true;
      const d = SK.drag;
      if (!d.moved) { skPush(); d.moved = true; }
      if (d.kind === 'pts') solveActive(d.ids.map((id, i) => ({ id, x: q[0] + d.off[i][0], y: q[1] + d.off[i][1] })));
      else if (d.kind === 'radius') { const { P } = skIndex(SK.data); const c = P.get(d.c); solveActive([{ id: d.ent, k: 'r', r: Math.hypot(q[0] - c.x, q[1] - c.y) }]); }
      renderSketch(); return true;
    }
    const h = skHit(x, y); if (h !== SK.hover) { SK.hover = h; renderSketch(); }
    return true;
  }
  if (type === 'down') {
    const h = skHit(x, y);
    if (!h) { if (!e.shiftKey && !e.ctrlKey && !e.metaKey) SK.sel.clear(); renderSketch(); return true; }
    if (e.shiftKey || e.ctrlKey || e.metaKey) { SK.sel.has(h) ? SK.sel.delete(h) : SK.sel.add(h); }
    else if (!SK.sel.has(h)) { SK.sel.clear(); SK.sel.add(h); }
    const q = skFromScreen(x, y); const { P, E } = skIndex(SK.data);
    if (h.startsWith('p:')) { const p = P.get(h.slice(2)); if (p && !p.origin) SK.drag = { kind: 'pts', ids: [p.id], off: [[p.x - q[0], p.y - q[1]]] }; }
    else {
      const ent = E.get(h.slice(2));
      if (ent.type === 'circle') SK.drag = { kind: 'radius', ent: ent.id, c: ent.c };
      else { const ids = entPointIds(ent).filter((id) => id !== ORIGIN_ID); SK.drag = { kind: 'pts', ids, off: ids.map((id) => [P.get(id).x - q[0], P.get(id).y - q[1]]) }; }
    }
    renderSketch(); return true;
  }
  if (type === 'up') { SK.drag = null; renderSketch(); return true; }
  return true;
}
function skToolClick(sn, e) {
  const t = SK.tool; const D = SK.draw;
  const cons = [];
  if (t === 'point') { skPush(); const id = pointFor(sn, cons); SK.data.ents.push({ id: uid('e'), type: 'point', p: id }); SK.data.cons.push(...cons); afterEdit(); return; }
  if (t === 'line') {
    if (!D) { skPush(); const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { start: p, first: p, exclude: new Set([p]) }; renderSketch(); return; }
    if (sn.kind === 'point' && sn.id === D.start) return;
    const p = pointFor(sn, cons); const lid = uid('e');
    SK.data.ents.push({ id: lid, type: 'line', p1: D.start, p2: p }); inferHV(D.start, p, cons, lid);
    SK.data.cons.push(...cons);
    if (sn.kind === 'point' && (sn.id === D.first || e.detail > 1)) { SK.draw = null; afterEdit(); return; }
    SK.draw = { start: p, first: D.first, exclude: new Set([p]) };
    afterEdit(true); return;
  }
  if (t === 'rect' || t === 'crect') {
    if (!D) { skPush(); SK.draw = { a: [sn.u, sn.v], snapA: sn }; renderSketch(); return; }
    let [x0, y0] = D.a, x1 = sn.u, y1 = sn.v;
    if (t === 'crect') { const dx = x1 - x0, dy = y1 - y0; [x0, y0, x1, y1] = [x0 - dx, y0 - dy, x0 + dx, y0 + dy]; }
    if (Math.abs(x1 - x0) < 1e-6 || Math.abs(y1 - y0) < 1e-6) return;
    const ids = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const id = uid('p'); SK.data.pts.push({ id, x, y }); return id; });
    if (t === 'rect' && D.snapA.kind === 'point') { // reuse snapped corner
      const old = ids[0]; SK.data.pts = SK.data.pts.filter((p) => p.id !== old); ids[0] = D.snapA.id;
    } else if (t === 'rect') pointFixups(ids[0], D.snapA, cons);
    if (t === 'rect') { if (sn.kind === 'point') { SK.data.pts = SK.data.pts.filter((p) => p.id !== ids[2]); ids[2] = sn.id; } else pointFixups(ids[2], sn, cons); }
    const ls = ids.map((id, i) => { const lid = uid('e'); SK.data.ents.push({ id: lid, type: 'line', p1: id, p2: ids[(i + 1) % 4] }); return lid; });
    cons.push({ id: uid('c'), type: 'horizontal', e1: ls[0] }, { id: uid('c'), type: 'vertical', e1: ls[1] }, { id: uid('c'), type: 'horizontal', e1: ls[2] }, { id: uid('c'), type: 'vertical', e1: ls[3] });
    if (t === 'crect') {
      const cid = D.snapA.kind === 'point' ? D.snapA.id : (() => { const id = uid('p'); SK.data.pts.push({ id, x: D.a[0], y: D.a[1] }); pointFixups(id, D.snapA, cons); return id; })();
      const diag = uid('e'); SK.data.ents.push({ id: diag, type: 'line', p1: ids[0], p2: ids[2], construction: true });
      const diag2 = uid('e'); SK.data.ents.push({ id: diag2, type: 'line', p1: ids[1], p2: ids[3], construction: true });
      cons.push({ id: uid('c'), type: 'midpoint', a: cid, e1: diag }, { id: uid('c'), type: 'midpoint', a: cid, e1: diag2 });
    }
    SK.data.cons.push(...cons); SK.draw = null; afterEdit(); return;
  }
  if (t === 'circle') {
    if (!D) { skPush(); const c = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { c, exclude: new Set([c]) }; renderSketch(); return; }
    const { P } = skIndex(SK.data); const c = P.get(D.c); const r = Math.hypot(sn.u - c.x, sn.v - c.y); if (r < 1e-6) return;
    const id = uid('e'); SK.data.ents.push({ id, type: 'circle', c: D.c, r });
    if (sn.kind === 'point' && sn.id !== D.c) SK.data.cons.push({ id: uid('c'), type: 'onEntity', a: sn.id, e1: id });
    SK.draw = null; afterEdit(); return;
  }
  if (t === 'arc') {
    if (!D) { skPush(); const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { a: p, exclude: new Set([p]) }; renderSketch(); return; }
    if (!D.b) { const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { ...D, b: p, exclude: new Set([D.a, p]) }; renderSketch(); return; }
    const { P } = skIndex(SK.data); const A = P.get(D.a), B = P.get(D.b); const cc = circle3([A.x, A.y], [B.x, B.y], [sn.u, sn.v]);
    if (!cc) return;
    const cid = uid('p'); SK.data.pts.push({ id: cid, x: cc[0], y: cc[1] });
    const cross = (B.x - A.x) * (sn.v - A.y) - (B.y - A.y) * (sn.u - A.x);
    const [p1, p2] = cross < 0 ? [D.a, D.b] : [D.b, D.a];
    SK.data.ents.push({ id: uid('e'), type: 'arc', c: cid, p1, p2 });
    SK.draw = null; afterEdit(); return;
  }
  if (t === 'polygon') {
    if (!D) { skPush(); const c = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { c, exclude: new Set([c]) }; renderSketch(); return; }
    const { P } = skIndex(SK.data); const c = P.get(D.c); const r = Math.hypot(sn.u - c.x, sn.v - c.y); if (r < 1e-6) return;
    const a0 = Math.atan2(sn.v - c.y, sn.u - c.x); const n = SK.polySides;
    const circ = uid('e'); SK.data.ents.push({ id: circ, type: 'circle', c: D.c, r, construction: true });
    const ids = []; for (let i = 0; i < n; i++) { const id = uid('p'); const a = a0 + (i * 2 * Math.PI) / n; SK.data.pts.push({ id, x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }); ids.push(id); cons.push({ id: uid('c'), type: 'onEntity', a: id, e1: circ }); }
    const ls = ids.map((id, i) => { const l = uid('e'); SK.data.ents.push({ id: l, type: 'line', p1: id, p2: ids[(i + 1) % n] }); return l; });
    for (let i = 1; i < n; i++) cons.push({ id: uid('c'), type: 'equal', e1: ls[0], e2: ls[i] });
    SK.data.cons.push(...cons); SK.draw = null; afterEdit(); return;
  }
  if (t === 'slot') {
    if (!D) { skPush(); const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { c1: p, exclude: new Set([p]) }; renderSketch(); return; }
    if (!D.c2) { const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { ...D, c2: p, exclude: new Set([D.c1, p]) }; renderSketch(); return; }
    const { P } = skIndex(SK.data); const c1 = P.get(D.c1), c2 = P.get(D.c2);
    const dx = c2.x - c1.x, dy = c2.y - c1.y, L = Math.hypot(dx, dy); if (L < 1e-6) return;
    const d = [dx / L, dy / L], nr = [-d[1], d[0]];
    const r = Math.abs((sn.u - c1.x) * nr[0] + (sn.v - c1.y) * nr[1]); if (r < 1e-6) return;
    const mk = (x, y) => { const id = uid('p'); SK.data.pts.push({ id, x, y }); return id; };
    const a1 = mk(c1.x + r * nr[0], c1.y + r * nr[1]), a2 = mk(c2.x + r * nr[0], c2.y + r * nr[1]), b2 = mk(c2.x - r * nr[0], c2.y - r * nr[1]), b1 = mk(c1.x - r * nr[0], c1.y - r * nr[1]);
    const L1 = uid('e'), L2 = uid('e'), A1 = uid('e'), A2 = uid('e'), CL = uid('e');
    SK.data.ents.push({ id: L1, type: 'line', p1: a1, p2: a2 }, { id: A2, type: 'arc', c: D.c2, p1: b2, p2: a2 }, { id: L2, type: 'line', p1: b2, p2: b1 }, { id: A1, type: 'arc', c: D.c1, p1: a1, p2: b1 }, { id: CL, type: 'line', p1: D.c1, p2: D.c2, construction: true });
    cons.push({ id: uid('c'), type: 'tangent', e1: L1, e2: A1 }, { id: uid('c'), type: 'tangent', e1: L1, e2: A2 }, { id: uid('c'), type: 'tangent', e1: L2, e2: A1 }, { id: uid('c'), type: 'tangent', e1: L2, e2: A2 }, { id: uid('c'), type: 'equal', e1: A1, e2: A2 }, { id: uid('c'), type: 'parallel', e1: L1, e2: CL });
    SK.data.cons.push(...cons); SK.draw = null; afterEdit(); return;
  }
  if (t === 'spline') {
    if (!D) { skPush(); const p = pointFor(sn, cons); SK.data.cons.push(...cons); SK.draw = { pts: [p], exclude: new Set([p]) }; renderSketch(); return; }
    if (sn.kind === 'point' && sn.id === D.pts[D.pts.length - 1]) { finishDraw(); return; }
    const p = pointFor(sn, cons); SK.data.cons.push(...cons); D.pts.push(p); D.exclude = new Set([p]);
    if (e.detail > 1) finishDraw(); else renderSketch();
    return;
  }
}
function pointFixups(id, sn, cons) {
  if (sn.kind === 'mid') cons.push({ id: uid('c'), type: 'midpoint', a: id, e1: sn.ent });
  if (sn.kind === 'on') cons.push({ id: uid('c'), type: 'onEntity', a: id, e1: sn.ent });
}
function circle3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-9) return null;
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  return [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
}
function finishDraw() {
  const D = SK.draw;
  if (SK.tool === 'spline' && D && D.pts.length >= 2) { SK.data.ents.push({ id: uid('e'), type: 'spline', pts: D.pts.slice() }); }
  else if (SK.tool === 'spline' && D) { // single point: remove orphan
    removeOrphans();
  }
  SK.draw = null; afterEdit();
}
function removeOrphans() {
  const used = new Set([ORIGIN_ID]);
  for (const e of SK.data.ents) entPointIds(e).forEach((id) => used.add(id));
  SK.data.pts = SK.data.pts.filter((p) => used.has(p.id));
  const ents = new Set(SK.data.ents.map((e) => e.id)), pts = new Set(SK.data.pts.map((p) => p.id)); pts.add(ORIGIN_ID);
  SK.data.cons = SK.data.cons.filter((c) => (!c.e1 || ents.has(c.e1)) && (!c.e2 || ents.has(c.e2)) && (!c.a || pts.has(c.a)) && (!c.b || pts.has(c.b)));
}
function afterEdit(keepDraw) { if (!keepDraw && SK.tool !== 'line') SK.draw = null; removeOrphansSoft(); solveActive(); renderSketch(); uiSketchChanged(); }
function removeOrphansSoft() {
  // keep points that are in an active drawing chain
  const keep = new Set(); const D = SK.draw; if (D) for (const k of ['start', 'first', 'c', 'a', 'b', 'c1', 'c2']) if (D[k]) keep.add(D[k]);
  if (D?.pts) D.pts.forEach((p) => keep.add(p));
  const used = new Set([ORIGIN_ID, ...keep]);
  for (const e of SK.data.ents) entPointIds(e).forEach((id) => used.add(id));
  SK.data.pts = SK.data.pts.filter((p) => used.has(p.id));
}
function setSketchTool(t) {
  if (!SK) return;
  if (SK.draw) { SK.draw = null; removeOrphansSoft(); }
  SK.tool = t; SK.dimPick = []; SK.cursor = null;
  updateSketchToolbar(); renderSketch();
  const hints = {
    select: 'Click to select · drag points or curves · Shift-click adds to selection',
    line: 'Click to start a line · click again to chain · double-click or Esc to stop',
    rect: 'Click two opposite corners', crect: 'Click the center, then a corner', circle: 'Click the center, then a point on the circle',
    arc: 'Click the start, the end, then a point the arc passes through', polygon: `Click the center, then a vertex (${SK.polySides} sides)`,
    slot: 'Click both centers, then set the width', spline: 'Click through points · double-click to finish', point: 'Click to place a point',
    dim: 'Click a line, circle, point pair or two lines, then click to place the dimension',
  };
  setHint(hints[t] || '');
}

/* ---------- dimensions ---------- */
function skDimPointer(type, e, x, y) {
  if (type === 'move') { SK.cursorScr = [x, y]; const h = skHit(x, y); if (h !== SK.hover) SK.hover = h; renderSketch(); return true; }
  if (type !== 'down') return true;
  const h = skHit(x, y);
  SK.dimPick = SK.dimPick || [];
  if (h && SK.dimPick.length < 2 && !SK.dimPick.includes(h)) { SK.dimPick.push(h); renderSketch(); if (SK.dimPick.length === 2 && !canDimPair()) SK.dimPick = [h]; return true; }
  if (!SK.dimPick.length) return true;
  const q = skFromScreen(x, y); if (!q) return true;
  createDimension(SK.dimPick, q);
  SK.dimPick = []; return true;
}
function canDimPair() { return true; }
function createDimension(picks, q) {
  const { P, E } = skIndex(SK.data);
  const it = picks.map((h) => (h.startsWith('p:') ? { k: 'p', o: P.get(h.slice(2)) } : { k: 'e', o: E.get(h.slice(2)) }));
  let c = null;
  const ptOf = (i) => (i.k === 'p' ? i.o : i.o.type === 'point' ? P.get(i.o.p) : null);
  if (it.length === 1) {
    const o = it[0].o;
    if (it[0].k === 'e' && o.type === 'line') { const a = P.get(o.p1), b = P.get(o.p2); c = { type: 'length', e1: o.id, cur: Math.hypot(b.x - a.x, b.y - a.y) }; }
    else if (it[0].k === 'e' && o.type === 'circle') c = { type: 'diameter', e1: o.id, cur: o.r * 2 };
    else if (it[0].k === 'e' && o.type === 'arc') { const [, , r] = arcAngles(P, o); c = { type: 'radius', e1: o.id, cur: r }; }
    else if (ptOf(it[0])) { const p = ptOf(it[0]); c = { type: 'distance', a: ORIGIN_ID, b: p.id, cur: Math.hypot(p.x, p.y) }; }
  } else {
    const [A, B] = it; const pa = ptOf(A), pb = ptOf(B);
    if (pa && pb) {
      const dx = Math.abs(pb.x - pa.x), dy = Math.abs(pb.y - pa.y);
      // horizontal / vertical / aligned depending on where the label is placed
      const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
      const outX = q[1] > Math.max(pa.y, pb.y) || q[1] < Math.min(pa.y, pb.y), outY = q[0] > Math.max(pa.x, pb.x) || q[0] < Math.min(pa.x, pb.x);
      if (outX && !outY && dx > 1e-6) c = { type: 'hdistance', a: pa.id, b: pb.id, cur: dx };
      else if (outY && !outX && dy > 1e-6) c = { type: 'vdistance', a: pa.id, b: pb.id, cur: dy };
      else c = { type: 'distance', a: pa.id, b: pb.id, cur: Math.hypot(dx, dy) };
      void mx; void my;
    } else if ((pa && B.o.type === 'line') || (pb && A.o.type === 'line')) {
      const p = pa || pb, l = pa ? B.o : A.o; const a = P.get(l.p1), b = P.get(l.p2);
      const L = Math.hypot(b.x - a.x, b.y - a.y); const d = Math.abs(((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / L);
      c = { type: 'pldist', a: p.id, e1: l.id, cur: d };
    } else if (A.o.type === 'line' && B.o.type === 'line') {
      const u = [P.get(A.o.p2).x - P.get(A.o.p1).x, P.get(A.o.p2).y - P.get(A.o.p1).y], w = [P.get(B.o.p2).x - P.get(B.o.p1).x, P.get(B.o.p2).y - P.get(B.o.p1).y];
      const lu = Math.hypot(...u), lw = Math.hypot(...w); const cr = (u[0] * w[1] - u[1] * w[0]) / (lu * lw), dt = (u[0] * w[0] + u[1] * w[1]) / (lu * lw);
      if (Math.abs(cr) < 1e-4) { const p = P.get(B.o.p1); const a = P.get(A.o.p1); c = { type: 'pldist', a: p.id, e1: A.o.id, cur: Math.abs(((p.x - a.x) * u[1] - (p.y - a.y) * u[0]) / lu) }; }
      else {
        // choose the angle whose sector contains the label position
        const X = lineIntersect(P, A.o, B.o); const s1 = X && ((q[0] - X[0]) * u[0] + (q[1] - X[1]) * u[1]) < 0 ? -1 : 1; const s2 = X && ((q[0] - X[0]) * w[0] + (q[1] - X[1]) * w[1]) < 0 ? -1 : 1;
        const ang = Math.atan2(Math.abs(cr), dt * s1 * s2) / DEG;
        c = { type: 'angle', e1: A.o.id, e2: B.o.id, s1, s2, cur: ang };
      }
    } else if ((A.o.type === 'circle' || A.o.type === 'arc') && (B.o.type === 'circle' || B.o.type === 'arc')) {
      const ca = P.get(A.o.c), cb = P.get(B.o.c); c = { type: 'distance', a: ca.id, b: cb.id, cur: Math.hypot(cb.x - ca.x, cb.y - ca.y) };
    } else if (pa || pb) {
      const p = pa || pb, ce = pa ? B.o : A.o; if (ce.c) { const cc = P.get(ce.c); c = { type: 'distance', a: p.id, b: cc.id, cur: Math.hypot(cc.x - p.x, cc.y - p.y) }; }
    }
  }
  if (!c) { toast('Those items cannot be dimensioned together', 'error'); return; }
  skPush();
  const anchor = dimAnchor(c, P, E);
  const cons = { id: uid('d'), ...c, value: fmt(c.cur, 3), lp: [q[0] - anchor[0], q[1] - anchor[1]] }; delete cons.cur;
  SK.data.cons.push(cons);
  solveActive(); renderSketch(); uiSketchChanged();
  setTimeout(() => editDimension(cons.id), 0);
}
function lineIntersect(P, l1, l2) {
  const a = P.get(l1.p1), b = P.get(l1.p2), c = P.get(l2.p1), d = P.get(l2.p2);
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x); if (Math.abs(den) < 1e-12) return null;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
  return [a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)];
}
function dimAnchor(c, P, E) {
  const e1 = E.get(c.e1), e2 = E.get(c.e2);
  if (c.type === 'length') { const a = P.get(e1.p1), b = P.get(e1.p2); return [(a.x + b.x) / 2, (a.y + b.y) / 2]; }
  if (c.type === 'diameter' || c.type === 'radius') { const cc = P.get(e1.c); return [cc.x, cc.y]; }
  if (['distance', 'hdistance', 'vdistance'].includes(c.type)) { const a = P.get(c.a), b = P.get(c.b); return [(a.x + b.x) / 2, (a.y + b.y) / 2]; }
  if (c.type === 'pldist') { const p = P.get(c.a); return [p.x, p.y]; }
  if (c.type === 'angle') { const X = lineIntersect(P, e1, e2); if (X) return X; const a = P.get(e1.p1); return [a.x, a.y]; }
  return [0, 0];
}
function dimText(c) {
  const v = c._last ?? 0; const isExpr = /[#A-Za-z]/.test(String(c.value).replace(/\b(mm|cm|in|deg)\b/g, ''));
  const s = c.type === 'diameter' ? 'Ø' + fmt(v, 2) : c.type === 'radius' ? 'R' + fmt(v, 2) : c.type === 'angle' ? fmt(v, 2) + '°' : fmt(v, 2);
  return isExpr ? `${s}  (${c.value})` : s;
}
function editDimension(cid) {
  const c = SK?.data.cons.find((q) => q.id === cid); if (!c) return;
  const ov = View.overlays.find((o) => o.cid === cid); const r = ov ? ov.el.getBoundingClientRect() : null;
  const host = $('#viewport'); const hr = host.getBoundingClientRect();
  $('#dimInput')?.remove();
  const inp = el('input', { id: 'dimInput', class: 'dim-input', type: 'text', value: String(c.value), 'aria-label': 'Dimension value', spellcheck: 'false' });
  inp.style.left = (r ? r.left - hr.left - 10 : View.w / 2) + 'px'; inp.style.top = (r ? r.top - hr.top - 6 : View.h / 2) + 'px';
  host.append(inp); inp.focus(); inp.select();
  let done = false;
  const commit = () => {
    if (done) return; done = true;
    const v = inp.value.trim(); inp.remove();
    try { const n = evalExpr(v, SK.ctx.vars); if ((c.type !== 'angle' && n <= 0) || !isFinite(n)) throw new Error('Value must be positive'); skPush(); c.value = v; solveActive(); if (!SK.info.ok) toast('The sketch could not satisfy that value. Check for conflicting constraints.', 'error'); renderSketch(); uiSketchChanged(); }
    catch (e) { toast(e.message, 'error'); }
  };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') { done = true; inp.remove(); } });
  inp.addEventListener('blur', () => { if (inp.isConnected) commit(); });
}

/* ---------- constraints from toolbar ---------- */
function applySketchCommand(cmd) {
  if (!SK) return;
  const { P, E } = skIndex(SK.data);
  const sel = [...SK.sel]; const pts = sel.filter((s) => s.startsWith('p:')).map((s) => s.slice(2)); const ents = sel.filter((s) => s.startsWith('e:')).map((s) => E.get(s.slice(2))).filter(Boolean);
  const cs = sel.filter((s) => s.startsWith('c:')).map((s) => s.slice(2));
  const lines = ents.filter((e) => e.type === 'line'), curves = ents.filter((e) => e.type === 'circle' || e.type === 'arc');
  const add = (...c) => { skPush(); SK.data.cons.push(...c.map((q) => ({ id: uid('c'), ...q }))); finish(); };
  const finish = () => { SK.sel.clear(); solveActive(); if (!SK.info.ok) toast('Constraint conflicts with the sketch and could not be solved', 'error'); renderSketch(); uiSketchChanged(); };
  const need = (m) => { toast(m, 'error'); };
  switch (cmd) {
    case 'construction': if (!ents.length) return need('Select sketch curves first'); skPush(); ents.forEach((e) => (e.construction = !e.construction)); finish(); return;
    case 'delete': {
      if (!sel.length) return; skPush();
      const dp = new Set(pts), de = new Set(ents.map((e) => e.id)), dc = new Set(cs);
      SK.data.ents = SK.data.ents.filter((e) => !de.has(e.id) && !entPointIds(e).some((id) => dp.has(id)));
      SK.data.cons = SK.data.cons.filter((c) => !dc.has(c.id));
      removeOrphans(); finish(); return;
    }
    case 'horizontal': case 'vertical':
      if (lines.length) return add(...lines.map((l) => ({ type: cmd, e1: l.id })));
      if (pts.length === 2) return add({ type: cmd, a: pts[0], b: pts[1] });
      return need('Select lines, or two points');
    case 'parallel': case 'perpendicular':
      if (lines.length === 2) return add({ type: cmd, e1: lines[0].id, e2: lines[1].id });
      return need('Select two lines');
    case 'equal':
      if (lines.length >= 2) return add(...lines.slice(1).map((l) => ({ type: 'equal', e1: lines[0].id, e2: l.id })));
      if (curves.length >= 2) return add(...curves.slice(1).map((l) => ({ type: 'equal', e1: curves[0].id, e2: l.id })));
      return need('Select two lines or two circles/arcs');
    case 'tangent':
      if (lines.length === 1 && curves.length === 1) return add({ type: 'tangent', e1: lines[0].id, e2: curves[0].id });
      if (curves.length === 2) { const c1 = P.get(curves[0].c), c2 = P.get(curves[1].c); const r1 = curves[0].r ?? arcAngles(P, curves[0])[2], r2 = curves[1].r ?? arcAngles(P, curves[1])[2]; const d = Math.hypot(c1.x - c2.x, c1.y - c2.y); return add({ type: 'tangent', e1: curves[0].id, e2: curves[1].id, inner: Math.abs(d - Math.abs(r1 - r2)) < Math.abs(d - r1 - r2) }); }
      return need('Select a line and a circle/arc, or two circles/arcs');
    case 'midpoint':
      if (pts.length === 1 && lines.length === 1) return add({ type: 'midpoint', a: pts[0], e1: lines[0].id });
      return need('Select a point and a line');
    case 'concentric':
      if (curves.length === 2) { skPush(); mergePoints(curves[0].c, curves[1].c); finish(); return; }
      return need('Select two circles or arcs');
    case 'fix':
      if (pts.length) return add(...pts.filter((id) => id !== ORIGIN_ID).map((id) => ({ type: 'fix', a: id, x: P.get(id).x, y: P.get(id).y })));
      if (ents.length) { const ids = [...new Set(ents.flatMap(entPointIds))].filter((id) => id !== ORIGIN_ID); return add(...ids.map((id) => ({ type: 'fix', a: id, x: P.get(id).x, y: P.get(id).y }))); }
      return need('Select points or curves');
    case 'coincident':
      if (pts.length === 2) { skPush(); mergePoints(pts[0], pts[1]); finish(); return; }
      if (pts.length === 1 && ents.length === 1) {
        const e = ents[0];
        if (e.type === 'point') { skPush(); mergePoints(e.p, pts[0]); finish(); return; }
        return add({ type: 'onEntity', a: pts[0], e1: e.id });
      }
      return need('Select two points, or a point and a curve');
  }
}
function mergePoints(keep, drop) {
  if (keep === drop) return;
  if (drop === ORIGIN_ID) [keep, drop] = [drop, keep];
  for (const e of SK.data.ents) for (const k of ['p1', 'p2', 'c', 'p']) if (e[k] === drop) e[k] = keep;
  for (const e of SK.data.ents) if (e.pts) e.pts = e.pts.map((p) => (p === drop ? keep : p));
  for (const c of SK.data.cons) for (const k of ['a', 'b']) if (c[k] === drop) c[k] = keep;
  SK.data.pts = SK.data.pts.filter((p) => p.id !== drop);
  SK.data.ents = SK.data.ents.filter((e) => !(e.type === 'line' && e.p1 === e.p2));
}

/* ---------- rendering ---------- */
function renderSketch() {
  if (!SK) return;
  const g = View.groups.active; clearGroup(g);
  const { P, E } = skIndex(SK.data); const C = View.colors; const info = SK.info || { detPts: new Set(), detR: new Set() };
  const pl = SK.plane;
  // grid
  const step = gridStep(); const box = sceneBox(); const R = Math.max(box.getSize(new V3()).length(), 200) * 1.2;
  const c0 = toPlane(pl, View.controls.target); const N = Math.min(120, Math.ceil(R / step));
  const gx = Math.round(c0[0] / step) * step, gy = Math.round(c0[1] / step) * step; const gl = [];
  for (let i = -N; i <= N; i++) {
    const a = skW(gx + i * step, gy - N * step), b = skW(gx + i * step, gy + N * step); gl.push(...arr3(a), ...arr3(b));
    const c = skW(gx - N * step, gy + i * step), d = skW(gx + N * step, gy + i * step); gl.push(...arr3(c), ...arr3(d));
  }
  g.add(new LineSegments2(segGeom(gl), lineMat(C.grid, 1, { transparent: true, opacity: 0.5 })));
  const isDefined = (e) => entPointIds(e).every((id) => id === ORIGIN_ID || info.detPts.has(id)) && (e.type !== 'circle' || info.detR.has(e.id));
  const buckets = { def: [], under: [], cons: [], sel: [], hov: [] };
  for (const e of SK.data.ents) {
    if (e.type === 'point') continue;
    const key = SK.sel.has('e:' + e.id) ? 'sel' : SK.hover === 'e:' + e.id || (SK.dimPick || []).includes('e:' + e.id) ? 'hov' : e.construction ? 'cons' : isDefined(e) ? 'def' : 'under';
    const pp = entPolyline(P, e);
    for (let i = 1; i < pp.length; i++) buckets[key].push(...arr3(skW(...pp[i - 1])), ...arr3(skW(...pp[i])));
  }
  const add = (arr, col, w, opts) => { if (arr.length) { const l = new LineSegments2(segGeom(arr), lineMat(col, w, { depthTest: false, transparent: true, ...opts })); if (opts?.dashed) l.computeLineDistances(); l.renderOrder = 10; g.add(l); } };
  add(buckets.cons, C.skCons, 1.2, { dashed: true, dashSize: 0.9 * step / 4, gapSize: 0.6 * step / 4 });
  add(buckets.under, C.skUnder, 2);
  add(buckets.def, C.skDef, 2);
  add(buckets.hov, C.hover, 3);
  add(buckets.sel, C.sel, 3);
  // points
  const ptsA = [], ptsSel = [];
  for (const p of P.values()) {
    const used = p.origin || SK.data.ents.some((e) => entPointIds(e).includes(p.id)) || (SK.draw && Object.values(SK.draw).includes(p.id));
    if (!used) continue;
    (SK.sel.has('p:' + p.id) || SK.hover === 'p:' + p.id || (SK.dimPick || []).includes('p:' + p.id) ? ptsSel : ptsA).push(skW(p.x, p.y));
  }
  const pm = (arr, col, size) => { if (!arr.length) return; const o = new THREE.Points(new THREE.BufferGeometry().setFromPoints(arr), new THREE.PointsMaterial({ color: col, size, sizeAttenuation: false, depthTest: false, transparent: true })); o.renderOrder = 11; g.add(o); };
  pm(ptsA, C.skDef, 6); pm(ptsSel, C.sel, 9);
  // rubber band preview
  const cur = SK.cursor; const D = SK.draw; const pv = [];
  if (cur && D) {
    const P0 = (id) => P.get(id);
    const t = SK.tool;
    if (t === 'line' && D.start) { const a = P0(D.start); pv.push([[a.x, a.y], [cur.u, cur.v]]); }
    if ((t === 'rect' || t === 'crect') && D.a) {
      let [x0, y0] = D.a, x1 = cur.u, y1 = cur.v; if (t === 'crect') { const dx = x1 - x0, dy = y1 - y0; [x0, y0, x1, y1] = [x0 - dx, y0 - dy, x0 + dx, y0 + dy]; }
      pv.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]);
    }
    if ((t === 'circle' || t === 'polygon') && D.c) {
      const c = P0(D.c); const r = Math.hypot(cur.u - c.x, cur.v - c.y); const n = t === 'circle' ? 64 : SK.polySides; const a0 = Math.atan2(cur.v - c.y, cur.u - c.x);
      const ring = []; for (let i = 0; i <= n; i++) { const a = a0 + (i * 2 * Math.PI) / n; ring.push([c.x + r * Math.cos(a), c.y + r * Math.sin(a)]); } pv.push(ring);
    }
    if (t === 'arc' && D.a) {
      const A = P0(D.a);
      if (!D.b) pv.push([[A.x, A.y], [cur.u, cur.v]]);
      else { const B = P0(D.b); const cc = circle3([A.x, A.y], [B.x, B.y], [cur.u, cur.v]); if (cc) { const r = Math.hypot(A.x - cc[0], A.y - cc[1]); const cr = (B.x - A.x) * (cur.v - A.y) - (B.y - A.y) * (cur.u - A.x); const [s, e] = cr < 0 ? [A, B] : [B, A]; let a0 = Math.atan2(s.y - cc[1], s.x - cc[0]), a1 = Math.atan2(e.y - cc[1], e.x - cc[0]); while (a1 <= a0) a1 += 2 * Math.PI; const arc = []; for (let i = 0; i <= 48; i++) { const a = a0 + ((a1 - a0) * i) / 48; arc.push([cc[0] + r * Math.cos(a), cc[1] + r * Math.sin(a)]); } pv.push(arc); } }
    }
    if (t === 'slot' && D.c1) {
      const c1 = P0(D.c1);
      if (!D.c2) pv.push([[c1.x, c1.y], [cur.u, cur.v]]);
      else { const c2 = P0(D.c2); const dx = c2.x - c1.x, dy = c2.y - c1.y, L = Math.hypot(dx, dy) || 1; const nr = [-dy / L, dx / L]; const r = Math.abs((cur.u - c1.x) * nr[0] + (cur.v - c1.y) * nr[1]); const ring = []; const base = Math.atan2(dy, dx);
        for (let i = 0; i <= 24; i++) { const a = base - Math.PI / 2 + (Math.PI * i) / 24; ring.push([c2.x + r * Math.cos(a), c2.y + r * Math.sin(a)]); }
        for (let i = 0; i <= 24; i++) { const a = base + Math.PI / 2 + (Math.PI * i) / 24; ring.push([c1.x + r * Math.cos(a), c1.y + r * Math.sin(a)]); }
        ring.push(ring[0]); pv.push(ring); }
    }
    if (t === 'spline' && D.pts) pv.push(catmull([...D.pts.map((id) => [P0(id).x, P0(id).y]), [cur.u, cur.v]]));
  }
  if (pv.length) { const arr = []; for (const pp of pv) for (let i = 1; i < pp.length; i++) arr.push(...arr3(skW(...pp[i - 1])), ...arr3(skW(...pp[i]))); add(arr, C.sel, 1.5, { dashed: false }); }
  if (cur && SK.tool !== 'select' && SK.tool !== 'dim') pm([skW(cur.u, cur.v)], cur.kind === 'free' ? C.skUnder : C.sel, cur.kind === 'free' ? 5 : 10);
  // dimension geometry + labels + constraint glyphs
  const dl = []; const overlays = [];
  for (const c of SK.data.cons) {
    const info2 = CONS_INFO[c.type]; if (!info2) continue;
    if (info2.dim) {
      let anchor; try { anchor = dimAnchor(c, P, E); } catch { continue; }
      const L = [anchor[0] + (c.lp?.[0] ?? 5), anchor[1] + (c.lp?.[1] ?? 5)];
      dimGeometry(c, P, E, L, dl);
      const sel = SK.sel.has('c:' + c.id);
      const elx = el('button', { class: 'dim' + (sel ? ' sel' : ''), title: `${info2.label}: ${c.value} · double-click to edit`, 'aria-label': `${info2.label} ${c.value}` }, dimText(c));
      elx.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.shiftKey) SK.sel.has('c:' + c.id) ? SK.sel.delete('c:' + c.id) : SK.sel.add('c:' + c.id); else { SK.sel.clear(); SK.sel.add('c:' + c.id); } SK.dimDrag = { c, sx: e.clientX, sy: e.clientY, lp: (c.lp || [5, 5]).slice() }; elx.setPointerCapture(e.pointerId); renderSketchSoon(); });
      elx.addEventListener('pointermove', (e) => { const d = SK?.dimDrag; if (!d || d.c !== c) return; const a = skFromScreen(d.sx - View.renderer.domElement.getBoundingClientRect().left, d.sy - View.renderer.domElement.getBoundingClientRect().top); const b = skFromScreen(e.clientX - View.renderer.domElement.getBoundingClientRect().left, e.clientY - View.renderer.domElement.getBoundingClientRect().top); if (a && b) { c.lp = [d.lp[0] + b[0] - a[0], d.lp[1] + b[1] - a[1]]; d.moved = true; renderSketchSoon(); } });
      elx.addEventListener('pointerup', () => { if (SK) SK.dimDrag = null; });
      elx.addEventListener('dblclick', (e) => { e.stopPropagation(); editDimension(c.id); });
      overlays.push({ el: elx, pos: () => skW(L[0], L[1]), cid: c.id });
    } else {
      const pos = glyphPos(c, P, E); if (!pos) continue;
      const sel = SK.sel.has('c:' + c.id);
      const elx = el('button', { class: 'glyph' + (sel ? ' sel' : ''), title: info2.label + ' constraint', 'aria-label': info2.label + ' constraint' }, info2.glyph);
      elx.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!e.shiftKey) SK.sel.clear(); SK.sel.add('c:' + c.id); renderSketchSoon(); });
      overlays.push({ el: elx, pos: () => skW(pos[0], pos[1]) });
    }
  }
  add(dl, C.skDef, 1, { transparent: true, opacity: 0.8 });
  setOverlays('sk', overlays);
  requestRender();
}
let _rsq = 0; function renderSketchSoon() { cancelAnimationFrame(_rsq); _rsq = requestAnimationFrame(renderSketch); }
function glyphPos(c, P, E) {
  const e1 = E.get(c.e1); const off = 3 / pxPerUnit() * 4;
  if (e1 && e1.type === 'line') { const a = P.get(e1.p1), b = P.get(e1.p2); const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; const n = [-(b.y - a.y) / L, (b.x - a.x) / L]; const k = c.type === 'equal' ? 0.3 : c.type === 'parallel' || c.type === 'perpendicular' ? 0.7 : 0.5; return [a.x + (b.x - a.x) * k + n[0] * off, a.y + (b.y - a.y) * k + n[1] * off]; }
  if (c.a) { const p = P.get(c.a); if (p) return [p.x + off, p.y + off]; }
  if (e1 && e1.c) { const cc = P.get(e1.c); const r = e1.r ?? Math.hypot(P.get(e1.p1).x - cc.x, P.get(e1.p1).y - cc.y); return [cc.x + r * 0.72, cc.y + r * 0.72]; }
  return null;
}
function dimGeometry(c, P, E, L, out) {
  const push = (a, b) => out.push(...arr3(skW(a[0], a[1])), ...arr3(skW(b[0], b[1])));
  const e1 = E.get(c.e1);
  let A, B;
  if (c.type === 'length') { A = P.get(e1.p1); B = P.get(e1.p2); }
  else if (c.type === 'distance' || c.type === 'hdistance' || c.type === 'vdistance') { A = P.get(c.a); B = P.get(c.b); }
  if (A && B) {
    let a = [A.x, A.y], b = [B.x, B.y];
    let d = [b[0] - a[0], b[1] - a[1]];
    if (c.type === 'hdistance') d = [1, 0]; if (c.type === 'vdistance') d = [0, 1];
    const l = Math.hypot(...d) || 1; d = [d[0] / l, d[1] / l]; const n = [-d[1], d[0]];
    const off = (L[0] - a[0]) * n[0] + (L[1] - a[1]) * n[1];
    const offB = (L[0] - b[0]) * n[0] + (L[1] - b[1]) * n[1];
    const a2 = [a[0] + n[0] * off, a[1] + n[1] * off], b2 = [b[0] + n[0] * offB, b[1] + n[1] * offB];
    push(a, a2); push(b, b2); push(a2, b2);
    return;
  }
  if (c.type === 'diameter' || c.type === 'radius') {
    const cc = P.get(e1.c); const r = e1.r ?? Math.hypot(P.get(e1.p1).x - cc.x, P.get(e1.p1).y - cc.y);
    const ang = Math.atan2(L[1] - cc.y, L[0] - cc.x); const p = [cc.x + r * Math.cos(ang), cc.y + r * Math.sin(ang)];
    push(c.type === 'diameter' ? [cc.x - r * Math.cos(ang), cc.y - r * Math.sin(ang)] : [cc.x, cc.y], p); push(p, L);
    return;
  }
  if (c.type === 'pldist') {
    const p = P.get(c.a), a = P.get(e1.p1), b = P.get(e1.p2); const d = [b.x - a.x, b.y - a.y]; const l2 = d[0] * d[0] + d[1] * d[1] || 1;
    const t = ((p.x - a.x) * d[0] + (p.y - a.y) * d[1]) / l2; const f = [a.x + d[0] * t, a.y + d[1] * t]; push([p.x, p.y], f); push([(p.x + f[0]) / 2, (p.y + f[1]) / 2], L);
    return;
  }
  if (c.type === 'angle') { const X = lineIntersect(P, e1, E.get(c.e2)); if (X) push(X, L); }
}

function updateSketchStatus() {
  if (!SK) return;
  const i = SK.info; const s = $('#skStatus'); if (!s) return;
  if (!i.ok) { s.textContent = 'Conflicting constraints'; s.dataset.state = 'bad'; }
  else if (i.dof === 0) { s.textContent = 'Fully defined'; s.dataset.state = 'ok'; }
  else { s.textContent = `${i.dof} degree${i.dof === 1 ? '' : 's'} of freedom`; s.dataset.state = 'under'; }
}
