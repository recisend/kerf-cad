#!/usr/bin/env node
// Kerf CAD MCP server: parametric part modeling over the Model Context Protocol.
// Uses the same kernel, sketch solver and features as the Kerf web app, and reads/writes
// the same .kerf.json documents, so models move freely between the two.
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, extname, basename } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// stdout carries the protocol; route stray logging to stderr
console.log = (...a) => console.error(...a);
const K = await import('./lib/kernel.mjs');
const { renderPNG, VIEWS } = await import('./lib/render.mjs');
const { THREE, V3 } = K;

const MATERIALS = {
  steel: ['Steel, mild', 7.85], stainless: ['Stainless steel 304', 8.0], aluminum: ['Aluminium 6061', 2.7], titanium: ['Titanium Ti-6Al-4V', 4.43],
  brass: ['Brass C360', 8.5], abs: ['ABS', 1.04], pla: ['PLA', 1.24], nylon: ['Nylon PA12', 1.01], oak: ['Oak', 0.75],
};
const PART_COLORS = ['#9aa7b4', '#c7a76a', '#7f9fb8', '#b98a7c', '#8fae8b', '#a596bf', '#c1b49a', '#7fb0ad'];
const r3 = (v) => Math.round(v * 1000) / 1000;
const r3a = (v) => [r3(v.x), r3(v.y), r3(v.z)];

/* ------------------------------------------------------------------ state */
const S = { doc: null, ctx: null, undo: [], path: null };
function newDoc(name = 'Untitled part studio') { return { v: 1, name, features: [], rollback: null, partProps: {}, vis: {}, counters: {} }; }
const strip = (f) => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith('_')));
const docJSON = () => ({ app: 'kerf', v: 1, name: S.doc.name, features: S.doc.features.map(strip), rollback: S.doc.rollback, partProps: S.doc.partProps, vis: S.doc.vis, counters: S.doc.counters });
const rollIdx = () => (S.doc.rollback == null ? S.doc.features.length : Math.max(0, Math.min(S.doc.rollback, S.doc.features.length)));
function partProps(id) {
  const pp = S.doc.partProps;
  if (!pp[id]) { const n = Object.keys(pp).length; pp[id] = { name: `Part ${n + 1}`, color: PART_COLORS[n % PART_COLORS.length], material: 'aluminum', hidden: false }; }
  return pp[id];
}
function regen() {
  K.resetFid(); let ctx = K.newCtx(); const end = rollIdx();
  S.doc.features.forEach((f, i) => { f._rolled = i >= end; if (i < end) { reselect(f, ctx); ctx = K.runFeature(ctx, f); } });
  S.ctx = ctx; for (const p of ctx.parts) partProps(p.id);
}
function ctxBefore(index) { K.resetFid(); let ctx = K.newCtx(); for (let i = 0; i < Math.min(index, rollIdx()); i++) { reselect(S.doc.features[i], ctx); ctx = K.runFeature(ctx, S.doc.features[i]); } return ctx; }
/* Selections made with selectors ("edges parallel to Z", {face:"top"}, a sketch name) are kept and
   re-resolved against the model at that point in history on every rebuild, so they follow
   dimension changes. If the stored reference was edited elsewhere (e.g. in the web app), the
   selector is dropped and the stored reference wins. */
const isStableSelector = (v) => !JSON.stringify(v ?? null).match(/"(face|edge):[^"]*"|"kind":/);
function reselect(f, ctx) {
  const sel = f.params?.__sel; if (!sel) return;
  for (const [key, spec] of Object.entries(sel)) {
    const fd = K.FEATURES[f.type].fields.find((q) => q.key === key);
    if (!fd || JSON.stringify(f.params[key]) !== f.params.__selres?.[key]) { delete sel[key]; continue; }
    try { const refs = normRefs(spec, fd, ctx); f.params[key] = refs; f.params.__selres[key] = JSON.stringify(refs); } catch { /* keep last good reference */ }
  }
  if (!Object.keys(sel).length) { delete f.params.__sel; delete f.params.__selres; }
}
function checkpoint() { S.undo.push(JSON.stringify(docJSON())); if (S.undo.length > 100) S.undo.shift(); }
function loadDoc(d) { if (!d || !Array.isArray(d.features)) throw new Error('Not a Kerf document (no features array)'); S.doc = { ...newDoc(), ...d }; delete S.doc.app; regen(); }
S.doc = newDoc(); regen();

/* -------------------------------------------------------------- lookups */
function findFeature(ref) {
  const fs = S.doc.features; const s = String(ref);
  const f = fs.find((q) => q.id === s) || fs.find((q) => q.name.toLowerCase() === s.toLowerCase());
  if (!f) throw new Error(`No feature "${ref}". Features: ${fs.map((q) => `${q.name} (${q.id})`).join(', ') || 'none'}`);
  return f;
}
function findPart(ref, ctx = S.ctx) {
  const s = String(ref); const parts = ctx.parts;
  const p = parts.find((q) => q.id === s) || parts.find((q) => partProps(q.id).name.toLowerCase() === s.toLowerCase());
  if (!p) throw new Error(`No part "${ref}". Parts: ${parts.map((q) => `${partProps(q.id).name} (${q.id})`).join(', ') || 'none'}`);
  return p;
}
const DIRS = { top: [0, 0, 1], bottom: [0, 0, -1], front: [0, -1, 0], back: [0, 1, 0], right: [1, 0, 0], left: [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1], '+y': [0, 1, 0], '-y': [0, -1, 0], '+x': [1, 0, 0], '-x': [-1, 0, 0] };
const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
function faceRef(part, face) {
  const s = part.solid; let best = -1, p = face.centroid;
  for (const t of face.tris) { const a = s.vert(s.idx[t * 3]), b = s.vert(s.idx[t * 3 + 1]), c = s.vert(s.idx[t * 3 + 2]); const ar = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).length(); if (ar > best) { best = ar; p = a.add(b).add(c).divideScalar(3); } }
  return { kind: 'face', part: part.id, n: K.arr3(face.normal), p: K.arr3(p) };
}
function edgeRef(part, e) { return { kind: 'edge', part: part.id, a: K.arr3(e.pts[0]), b: K.arr3(e.closed ? e.pts[Math.floor(e.pts.length / 2)] : e.pts[e.pts.length - 1]) }; }
function partsFor(spec, ctx = S.ctx) { return spec && spec.part != null ? [findPart(spec.part, ctx)] : ctx.parts; }
/* face spec: "top" | "+x" | "face:<part>:<id>" | {direction|normal, part?, nth?} | {point:[x,y,z], part?} */
function resolveFaceSpec(spec, ctx = S.ctx) {
  if (typeof spec === 'string' && spec.startsWith('face:')) {
    const [, pid, fid] = spec.split(':'); const part = ctx.parts.find((q) => q.id === pid); const face = part && K.analyze(part.solid).faces.get(+fid);
    if (!face) throw new Error(`Face ${spec} no longer exists. Call list_topology again.`); return { part, face };
  }
  const o = typeof spec === 'string' ? { direction: spec } : spec;
  if (o.point) {
    const p = new V3(...o.point); let best = null, bd = Infinity;
    for (const part of partsFor(o, ctx)) for (const f of K.analyze(part.solid).faces.values()) {
      if (o.normal && f.normal.dot(new V3(...o.normal).normalize()) < 0.98) continue;
      const s = part.solid; const tri = new THREE.Triangle(), q = new V3();
      for (const t of f.tris) { tri.set(s.vert(s.idx[t * 3]), s.vert(s.idx[t * 3 + 1]), s.vert(s.idx[t * 3 + 2])); tri.closestPointToPoint(p, q); const dd = q.distanceTo(p); if (dd < bd) { bd = dd; best = { part, face: f }; } }
    }
    if (!best) throw new Error('No face found near that point'); return best;
  }
  const dv = o.normal || DIRS[String(o.direction || '').toLowerCase()];
  if (!dv) throw new Error(`Unknown face selector ${JSON.stringify(spec)}. Use top/bottom/front/back/left/right/+x/-x/+y/-y/+z/-z, "face:<part>:<id>" from list_topology, {normal:[x,y,z]} or {point:[x,y,z]}.`);
  const dir = new V3(...dv).normalize(); const cands = [];
  for (const part of partsFor(o, ctx)) for (const f of K.analyze(part.solid).faces.values()) if (f.planar && f.normal.dot(dir) > 0.999) cands.push({ part, face: f, off: f.centroid.dot(dir) });
  if (!cands.length) throw new Error(`No flat face points ${JSON.stringify(dv)}${o.part != null ? ' on that part' : ''}`);
  cands.sort((a, b) => b.off - a.off || b.face.area - a.face.area);
  const n = o.nth || 0; if (!cands[n]) throw new Error(`Only ${cands.length} faces face that way`);
  return cands[n];
}
function resolveEdgeSpecs(spec, ctx = S.ctx) {
  if (typeof spec === 'string' && spec.startsWith('edge:')) {
    const [, pid, idx] = spec.split(':'); const part = ctx.parts.find((q) => q.id === pid); const e = part && K.analyze(part.solid).edges[+idx];
    if (!e) throw new Error(`Edge ${spec} no longer exists. Call list_topology again.`); return [edgeRef(part, e)];
  }
  if (spec.from && spec.to) return [{ kind: 'edge', part: spec.part != null ? findPart(spec.part, ctx).id : undefined, a: spec.from, b: spec.to }];
  if (spec.edges_of != null) { const { part, face } = resolveFaceSpec(spec.edges_of, ctx); return K.analyze(part.solid).edges.filter((e) => e.faces.includes(face.id) && (!spec.straight_only || e.straight)).map((e) => edgeRef(part, e)); }
  if (spec.parallel_to != null) {
    const ax = new V3(...(Array.isArray(spec.parallel_to) ? spec.parallel_to : AXES[spec.parallel_to])).normalize();
    const onFace = spec.on_face != null ? resolveFaceSpec(spec.on_face, ctx) : null; const out = [];
    for (const part of partsFor(spec, ctx)) for (const e of K.analyze(part.solid).edges) {
      if (!e.straight || (onFace && (onFace.part !== part || !e.faces.includes(onFace.face.id)))) continue;
      const d = e.pts[e.pts.length - 1].clone().sub(e.pts[0]).normalize(); if (Math.abs(d.dot(ax)) > 0.9999) out.push(edgeRef(part, e));
    }
    if (!out.length) throw new Error('No straight edges match that selector'); return out;
  }
  throw new Error(`Unknown edge selector ${JSON.stringify(spec)}`);
}
/* turn a friendly reference into the web app's stored reference objects */
function normRefs(input, fd, ctx = S.ctx) {
  const kinds = fd.pick; const list = input == null ? [] : Array.isArray(input) ? input : [input]; const out = [];
  for (const it of list) {
    if (it && typeof it === 'object' && it.kind) { out.push(it); continue; }
    if (typeof it === 'string') {
      const low = it.toLowerCase();
      if (kinds.includes('plane') && ['top', 'front', 'right'].includes(low)) { out.push({ kind: 'plane', id: low }); continue; }
      if (it.startsWith('face:') && kinds.includes('face')) { const r = resolveFaceSpec(it, ctx); out.push(faceRef(r.part, r.face)); continue; }
      if (it.startsWith('edge:') && kinds.includes('edge')) { out.push(...resolveEdgeSpecs(it, ctx)); continue; }
      const f = S.doc.features.find((q) => q.id === it || q.name.toLowerCase() === low);
      if (f) {
        if (f.type === 'plane' && kinds.includes('plane')) { out.push({ kind: 'plane', id: f.id }); continue; }
        if (f.type === 'sketch' && kinds.includes('sketch')) { out.push({ kind: 'sketch', id: f.id }); continue; }
        if (f.type === 'sketch' && kinds.includes('region')) { out.push(...regionRefs(f, 'all', ctx)); continue; }
        if (kinds.includes('feature')) { out.push({ kind: 'feature', id: f.id }); continue; }
      }
      if (kinds.includes('part')) { const p = ctx.parts.find((q) => q.id === it || partProps(q.id).name.toLowerCase() === low); if (p) { out.push({ kind: 'part', id: p.id }); continue; } }
      if (kinds.includes('face') && DIRS[low]) { const r = resolveFaceSpec(it, ctx); out.push(faceRef(r.part, r.face)); continue; }
      throw new Error(`"${it}" is not a valid ${fd.label || fd.key} (accepts ${kinds.join(', ')})`);
    }
    if (it && typeof it === 'object') {
      if (it.sketch != null && kinds.includes('region')) { out.push(...regionRefs(findFeature(it.sketch), it.region ?? 'all', ctx)); continue; }
      if (it.sketch != null && it.line != null && kinds.includes('sketchLine')) { out.push({ kind: 'sketchEnt', sketch: findFeature(it.sketch).id, ent: it.line }); continue; }
      if (it.sketch != null && kinds.includes('sketch')) { out.push({ kind: 'sketch', id: findFeature(it.sketch).id }); continue; }
      if (it.face != null && kinds.includes('face')) { const r = resolveFaceSpec(it.face, ctx); out.push(faceRef(r.part, r.face)); continue; }
      if (kinds.includes('edge') && (it.edge != null || it.from || it.edges_of != null || it.parallel_to != null)) { out.push(...resolveEdgeSpecs(it.edge ?? it, ctx)); continue; }
      if (kinds.includes('face') && it.edges_of != null) { const r = resolveFaceSpec(it.edges_of, ctx); out.push(faceRef(r.part, r.face)); continue; }
      if (it.part != null && kinds.includes('part')) { out.push({ kind: 'part', id: findPart(it.part, ctx).id }); continue; }
      if (it.plane != null && kinds.includes('plane')) { out.push(...normRefs(String(it.plane), fd, ctx)); continue; }
      if (it.feature != null && kinds.includes('feature')) { out.push({ kind: 'feature', id: findFeature(it.feature).id }); continue; }
    }
    throw new Error(`Could not use ${JSON.stringify(it)} for ${fd.label || fd.key} (accepts ${kinds.join(', ')})`);
  }
  return out;
}
function regionRefs(f, which, ctx = S.ctx) {
  const sk = ctx.sketches[f.id]; if (!sk) throw new Error(`Sketch "${f.name}" has not been built (is it after the rollback bar, or failing?)`);
  if (!sk.regions.length) throw new Error(`Sketch "${f.name}" has no closed regions`);
  let list;
  if (which === 'all') list = sk.regions.filter((r) => K.regionDepth(sk.regions, r) % 2 === 0);
  else list = (Array.isArray(which) ? which : [which]).map((i) => { const r = sk.regions[i]; if (!r) throw new Error(`Sketch "${f.name}" has regions 0–${sk.regions.length - 1}`); return r; });
  return list.map((r) => ({ kind: 'region', sketch: f.id, pt: r.sample.slice() }));
}

/* --------------------------------------------------------------- sketches */
function buildSketch(spec) {
  const data = { pts: [], ents: [], cons: [] }; const named = {}; let n = 0, pn = 0;
  const cid = () => 'c' + data.cons.length + Math.random().toString(36).slice(2, 5);
  const P = (xy) => {
    if (!Array.isArray(xy) || xy.length < 2 || !xy.every(Number.isFinite)) throw new Error(`Expected a point [x, y], got ${JSON.stringify(xy)}`);
    if (Math.hypot(xy[0], xy[1]) < 1e-9) return K.ORIGIN_ID;
    const hit = data.pts.find((p) => Math.hypot(p.x - xy[0], p.y - xy[1]) < 1e-6); if (hit) return hit.id;
    const id = 'p' + ++pn; data.pts.push({ id, x: xy[0], y: xy[1] }); return id;
  };
  const line = (id, a, b, cons, hv) => {
    data.ents.push({ id, type: 'line', p1: a, p2: b, construction: !!cons });
    if (hv) { const A = ptXY(a), B = ptXY(b); const ang = Math.abs(Math.atan2(B[1] - A[1], B[0] - A[0])) / K.DEG; if (ang < 1e-6 || Math.abs(ang - 180) < 1e-6) data.cons.push({ id: cid(), type: 'horizontal', e1: id }); else if (Math.abs(ang - 90) < 1e-6) data.cons.push({ id: cid(), type: 'vertical', e1: id }); }
    return id;
  };
  const ptXY = (id) => (id === K.ORIGIN_ID ? [0, 0] : (() => { const p = data.pts.find((q) => q.id === id); return [p.x, p.y]; })());
  const dim = (c) => data.cons.push({ id: cid(), lp: [6, 6], ...c, value: String(c.value) });
  const auto = spec.auto_constraints !== false;
  for (const e of spec.entities || []) {
    const id = String(e.id || `${e.type}${++n}`); const cons = !!e.construction;
    if (named[id]) throw new Error(`Duplicate entity id "${id}"`);
    switch (e.type) {
      case 'line': { const a = P(e.from), b = P(e.to); line(id, a, b, cons, auto); named[id] = { ent: id, start: a, end: b }; break; }
      case 'polyline': {
        const pts = e.points.map(P); const segs = e.closed ? pts.length : pts.length - 1; const subs = [];
        for (let i = 0; i < segs; i++) subs.push(line(`${id}.${i}`, pts[i], pts[(i + 1) % pts.length], cons, auto));
        named[id] = { subs, start: pts[0], end: pts[pts.length - 1] }; pts.forEach((p, i) => (named[`${id}.v${i}`] = { pt: p })); subs.forEach((s, i) => (named[s] = { ent: s, start: pts[i], end: pts[(i + 1) % pts.length] }));
        break;
      }
      case 'rectangle': {
        let x0, y0, x1, y1;
        if (e.center) { const W = e.width, H = e.height; if (!(W > 0 && H > 0)) throw new Error('rectangle needs width and height > 0'); [x0, y0, x1, y1] = [e.center[0] - W / 2, e.center[1] - H / 2, e.center[0] + W / 2, e.center[1] + H / 2]; }
        else { [x0, y0] = e.corner1; [x1, y1] = e.corner2; }
        const c = [P([x0, y0]), P([x1, y0]), P([x1, y1]), P([x0, y1])]; const nm = ['bottom', 'right', 'top', 'left'];
        const subs = nm.map((s, i) => line(`${id}.${s}`, c[i], c[(i + 1) % 4], cons, false));
        if (auto) data.cons.push({ id: cid(), type: 'horizontal', e1: subs[0] }, { id: cid(), type: 'vertical', e1: subs[1] }, { id: cid(), type: 'horizontal', e1: subs[2] }, { id: cid(), type: 'vertical', e1: subs[3] });
        if (e.center && auto) { const ctr = P(e.center); line(`${id}.diag`, c[0], c[2], true, false); data.cons.push({ id: cid(), type: 'midpoint', a: ctr, e1: `${id}.diag` }); named[`${id}.center`] = { pt: ctr }; }
        if (e.dimension) { dim({ type: 'length', e1: subs[0], value: e.width ?? Math.abs(x1 - x0) }); dim({ type: 'length', e1: subs[1], value: e.height ?? Math.abs(y1 - y0) }); }
        named[id] = { subs }; subs.forEach((s, i) => (named[s] = { ent: s, start: c[i], end: c[(i + 1) % 4] })); c.forEach((p, i) => (named[`${id}.v${i}`] = { pt: p }));
        break;
      }
      case 'circle': { const r = e.radius ?? (e.diameter != null ? e.diameter / 2 : NaN); if (!(r > 0)) throw new Error('circle needs radius or diameter > 0'); const c = P(e.center); data.ents.push({ id, type: 'circle', c, r, construction: cons }); named[id] = { ent: id, center: c }; if (e.dimension) dim({ type: 'diameter', e1: id, value: 2 * r }); break; }
      case 'arc': {
        let c, a, b;
        if (e.mid) { const cc = circle3(e.start, e.mid, e.end); if (!cc) throw new Error('arc points are collinear'); const cr = (e.end[0] - e.start[0]) * (e.mid[1] - e.start[1]) - (e.end[1] - e.start[1]) * (e.mid[0] - e.start[0]); c = P(cc); [a, b] = cr < 0 ? [P(e.start), P(e.end)] : [P(e.end), P(e.start)]; }
        else { c = P(e.center); a = P(e.start); b = P(e.end); }
        data.ents.push({ id, type: 'arc', c, p1: a, p2: b, construction: cons }); named[id] = { ent: id, center: c, start: a, end: b }; break;
      }
      case 'polygon': {
        const sides = Math.round(e.sides || 6), r = e.radius; if (sides < 3 || !(r > 0)) throw new Error('polygon needs sides >= 3 and radius > 0');
        const c = P(e.center); const circ = `${id}.circle`; data.ents.push({ id: circ, type: 'circle', c, r, construction: true });
        const a0 = ((e.angle || 90) * Math.PI) / 180; const pts = [];
        for (let i = 0; i < sides; i++) { const a = a0 + (i * 2 * Math.PI) / sides; pts.push(P([e.center[0] + r * Math.cos(a), e.center[1] + r * Math.sin(a)])); }
        const subs = pts.map((p, i) => line(`${id}.${i}`, p, pts[(i + 1) % sides], cons, false));
        if (auto) { pts.forEach((p) => data.cons.push({ id: cid(), type: 'onEntity', a: p, e1: circ })); subs.slice(1).forEach((s) => data.cons.push({ id: cid(), type: 'equal', e1: subs[0], e2: s })); }
        named[id] = { subs, center: c }; break;
      }
      case 'slot': {
        const [c1, c2] = [e.center1, e.center2]; const r = e.radius ?? (e.width != null ? e.width / 2 : NaN); if (!(r > 0)) throw new Error('slot needs radius or width');
        const L = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]); if (L < 1e-9) throw new Error('slot centers must differ');
        const nr = [-(c2[1] - c1[1]) / L, (c2[0] - c1[0]) / L];
        const C1 = P(c1), C2 = P(c2), a1 = P([c1[0] + r * nr[0], c1[1] + r * nr[1]]), a2 = P([c2[0] + r * nr[0], c2[1] + r * nr[1]]), b2 = P([c2[0] - r * nr[0], c2[1] - r * nr[1]]), b1 = P([c1[0] - r * nr[0], c1[1] - r * nr[1]]);
        data.ents.push({ id: `${id}.line1`, type: 'line', p1: a1, p2: a2, construction: cons }, { id: `${id}.arc2`, type: 'arc', c: C2, p1: b2, p2: a2, construction: cons }, { id: `${id}.line2`, type: 'line', p1: b2, p2: b1, construction: cons }, { id: `${id}.arc1`, type: 'arc', c: C1, p1: a1, p2: b1, construction: cons }, { id: `${id}.axis`, type: 'line', p1: C1, p2: C2, construction: true });
        if (auto) for (const [l, a] of [['line1', 'arc1'], ['line1', 'arc2'], ['line2', 'arc1'], ['line2', 'arc2']]) data.cons.push({ id: cid(), type: 'tangent', e1: `${id}.${l}`, e2: `${id}.${a}` });
        if (auto) data.cons.push({ id: cid(), type: 'equal', e1: `${id}.arc1`, e2: `${id}.arc2` }, { id: cid(), type: 'parallel', e1: `${id}.line1`, e2: `${id}.axis` });
        named[id] = { center1: C1, center2: C2 }; ['line1', 'line2', 'arc1', 'arc2', 'axis'].forEach((s) => (named[`${id}.${s}`] = { ent: `${id}.${s}` }));
        break;
      }
      case 'point': { const p = P(e.at); data.ents.push({ id, type: 'point', p }); named[id] = { ent: id, pt: p }; break; }
      case 'spline': { const pts = e.points.map(P); data.ents.push({ id, type: 'spline', pts, construction: cons }); named[id] = { ent: id, start: pts[0], end: pts[pts.length - 1] }; break; }
      default: throw new Error(`Unknown sketch entity type "${e.type}"`);
    }
  }
  // constraint references
  const ptRef = (r) => {
    if (r === 'origin') return K.ORIGIN_ID;
    if (Array.isArray(r)) { const h = data.pts.find((p) => Math.hypot(p.x - r[0], p.y - r[1]) < 1e-6); if (Math.hypot(r[0], r[1]) < 1e-9) return K.ORIGIN_ID; if (!h) throw new Error(`No sketch point at ${JSON.stringify(r)}`); return h.id; }
    const s = String(r); const m = s.match(/^(.*)\.(start|end|center|center1|center2)$/);
    if (m && named[m[1]] && named[m[1]][m[2]]) return named[m[1]][m[2]];
    if (named[s]?.pt) return named[s].pt;
    throw new Error(`Unknown point "${r}". Use "origin", "<entity>.start", "<entity>.end", "<entity>.center", a point entity id or [x, y].`);
  };
  const entRef = (r) => { const s = String(r); if (named[s]?.ent) return named[s].ent; if (data.ents.find((e) => e.id === s)) return s; throw new Error(`Unknown entity "${r}"${named[s]?.subs ? ` (use one of ${named[s].subs.join(', ')})` : ''}`); };
  const merge = (keep, drop) => {
    if (keep === drop) return; if (drop === K.ORIGIN_ID) [keep, drop] = [drop, keep];
    for (const e of data.ents) { for (const k of ['p1', 'p2', 'c', 'p']) if (e[k] === drop) e[k] = keep; if (e.pts) e.pts = e.pts.map((q) => (q === drop ? keep : q)); }
    for (const c of data.cons) for (const k of ['a', 'b']) if (c[k] === drop) c[k] = keep;
    for (const v of Object.values(named)) for (const k of Object.keys(v)) if (v[k] === drop) v[k] = keep;
    data.pts = data.pts.filter((p) => p.id !== drop);
  };
  for (const c of spec.constraints || []) {
    const t = c.type; const ents = (c.entities || []).map(entRef); const pts = (c.points || []).map(ptRef);
    const e1 = c.entity != null ? entRef(c.entity) : ents[0]; const pt = c.point != null ? ptRef(c.point) : pts[0];
    const push = (o) => data.cons.push({ id: cid(), ...o });
    switch (t) {
      case 'horizontal': case 'vertical': if (e1 && !c.points) push({ type: t, e1 }); else if (pts.length === 2) push({ type: t, a: pts[0], b: pts[1] }); else throw new Error(`${t} needs entity or two points`); break;
      case 'parallel': case 'perpendicular': case 'equal': case 'tangent': if (ents.length !== 2) throw new Error(`${t} needs two entities`); push({ type: t, e1: ents[0], e2: ents[1] }); break;
      case 'concentric': { if (ents.length !== 2) throw new Error('concentric needs two circles/arcs'); const A = data.ents.find((e) => e.id === ents[0]), B = data.ents.find((e) => e.id === ents[1]); merge(A.c, B.c); break; }
      case 'coincident': if (pts.length === 2) merge(pts[0], pts[1]); else if (pt && e1) push({ type: 'onEntity', a: pt, e1 }); else throw new Error('coincident needs two points, or a point and an entity'); break;
      case 'midpoint': push({ type: 'midpoint', a: pt, e1 }); break;
      case 'fix': { const xy = ptXY(pt); push({ type: 'fix', a: pt, x: xy[0], y: xy[1] }); break; }
      case 'length': dim({ type: 'length', e1, value: c.value }); break;
      case 'radius': case 'diameter': dim({ type: t, e1, value: c.value }); break;
      case 'distance': { if (pts.length !== 2) throw new Error('distance needs two points'); dim({ type: c.direction === 'horizontal' ? 'hdistance' : c.direction === 'vertical' ? 'vdistance' : 'distance', a: pts[0], b: pts[1], value: c.value }); break; }
      case 'point_line_distance': dim({ type: 'pldist', a: pt, e1, value: c.value }); break;
      case 'angle': if (ents.length !== 2) throw new Error('angle needs two lines'); dim({ type: 'angle', e1: ents[0], e2: ents[1], s1: 1, s2: 1, value: c.value }); break;
      default: throw new Error(`Unknown constraint type "${t}"`);
    }
  }
  return data;
}
function circle3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])); if (Math.abs(d) < 1e-12) return null;
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  return [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
}
function sketchReport(f) {
  const sk = S.ctx.sketches[f.id]; if (!sk) return { error: f._error || 'not built' };
  const { P } = K.skIndex(sk.data); const pt = (id) => { const p = P.get(id); return [r3(p.x), r3(p.y)]; };
  return {
    solved: sk.solve.ok, degrees_of_freedom: sk.solve.dof, fully_defined: sk.solve.ok && sk.solve.dof === 0,
    plane: { origin: r3a(sk.plane.o), normal: r3a(sk.plane.n), x_axis: r3a(sk.plane.x) },
    entities: sk.data.ents.map((e) => ({ id: e.id, type: e.type, ...(e.construction ? { construction: true } : {}), ...(e.p1 ? { start: pt(e.p1), end: pt(e.p2) } : {}), ...(e.c ? { center: pt(e.c) } : {}), ...(e.type === 'circle' ? { radius: r3(e.r) } : {}), ...(e.p ? { at: pt(e.p) } : {}) })),
    regions: sk.regions.map((r, i) => { const xs = r.outer.pts.map((q) => q[0]), ys = r.outer.pts.map((q) => q[1]); return { index: i, area: r3(r.area), holes: r.holes.length, sample_point: r.sample.map(r3), bbox: [r3(Math.min(...xs)), r3(Math.min(...ys)), r3(Math.max(...xs)), r3(Math.max(...ys))], default_selected: K.regionDepth(sk.regions, r) % 2 === 0 }; }),
  };
}

/* ------------------------------------------------------------- reporting */
function partInfo(p) {
  const pr = partProps(p.id); const m = K.massProps(p.solid); const b = p.solid.bbox(); const mat = MATERIALS[pr.material] || MATERIALS.aluminum;
  return { id: p.id, name: pr.name, color: pr.color, material: pr.material, hidden: !!pr.hidden, volume_mm3: r3(m.volume), surface_area_mm2: r3(m.area), mass_g: r3((m.volume / 1000) * mat[1]), center_of_mass: r3a(m.centroid), bbox_min: r3a(b.min), bbox_max: r3a(b.max), size: r3a(b.getSize(new V3())), faces: K.analyze(p.solid).faces.size, edges: K.analyze(p.solid).edges.length };
}
function featureLine(f, i) {
  const o = { index: i, id: f.id, name: f.name, type: f.type };
  if (f.suppressed) o.suppressed = true; if (f._rolled) o.rolled_back = true; if (f._error) o.error = f._error; if (f._warn) o.warning = f._warn;
  if (f.type === 'variable') o.value = `#${f.params.vname} = ${f.params.value}`;
  else if (f.type !== 'sketch') { const p = {}; for (const fd of K.FEATURES[f.type].fields) { if (fd.show && !fd.show(f.params)) continue; const v = f.params[fd.key]; p[fd.key] = fd.type === 'pick' ? `${(v || []).length} selected` : v; } o.params = p; }
  return o;
}
function summary() {
  return { document: S.doc.name, file: S.path, rollback_index: rollIdx(), variables: Object.fromEntries(Object.entries(S.ctx.vars).map(([k, v]) => [k, r3(v)])), features: S.doc.features.map(featureLine), parts: S.ctx.parts.map(partInfo) };
}
const ok = (obj, extra = []) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) }, ...extra] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: String(e?.message || e) }] });
const wrap = (fn) => async (args) => { try { return await fn(args || {}); } catch (e) { return fail(e); } };

/* ------------------------------------------------------- feature params */
function coerceParams(type, input, ctx, base) {
  const def = K.FEATURES[type]; if (!def) throw new Error(`Unknown feature type "${type}". Types: ${Object.keys(K.FEATURES).join(', ')}`);
  const params = base ? { ...base } : K.defaultParams(type);
  for (const [key, v] of Object.entries(input || {})) {
    const fd = def.fields.find((q) => q.key === key);
    if (!fd) throw new Error(`"${type}" has no parameter "${key}". Parameters: ${def.fields.map((q) => q.key).join(', ')}`);
    if (fd.type === 'pick') {
      params[key] = normRefs(v, fd, ctx);
      if (params.__sel) { params.__sel = { ...params.__sel }; params.__selres = { ...params.__selres }; delete params.__sel[key]; delete params.__selres[key]; }
      if (isStableSelector(v) && v != null) { params.__sel = { ...(params.__sel || {}), [key]: v }; params.__selres = { ...(params.__selres || {}), [key]: JSON.stringify(params[key]) }; }
    }
    else if (['len', 'ang', 'int', 'num', 'expr'].includes(fd.type)) params[key] = String(v);
    else if (fd.type === 'check') params[key] = !!v;
    else if (fd.type === 'seg' || fd.type === 'select') { if (!fd.options.some(([k]) => k === v)) throw new Error(`${key} must be one of ${fd.options.map(([k]) => k).join(', ')}`); params[key] = v; }
    else params[key] = String(v);
  }
  return params;
}
function insertFeature(f, before) {
  const fs = S.doc.features; let i = rollIdx();
  if (before != null) i = fs.indexOf(findFeature(before));
  fs.splice(i, 0, f); if (S.doc.rollback != null && i < S.doc.rollback) S.doc.rollback++;
  return i;
}
function addFeature({ type, params, name, before, keep_on_error }) {
  checkpoint();
  const fs = S.doc.features; const idx0 = before != null ? fs.indexOf(findFeature(before)) : rollIdx();
  const ctx = ctxBefore(idx0);
  const f = { id: K.uid('f'), type, name: '', params: coerceParams(type, params, ctx) };
  S.doc.counters[type] = (S.doc.counters[type] || 0) + 1; f.name = name || `${K.FEATURES[type].label} ${S.doc.counters[type]}`;
  insertFeature(f, before); regen();
  if (f._error && !keep_on_error) { S.doc = JSON.parse(S.undo.pop()); delete S.doc.app; regen(); throw new Error(`${f.name} failed: ${f._error}. Nothing was added.`); }
  return f;
}

/* ------------------------------------------------------------- server */
const server = new McpServer({ name: 'kerf-cad', version: '1.0.0' }, {
  instructions: `Kerf CAD is a parametric part modeler (millimetres, +Z up; Top plane = XY, Front = XZ with normal -Y, Right = YZ).
Typical flow: create_sketch on a plane or face -> add_feature (extrude/revolve/...) using the sketch's regions -> add_feature fillet/chamfer/hole/pattern -> render_view to look -> export.
Every numeric value accepts expressions with variables and units: "#width / 2 + 3 mm", "1 in". Define variables with set_variable.
References: planes "top" | "front" | "right" | plane feature name; regions {sketch, region?: index|[indices]|"all"} or just the sketch name; faces {face:"top"} (top-most flat face facing +Z; a bare "top" means the Top plane where planes are accepted), {face:"+x"}, {face:{direction, part?, nth?}}, {point:[x,y,z]} or "face:<part>:<id>" from list_topology; edges {edges_of: <face>}, {parallel_to:"z", part?, on_face?}, {from:[x,y,z], to:[x,y,z]} or "edge:<part>:<i>"; parts by name or id; features by name or id.
Call describe_features for every feature type's parameters. Documents saved with save_document open in the Kerf web app (Open button) and vice versa.`,
});
const Ref = z.any().describe('A reference or list of references (see server instructions)');

server.registerTool('describe_features', { title: 'Describe feature types', description: 'List every feature type with its parameters, accepted values and defaults. Call this before add_feature if unsure.', inputSchema: { type: z.string().optional().describe('Only describe this type') }, annotations: { readOnlyHint: true } },
  wrap(({ type }) => {
    const out = {};
    for (const [k, def] of Object.entries(K.FEATURES)) {
      if (type && k !== type) continue; if (k === 'sketch') { out.sketch = 'Use create_sketch / update_sketch.'; continue; }
      out[k] = { label: def.label, parameters: def.fields.map((fd) => ({ key: fd.key, label: fd.label, kind: fd.type === 'pick' ? `reference to ${fd.pick.join(' | ')}${fd.multi ? ' (list)' : ''}` : fd.type === 'len' ? 'length expression (mm)' : fd.type === 'ang' ? 'angle expression (deg)' : fd.type === 'int' ? 'integer expression' : fd.type, ...(fd.options ? { options: fd.options.map(([o]) => o) } : {}), ...('def' in fd ? { default: fd.def } : {}), ...(fd.optional ? { optional: true } : {}), ...(fd.show ? { only_when: fd.show.toString().replace(/^\(p\) => /, '') } : {}) })) };
    }
    return ok(out);
  }));

server.registerTool('get_document', { title: 'Get document', description: 'Summary of the current part studio: features (with errors), variables and parts with volume, mass and bounding box.', inputSchema: {}, annotations: { readOnlyHint: true } }, wrap(() => ok(summary())));

server.registerTool('new_document', { title: 'New document', description: 'Start an empty part studio (the previous one can be restored with undo).', inputSchema: { name: z.string().optional() } },
  wrap(({ name }) => { checkpoint(); S.doc = newDoc(name); S.path = null; regen(); return ok(`Started "${S.doc.name}".`); }));

server.registerTool('open_document', { title: 'Open document', description: 'Open a .kerf.json document (as saved by save_document or by the Kerf web app).', inputSchema: { path: z.string().optional(), json: z.string().optional().describe('Document JSON text instead of a path') } },
  wrap(({ path, json }) => { checkpoint(); const d = JSON.parse(json ?? readFileSync(resolve(path), 'utf8')); loadDoc(d); S.path = path ? resolve(path) : null; return ok(summary()); }));

server.registerTool('save_document', { title: 'Save document', description: 'Save the part studio as .kerf.json; open it in the Kerf web app with its Open button.', inputSchema: { path: z.string().optional().describe('Defaults to the last opened/saved path') } },
  wrap(({ path }) => {
    const p = resolve(path || S.path || `${S.doc.name.replace(/[^\w-]+/g, '-').toLowerCase()}.kerf.json`); mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(docJSON(), null, 1)); S.path = p; return ok(`Saved ${p} (${statSync(p).size} bytes).`);
  }));

server.registerTool('set_variable', { title: 'Set variable', description: 'Create or change a #variable usable in any numeric value, e.g. name "wall", value "2.5 mm" or "#width / 4".', inputSchema: { name: z.string(), value: z.union([z.string(), z.number()]) } },
  wrap(({ name, value }) => {
    const n = String(name).replace(/^#/, ''); const f = S.doc.features.find((q) => q.type === 'variable' && q.params.vname === n);
    if (f) { checkpoint(); f.params.value = String(value); regen(); if (f._error) { S.doc = JSON.parse(S.undo.pop()); delete S.doc.app; regen(); throw new Error(f._error); } }
    else { const before = S.doc.features[0]?.id; addFeature({ type: 'variable', params: { vname: n, value: String(value) }, before }); }
    return ok({ variables: S.ctx.vars, errors: S.doc.features.filter((q) => q._error).map((q) => `${q.name}: ${q._error}`) });
  }));

const EntitySchema = z.object({
  type: z.enum(['line', 'polyline', 'rectangle', 'circle', 'arc', 'polygon', 'slot', 'point', 'spline']),
  id: z.string().optional().describe('Your name for it, used by constraints'),
  construction: z.boolean().optional(),
  from: z.array(z.number()).optional(), to: z.array(z.number()).optional(),
  points: z.array(z.array(z.number())).optional(), closed: z.boolean().optional(),
  corner1: z.array(z.number()).optional(), corner2: z.array(z.number()).optional(),
  center: z.array(z.number()).optional(), width: z.number().optional(), height: z.number().optional(),
  radius: z.number().optional(), diameter: z.number().optional(),
  start: z.array(z.number()).optional(), end: z.array(z.number()).optional(), mid: z.array(z.number()).optional(),
  sides: z.number().optional(), angle: z.number().optional(),
  center1: z.array(z.number()).optional(), center2: z.array(z.number()).optional(),
  at: z.array(z.number()).optional(), dimension: z.boolean().optional().describe('Add driving dimensions (rectangle width/height, circle diameter)'),
}).passthrough();
const ConstraintSchema = z.object({
  type: z.enum(['horizontal', 'vertical', 'parallel', 'perpendicular', 'equal', 'tangent', 'concentric', 'coincident', 'midpoint', 'fix', 'length', 'radius', 'diameter', 'distance', 'point_line_distance', 'angle']),
  entity: z.string().optional(), entities: z.array(z.string()).optional(),
  point: z.any().optional(), points: z.array(z.any()).optional(),
  value: z.union([z.string(), z.number()]).optional().describe('Expression, e.g. 40, "#width", "1.5 in"'),
  direction: z.enum(['horizontal', 'vertical', 'aligned']).optional(),
}).passthrough();
const SKETCH_HELP = `Coordinates are 2D [x, y] in the sketch plane (mm). Plane axes: top -> X,Y; front -> X,Z; right -> Y,Z. On a face the sketch origin is the world origin projected onto the face.
Entities: line {from,to} | polyline {points, closed} | rectangle {corner1,corner2} or {center,width,height} | circle {center, radius|diameter} | arc {center,start,end} (counter-clockwise) or {start,mid,end} | polygon {center,radius,sides,angle?} | slot {center1,center2,radius|width} | point {at} (hole centers) | spline {points}.
Shared coordinates join automatically; points at [0,0] attach to the fixed origin. Horizontal/vertical lines get H/V constraints automatically.
Constraint refs: entity ids (rectangles expose "<id>.bottom/.right/.top/.left", polylines "<id>.0..", slots "<id>.line1/.arc1"), points "origin", "<id>.start", "<id>.end", "<id>.center", point ids or [x,y].`;

server.registerTool('create_sketch', {
  title: 'Create sketch',
  description: `Add a constrained 2D sketch. Returns the solved geometry, degrees of freedom and closed regions (by index) for extrude/revolve.\n${SKETCH_HELP}`,
  inputSchema: { plane: Ref.describe('"top" | "front" | "right" | plane feature | face reference'), entities: z.array(EntitySchema), constraints: z.array(ConstraintSchema).optional(), name: z.string().optional(), auto_constraints: z.boolean().optional().describe('Default true'), before: z.string().optional().describe('Insert before this feature') },
}, wrap(({ plane, entities, constraints, name, auto_constraints, before }) => {
  checkpoint();
  const fs = S.doc.features; const idx0 = before != null ? fs.indexOf(findFeature(before)) : rollIdx();
  const ctx = ctxBefore(idx0);
  const planeRef = normRefs(plane, K.FEATURES.sketch.fields[0], ctx);
  const spec = { entities, constraints: constraints || [], auto_constraints };
  const data = buildSketch(spec);
  S.doc.counters.sketch = (S.doc.counters.sketch || 0) + 1;
  const f = { id: K.uid('f'), type: 'sketch', name: name || `Sketch ${S.doc.counters.sketch}`, params: { plane: planeRef, data, spec } };
  if (isStableSelector(plane)) { f.params.__sel = { plane }; f.params.__selres = { plane: JSON.stringify(planeRef) }; }
  insertFeature(f, before); regen();
  if (f._error) { S.doc = JSON.parse(S.undo.pop()); delete S.doc.app; regen(); throw new Error(`Sketch failed: ${f._error}`); }
  const rep = sketchReport(f);
  return ok({ id: f.id, name: f.name, ...rep, ...(rep.solved ? {} : { warning: 'Constraints conflict; the sketch could not satisfy all of them.' }) });
}));

server.registerTool('update_sketch', {
  title: 'Update sketch', description: 'Replace a sketch\'s geometry and constraints (or append to them), or move it to another plane. Later features regenerate.',
  inputSchema: { sketch: z.string(), entities: z.array(EntitySchema).optional(), constraints: z.array(ConstraintSchema).optional(), append: z.boolean().optional().describe('Add to the existing entities/constraints instead of replacing'), plane: Ref.optional() },
}, wrap(({ sketch, entities, constraints, append, plane }) => {
  const f = findFeature(sketch); if (f.type !== 'sketch') throw new Error(`${f.name} is not a sketch`);
  checkpoint();
  if (plane != null) { f.params.plane = normRefs(plane, K.FEATURES.sketch.fields[0], ctxBefore(S.doc.features.indexOf(f))); delete f.params.__sel; delete f.params.__selres; if (isStableSelector(plane)) { f.params.__sel = { plane }; f.params.__selres = { plane: JSON.stringify(f.params.plane) }; } }
  if (entities || constraints) {
    if (append && !f.params.spec) throw new Error('This sketch was drawn in the web app; replace it instead of appending.');
    const old = f.params.spec || { entities: [], constraints: [] };
    const spec = append ? { ...old, entities: [...old.entities, ...(entities || [])], constraints: [...old.constraints, ...(constraints || [])] } : { ...old, entities: entities ?? old.entities, constraints: constraints ?? (entities ? [] : old.constraints) };
    f.params.data = buildSketch(spec); f.params.spec = spec;
  }
  regen();
  return ok({ ...sketchReport(f), downstream_errors: S.doc.features.filter((q) => q._error).map((q) => `${q.name}: ${q._error}`) });
}));

server.registerTool('add_feature', {
  title: 'Add feature',
  description: `Add a modeling feature. Types: extrude, revolve, sweep, loft, fillet, chamfer, shell, hole, plane, lpattern, cpattern, mirror, boolean, split, transform, deletePart, primitive, variable. Call describe_features for parameters.
Examples: {"type":"extrude","params":{"entities":{"sketch":"Sketch 1"},"depth":"20"}}; {"type":"extrude","params":{"entities":{"sketch":"Sketch 2","region":0},"op":"remove","endType":"through"}}; {"type":"fillet","params":{"edges":{"parallel_to":"z"},"radius":"4"}}; {"type":"hole","params":{"sketch":"Sketch 3","style":"cbore"}}; {"type":"cpattern","params":{"mode":"feature","features":"Extrude 2","count":"6","axisSel":"Z"}}.
A failing feature is not added (its error is returned) unless keep_on_error is true.`,
  inputSchema: { type: z.string(), params: z.record(z.string(), z.any()).optional(), name: z.string().optional(), before: z.string().optional().describe('Insert before this feature (default: end of history)'), keep_on_error: z.boolean().optional() },
}, wrap((args) => {
  if (args.type === 'sketch') throw new Error('Use create_sketch for sketches');
  const f = addFeature(args);
  return ok({ id: f.id, name: f.name, ...(f._warn ? { warning: f._warn } : {}), parts: S.ctx.parts.map(partInfo) });
}));

server.registerTool('update_feature', {
  title: 'Update feature', description: 'Change parameters (only the ones given), rename, or suppress/unsuppress a feature. Everything after it regenerates.',
  inputSchema: { feature: z.string(), params: z.record(z.string(), z.any()).optional(), name: z.string().optional(), suppressed: z.boolean().optional() },
}, wrap(({ feature, params, name, suppressed }) => {
  const f = findFeature(feature); checkpoint();
  if (params) { if (f.type === 'sketch') throw new Error('Use update_sketch for sketches'); f.params = coerceParams(f.type, params, ctxBefore(S.doc.features.indexOf(f)), f.params); }
  if (name) f.name = name; if (suppressed != null) f.suppressed = suppressed;
  regen();
  return ok({ feature: featureLine(f, S.doc.features.indexOf(f)), errors: S.doc.features.filter((q) => q._error).map((q) => `${q.name}: ${q._error}`), parts: S.ctx.parts.map(partInfo) });
}));

server.registerTool('delete_feature', { title: 'Delete feature', description: 'Delete a feature (undo restores it).', inputSchema: { feature: z.string() }, annotations: { destructiveHint: true } },
  wrap(({ feature }) => {
    const f = findFeature(feature); checkpoint(); const i = S.doc.features.indexOf(f); S.doc.features.splice(i, 1);
    if (S.doc.rollback != null && i < S.doc.rollback) S.doc.rollback--; regen();
    return ok({ deleted: f.name, errors: S.doc.features.filter((q) => q._error).map((q) => `${q.name}: ${q._error}`) });
  }));

server.registerTool('set_rollback', { title: 'Roll back history', description: 'Evaluate history only up to and including a feature (null = all features). New features are inserted at the rollback point.', inputSchema: { after: z.string().nullable().describe('Feature to roll back to, or null for the end') } },
  wrap(({ after }) => { checkpoint(); S.doc.rollback = after == null ? null : S.doc.features.indexOf(findFeature(after)) + 1; if (S.doc.rollback >= S.doc.features.length) S.doc.rollback = null; regen(); return ok(summary()); }));

server.registerTool('undo', { title: 'Undo', description: 'Undo the last change to the document.', inputSchema: {} },
  wrap(() => { if (!S.undo.length) throw new Error('Nothing to undo'); loadDoc(JSON.parse(S.undo.pop())); return ok(summary()); }));

server.registerTool('get_feature', { title: 'Get feature', description: 'Full parameters of one feature; for sketches, the solved entities, degrees of freedom and regions.', inputSchema: { feature: z.string() }, annotations: { readOnlyHint: true } },
  wrap(({ feature }) => { const f = findFeature(feature); const base = featureLine(f, S.doc.features.indexOf(f)); if (f.type === 'sketch') return ok({ ...base, ...sketchReport(f), spec: f.params.spec }); const { __sel, __selres, ...stored } = f.params; return ok({ ...base, stored_params: stored, ...(__sel ? { live_selectors: __sel } : {}) }); }));

server.registerTool('list_topology', {
  title: 'List faces and edges', description: 'Faces and edges of parts with ids ("face:<part>:<n>", "edge:<part>:<n>") usable as references until the model changes.',
  inputSchema: { part: z.string().optional(), include: z.enum(['faces', 'edges', 'both']).optional(), limit: z.number().optional().describe('Max items of each kind (default 150)') }, annotations: { readOnlyHint: true },
}, wrap(({ part, include = 'both', limit = 150 }) => {
  const parts = part ? [findPart(part)] : S.ctx.parts; const out = {};
  for (const p of parts) {
    const an = K.analyze(p.solid); const e = {};
    if (include !== 'edges') e.faces = [...an.faces.values()].slice(0, limit).map((f) => ({ id: `face:${p.id}:${f.id}`, planar: f.planar, normal: f.planar ? r3a(f.normal) : undefined, area: r3(f.area), centroid: r3a(f.centroid) }));
    if (include !== 'faces') e.edges = an.edges.slice(0, limit).map((ed, i) => ({ id: `edge:${p.id}:${i}`, straight: ed.straight, closed: ed.closed, length: r3(ed.length), from: r3a(ed.pts[0]), to: r3a(ed.pts[ed.pts.length - 1]), faces: ed.faces.map((x) => `face:${p.id}:${x}`) }));
    out[`${partProps(p.id).name} (${p.id})`] = e;
  }
  return ok(out);
}));

server.registerTool('measure', {
  title: 'Measure', description: 'Distance (and angle, where defined) between two items: points [x,y,z], face or edge references, or part names.',
  inputSchema: { a: Ref, b: Ref }, annotations: { readOnlyHint: true },
}, wrap(({ a, b }) => {
  const sample = (spec) => {
    if (Array.isArray(spec) && spec.length === 3 && spec.every(Number.isFinite)) return { pts: [new V3(...spec)] };
    try { const r = resolveFaceSpec(typeof spec === 'object' && spec.face != null ? spec.face : spec); const s = r.part.solid; const pts = []; for (const t of r.face.tris) for (let k = 0; k < 3; k++) pts.push(s.vert(s.idx[t * 3 + k])); return { pts, face: r.face }; } catch { /* not a face */ }
    try { const refs = resolveEdgeSpecs(typeof spec === 'object' && spec.edge != null ? spec.edge : spec); const { edge } = K.resolveEdge(S.ctx, refs[0]); return { pts: edge.pts, edge }; } catch { /* not an edge */ }
    const p = findPart(typeof spec === 'object' ? spec.part : spec); const pts = []; for (let i = 0; i < p.solid.nv; i++) pts.push(p.solid.vert(i)); return { pts };
  };
  const A = sample(a), B = sample(b); let md = Infinity, pa, pb;
  for (const p of A.pts) for (const q of B.pts) { const d = p.distanceTo(q); if (d < md) { md = d; pa = p; pb = q; } }
  const out = { minimum_distance: r3(md), closest_points: [r3a(pa), r3a(pb)], delta: r3a(pb.clone().sub(pa)) };
  if (A.face?.planar && B.face?.planar) { out.angle_deg = r3(Math.acos(Math.max(-1, Math.min(1, A.face.normal.dot(B.face.normal)))) / K.DEG); if (Math.abs(A.face.normal.dot(B.face.normal)) > 0.99999) out.plane_distance = r3(Math.abs(A.face.d - A.face.normal.dot(B.face.centroid))); }
  if (A.edge?.straight && B.edge?.straight) { const u = A.edge.pts.at(-1).clone().sub(A.edge.pts[0]).normalize(), w = B.edge.pts.at(-1).clone().sub(B.edge.pts[0]).normalize(); out.angle_deg = r3(Math.acos(Math.min(1, Math.abs(u.dot(w)))) / K.DEG); }
  if (A.face) out.a_area = r3(A.face.area); if (A.edge) out.a_length = r3(A.edge.length); if (B.face) out.b_area = r3(B.face.area); if (B.edge) out.b_length = r3(B.edge.length);
  return ok(out);
}));

server.registerTool('mass_properties', { title: 'Mass properties', description: 'Volume, surface area, mass (from each part\'s material), center of mass and bounding box.', inputSchema: { parts: z.array(z.string()).optional() }, annotations: { readOnlyHint: true } },
  wrap(({ parts }) => {
    const list = parts ? parts.map(findPart) : S.ctx.parts.filter((p) => !partProps(p.id).hidden); const infos = list.map(partInfo);
    const M = infos.reduce((a, p) => a + p.mass_g, 0); const C = new V3(); infos.forEach((p) => C.addScaledVector(new V3(...p.center_of_mass), p.mass_g)); if (M) C.divideScalar(M);
    const bb = new THREE.Box3(); list.forEach((p) => bb.union(p.solid.bbox()));
    return ok({ parts: infos, total: { volume_mm3: r3(infos.reduce((a, p) => a + p.volume_mm3, 0)), mass_g: r3(M), center_of_mass: r3a(C), size: bb.isEmpty() ? null : r3a(bb.getSize(new V3())) }, materials: Object.fromEntries(Object.entries(MATERIALS).map(([k, [n, d]]) => [k, `${n}, ${d} g/cm³`])) });
  }));

server.registerTool('set_part', { title: 'Set part properties', description: 'Rename a part or set its colour (#rrggbb), material or visibility.', inputSchema: { part: z.string(), name: z.string().optional(), color: z.string().optional(), material: z.enum(Object.keys(MATERIALS)).optional(), hidden: z.boolean().optional() } },
  wrap(({ part, name, color, material, hidden }) => {
    const p = findPart(part); checkpoint(); const pr = partProps(p.id);
    if (name) pr.name = name; if (color) { if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Colour must look like #3f6e9c'); pr.color = color; } if (material) pr.material = material; if (hidden != null) pr.hidden = hidden;
    return ok(partInfo(p));
  }));

server.registerTool('render_view', {
  title: 'Render view', description: 'Render the model to a PNG so you can see it (shaded, with edges). Optionally save the image to a file.',
  inputSchema: { view: z.enum(Object.keys(VIEWS)).optional().describe('Default iso'), direction: z.array(z.number()).optional().describe('Custom view direction [x,y,z] pointing from the model toward the camera'), width: z.number().optional(), height: z.number().optional(), parts: z.array(z.string()).optional(), show_edges: z.boolean().optional(), dark: z.boolean().optional(), save_path: z.string().optional() },
  annotations: { readOnlyHint: true },
}, wrap(({ view, direction, width, height, parts, show_edges, dark, save_path }) => {
  const list = parts ? parts.map(findPart) : S.ctx.parts.filter((p) => !partProps(p.id).hidden);
  if (!list.length) throw new Error('There are no visible parts to render');
  const png = renderPNG(list.map((p) => ({ solid: p.solid, color: partProps(p.id).color })), { view, direction, width, height, edges: show_edges, dark });
  let note = `${list.length} part(s), view ${direction ? JSON.stringify(direction) : view || 'iso'}.`;
  if (save_path) { const p = resolve(save_path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, png); note += ` Saved ${p}.`; }
  return ok(note, [{ type: 'image', data: png.toString('base64'), mimeType: 'image/png' }]);
}));

server.registerTool('export_model', {
  title: 'Export model',
  description: `Write the visible parts (or the listed parts) to a file. Formats: ${K.EXPORT_FORMATS.map((f) => `${f.id} (${f.label}: ${f.note})`).join('; ')}. OBJ also writes a .mtl next to it.`,
  inputSchema: { format: z.enum(K.EXPORT_FORMATS.map((f) => f.id)), path: z.string().describe('Output file path, or a directory'), parts: z.array(z.string()).optional() },
}, wrap(async ({ format, path, parts }) => {
  const list = parts ? parts.map(findPart) : S.ctx.parts.filter((p) => !partProps(p.id).hidden);
  const fmt = K.EXPORT_FORMATS.find((f) => f.id === format);
  let target = resolve(path); let dir = target, base;
  if (existsSync(target) && statSync(target).isDirectory()) base = S.doc.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'part';
  else { dir = dirname(target); base = basename(target).replace(new RegExp(`\\.${fmt.ext}$`, 'i'), '').replace(/\.(stl|obj)$/i, ''); }
  mkdirSync(dir, { recursive: true });
  const files = K.exportModel(format, list.map((p) => ({ name: partProps(p.id).name, color: partProps(p.id).color, solid: p.solid })), base);
  const written = [];
  for (const f of files) {
    const data = f.zip ? Buffer.from(await K.makeZip(f.zip).arrayBuffer()) : typeof f.data === 'string' ? f.data : Buffer.from(f.data);
    const p = join(dir, f.name); writeFileSync(p, data); written.push(`${p} (${statSync(p).size} bytes)`);
  }
  return ok(`Wrote ${fmt.label}, ${list.length} part(s):\n${written.join('\n')}`);
}));

server.registerTool('list_formats', { title: 'List export formats', description: 'Export formats with units and conventions.', inputSchema: {}, annotations: { readOnlyHint: true } },
  wrap(() => ok(K.EXPORT_FORMATS.map((f) => ({ id: f.id, name: f.label, extension: f.ext, notes: f.note })))));

await server.connect(new StdioServerTransport());
console.error('Kerf CAD MCP server ready (stdio)');
