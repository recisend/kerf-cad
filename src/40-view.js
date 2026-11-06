/* =====================================================================
   Viewport: rendering, camera, picking, highlights, view cube, section
   ===================================================================== */
const View = {
  lineMats: new Set(),
  partViews: new Map(),
  planeViews: [],
  sketchViews: new Map(),
  overlays: [],
  section: null,
  display: 'shadedEdges',
  needs: true,
  colors: {},
};

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888'; }
function readColors() {
  const c = View.colors;
  for (const k of ['edge', 'sel', 'hover', 'skUnder', 'skDef', 'skCons', 'plane', 'cap', 'region', 'preview', 'grid', 'axisX', 'axisY', 'axisZ', 'remove'])
    c[k] = new THREE.Color(cssVar('--vp-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())));
}
function lineMat(color, width = 1.25, opts = {}) {
  const m = new LineMaterial({ color, linewidth: width, worldUnits: false, ...opts });
  m.resolution.set(View.w || 800, View.h || 600);
  View.lineMats.add(m);
  return m;
}
function segGeom(arr) { const g = new LineSegmentsGeometry(); g.setPositions(arr instanceof Float32Array ? arr : new Float32Array(arr)); return g; }
function disposeObj(o) {
  o.traverse((q) => { if (q.geometry) q.geometry.dispose(); if (q.material) { const ms = Array.isArray(q.material) ? q.material : [q.material]; ms.forEach((m) => { View.lineMats.delete(m); m.dispose(); }); } });
}
function clearGroup(g) { for (const c of [...g.children]) { g.remove(c); disposeObj(c); } }

function initView(host) {
  View.host = host;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.localClippingEnabled = true;
  host.prepend(r.domElement);
  r.domElement.id = 'gl';
  View.renderer = r;
  const scene = (View.scene = new THREE.Scene());
  const cam = (View.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e5, 1e5));
  cam.up.set(0, 0, 1); cam.position.set(200, -260, 180); cam.zoom = 1;
  View.persp = new THREE.PerspectiveCamera(35, 1, 0.5, 1e5); View.persp.up.set(0, 0, 1);
  View.camera = cam; View.viewH = 220;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a93a3, 1.25));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(0.4, -0.3, 1); cam.add(dl); scene.add(cam);
  View.persp.add(dl.clone()); scene.add(View.persp);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.5); dl2.position.set(-1, 1, -0.4); scene.add(dl2);
  View.groups = {};
  for (const k of ['grid', 'planes', 'parts', 'sketches', 'preview', 'hl', 'active', 'origin']) { const g = new THREE.Group(); g.name = k; scene.add(g); View.groups[k] = g; }
  readColors();
  buildOrigin();
  const ctl = (View.controls = new OrbitControls(cam, r.domElement));
  ctl.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  ctl.enableDamping = false; ctl.zoomToCursor = true; ctl.rotateSpeed = 0.9; ctl.screenSpacePanning = true;
  ctl.addEventListener('change', () => { View.needs = true; });
  ctl.target.set(0, 0, 0);
  const ro = new ResizeObserver(resizeView); ro.observe(host);
  resizeView();
  buildViewCube();
  const loop = () => { requestAnimationFrame(loop); tickAnim(); if (View.needs) { View.needs = false; renderNow(); } };
  loop();
}
function resizeView() {
  const r = View.host.getBoundingClientRect(); const w = Math.max(10, r.width), h = Math.max(10, r.height);
  View.w = w; View.h = h;
  View.renderer.setSize(w, h, false);
  View.renderer.domElement.style.width = w + 'px'; View.renderer.domElement.style.height = h + 'px';
  updateFrustum();
  for (const m of View.lineMats) m.resolution.set(w, h);
  View.needs = true;
}
function updateFrustum() {
  const a = View.w / View.h, H = View.viewH;
  const c = View.ortho; c.left = (-H * a) / 2; c.right = (H * a) / 2; c.top = H / 2; c.bottom = -H / 2; c.updateProjectionMatrix();
  View.persp.aspect = a; View.persp.updateProjectionMatrix();
}
function renderNow() {
  const cam = View.camera;
  cam.updateMatrixWorld();
  View.renderer.render(View.scene, cam);
  updateOverlays();
  updateViewCube();
}
function requestRender() { View.needs = true; }

/* ---------- camera animation ---------- */
let anim = null;
function animateCamera(pos, target, zoom) {
  const cam = View.camera; const ctl = View.controls;
  anim = { t0: performance.now(), dur: 380, p0: cam.position.clone(), p1: pos, q0: ctl.target.clone(), q1: target, z0: cam.zoom, z1: zoom ?? cam.zoom };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) anim.dur = 1;
}
function tickAnim() {
  if (!anim) return;
  const t = Math.min(1, (performance.now() - anim.t0) / anim.dur); const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const cam = View.camera; const ctl = View.controls;
  ctl.target.lerpVectors(anim.q0, anim.q1, e);
  // spherical interpolation around target for nicer turns
  const d0 = anim.p0.clone().sub(anim.q0), d1 = anim.p1.clone().sub(anim.q1);
  const l = THREE.MathUtils.lerp(d0.length(), d1.length(), e);
  const dir = d0.clone().normalize().lerp(d1.clone().normalize(), e);
  if (dir.lengthSq() < 1e-6) dir.copy(d1).normalize();
  cam.position.copy(ctl.target).addScaledVector(dir.normalize(), l);
  if (cam.isOrthographicCamera) { cam.zoom = THREE.MathUtils.lerp(anim.z0, anim.z1, e); cam.updateProjectionMatrix(); }
  ctl.update();
  View.needs = true;
  if (t >= 1) anim = null;
}
function sceneBox() {
  const b = new THREE.Box3();
  for (const pv of View.partViews.values()) if (pv.mesh.visible) b.union(pv.solid.bbox());
  for (const sv of View.sketchViews.values()) if (sv.group.visible && sv.box && !sv.box.isEmpty()) b.union(sv.box);
  if (b.isEmpty()) b.set(new V3(-50, -50, -10), new V3(50, 50, 10));
  return b;
}
function fitView(dir = null, up = null, box = sceneBox()) {
  const cam = View.camera; const c = box.getCenter(new V3()); const size = box.getSize(new V3()).length() || 100;
  const d = dir ? dir.clone().normalize() : cam.position.clone().sub(View.controls.target).normalize();
  // avoid gimbal at exact top/bottom
  if (Math.abs(d.z) > 0.9999) { d.y = d.z > 0 ? -1e-4 : 1e-4; d.normalize(); if (up && up.y < 0) d.y = -d.y; }
  const dist = cam.isPerspectiveCamera ? size / (2 * Math.tan((cam.fov * DEG) / 2)) * 1.15 : size * 2;
  const zoom = cam.isOrthographicCamera ? View.viewH / (size * 1.25) : 1;
  animateCamera(c.clone().addScaledVector(d, dist), c, zoom);
}
const NAMED_VIEWS = {
  top: [0, 0, 1], bottom: [0, 0, -1], front: [0, -1, 0], back: [0, 1, 0], right: [1, 0, 0], left: [-1, 0, 0], iso: [1, -1, 0.85],
};
function setNamedView(name) { fitView(v3(NAMED_VIEWS[name])); }
function viewNormalTo(pl) {
  const box = sceneBox(); const d = pl.n.clone();
  const c = View.controls.target.clone(); const toPl = pl.n.dot(c.clone().sub(pl.o));
  const tgt = c.addScaledVector(pl.n, -toPl);
  const size = box.getSize(new V3()).length() || 100;
  const cam = View.camera;
  if (Math.abs(d.z) > 0.9999) { d.y = d.z > 0 ? -1e-4 : 1e-4; d.normalize(); }
  animateCamera(tgt.clone().addScaledVector(d, cam.isPerspectiveCamera ? size * 1.6 : size * 2), tgt, cam.zoom);
}
function setProjection(persp) {
  const old = View.camera, nu = persp ? View.persp : View.ortho;
  if (old === nu) return;
  const t = View.controls.target; const dir = old.position.clone().sub(t).normalize();
  const size = old.isOrthographicCamera ? View.viewH / old.zoom : old.position.distanceTo(t) * 2 * Math.tan((old.fov * DEG) / 2);
  if (persp) nu.position.copy(t).addScaledVector(dir, size / (2 * Math.tan((nu.fov * DEG) / 2)));
  else { nu.position.copy(t).addScaledVector(dir, size * 2); nu.zoom = View.viewH / size; nu.updateProjectionMatrix(); }
  View.camera = nu; View.controls.object = nu; View.controls.update(); View.needs = true;
}

/* ---------- origin + grid ---------- */
function buildOrigin() {
  const g = View.groups.origin; clearGroup(g);
  const L = 12; const c = View.colors;
  const mk = (to, col) => new LineSegments2(segGeom([0, 0, 0, ...to]), lineMat(col, 2));
  g.add(mk([L, 0, 0], c.axisX), mk([0, L, 0], c.axisY), mk([0, 0, L], c.axisZ));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: c.edge }));
  g.add(dot);
}

/* ---------- parts ---------- */
function partMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.08, roughness: 0.62, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...opts });
}
function syncParts(ctx, props, hiddenSet) {
  const g = View.groups.parts; const seen = new Set();
  for (const p of ctx.parts) {
    seen.add(p.id);
    const pr = props(p.id);
    let pv = View.partViews.get(p.id);
    if (!pv || pv.solid !== p.solid) {
      if (pv) { g.remove(pv.group); disposeObj(pv.group); }
      const rd = renderData(p.solid);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(rd.pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(rd.nor, 3));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, partMaterial(pr.color));
      const cap = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: View.colors.cap, side: THREE.BackSide }));
      cap.visible = false;
      const edges = new LineSegments2(segGeom(rd.lines), lineMat(View.colors.edge, 1.25));
      const group = new THREE.Group(); group.add(mesh, cap, edges);
      mesh.userData.partId = p.id;
      pv = { id: p.id, solid: p.solid, mesh, cap, edges, group };
      View.partViews.set(p.id, pv); g.add(group);
    }
    pv.color = pr.color;
    pv.mesh.material.color.set(pr.color);
    pv.group.visible = !hiddenSet.has(p.id);
    applyDisplay(pv);
  }
  for (const [id, pv] of View.partViews) if (!seen.has(id)) { g.remove(pv.group); disposeObj(pv.group); View.partViews.delete(id); }
  applySection();
  View.needs = true;
}
function applyDisplay(pv) {
  const m = pv.mesh.material, d = View.display;
  m.transparent = d === 'xray'; m.opacity = d === 'xray' ? 0.28 : 1; m.depthWrite = d !== 'xray';
  pv.mesh.visible = d !== 'wire';
  pv.edges.visible = d !== 'shaded';
  if (d === 'hidden') { m.color.set(cssVar('--vp-hidden-fill')); m.emissive.set(cssVar('--vp-hidden-fill')); m.emissiveIntensity = 0.9; }
  else { m.color.set(pv.color); m.emissive.set(0x000000); }
  pv.edges.material.color.set(View.colors.edge);
  m.needsUpdate = true;
}
function setDisplay(mode) { View.display = mode; for (const pv of View.partViews.values()) applyDisplay(pv); View.needs = true; }

/* ---------- section view ---------- */
function setSection(s) { View.section = s; applySection(); const cp = clipPlanes(); View.groups.hl.traverse((o) => { if (o.material) { o.material.clippingPlanes = cp; o.material.needsUpdate = true; } }); }
function applySection() {
  const s = View.section; let planes = [];
  if (s) {
    const n = s.axis === 'x' ? new V3(1, 0, 0) : s.axis === 'y' ? new V3(0, 1, 0) : new V3(0, 0, 1);
    if (s.flip) n.negate();
    planes = [new THREE.Plane(n.clone().negate(), s.offset * (s.flip ? -1 : 1))];
  }
  for (const pv of View.partViews.values()) {
    pv.mesh.material.clippingPlanes = planes; pv.cap.material.clippingPlanes = planes; pv.edges.material.clippingPlanes = planes;
    pv.cap.visible = !!s && View.display !== 'wire'; pv.cap.material.color.set(View.colors.cap);
    pv.mesh.material.needsUpdate = true; pv.cap.material.needsUpdate = true; pv.edges.material.needsUpdate = true;
  }
  View.needs = true;
}

/* ---------- planes ---------- */
function syncPlanes(ctx, visible) {
  const g = View.groups.planes; clearGroup(g); View.planeViews = [];
  const box = new THREE.Box3(); for (const p of ctx.parts) box.union(p.solid.bbox());
  const S = box.isEmpty() ? 50 : Math.max(40, box.getSize(new V3()).length() * 0.45);
  for (const pl of Object.values(ctx.planes)) {
    if (!visible(pl.id)) continue;
    const half = S / 2;
    const c = pl.custom ? pl.o.clone() : pl.o.clone().addScaledVector(pl.x, half * 0).addScaledVector(pl.y, 0);
    const corners = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([u, v]) => c.clone().addScaledVector(pl.x, u).addScaledVector(pl.y, v));
    const geo = new THREE.BufferGeometry().setFromPoints([corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]]);
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: View.colors.plane, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    fill.userData.planeId = pl.id;
    const lp = []; for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; lp.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const out = new LineSegments2(segGeom(lp), lineMat(View.colors.plane, 1, { transparent: true, opacity: 0.7 }));
    const grp = new THREE.Group(); grp.add(fill, out); g.add(grp);
    View.planeViews.push({ id: pl.id, name: pl.name, fill, out, corners, label: corners[3] });
  }
  View.needs = true;
}

/* ---------- sketches (inactive) ---------- */
function sketchSegments(sk) {
  const { P } = skIndex(sk.data); const solid = [], cons = [];
  for (const e of sk.data.ents) {
    if (e.type === 'point') continue;
    const pl = entPolyline(P, e);
    const arr = e.construction ? cons : solid;
    for (let i = 1; i < pl.length; i++) { const a = toWorld(sk.plane, pl[i - 1][0], pl[i - 1][1]), b = toWorld(sk.plane, pl[i][0], pl[i][1]); arr.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  }
  return { solid, cons };
}
function regionMesh(sk, r, color, opacity) {
  const T = r.tris; const pos = [];
  for (const [a, b, c] of T.tris) for (const i of [a, b, c]) { const w = toWorld(sk.plane, T.all[i][0], T.all[i][1], 0.002); pos.push(w.x, w.y, w.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}
function syncSketches(ctx, isVisible, showRegions) {
  const g = View.groups.sketches; clearGroup(g); View.sketchViews.clear();
  for (const sk of Object.values(ctx.sketches)) {
    const vis = isVisible(sk.id);
    const grp = new THREE.Group(); grp.visible = vis || showRegions;
    const { solid, cons } = sketchSegments(sk);
    const lines = new LineSegments2(segGeom(solid.length ? solid : [0, 0, 0, 0, 0, 0]), lineMat(View.colors.skDef, 1.6)); lines.visible = solid.length > 0 && vis;
    const cl = new LineSegments2(segGeom(cons.length ? cons : [0, 0, 0, 0, 0, 0]), lineMat(View.colors.skCons, 1, { dashed: true, dashSize: 2, gapSize: 1.5 }));
    cl.computeLineDistances(); cl.visible = cons.length > 0 && vis;
    grp.add(lines, cl);
    const regions = sk.regions.map((r, i) => { const m = regionMesh(sk, r, View.colors.region, showRegions ? 0.16 : 0.0); m.userData = { sketch: sk.id, region: i }; m.visible = showRegions; grp.add(m); return m; });
    const { P } = skIndex(sk.data);
    const ptsW = sk.data.ents.filter((e) => e.type === 'point').map((e) => { const p = P.get(e.p); return toWorld(sk.plane, p.x, p.y); });
    if (ptsW.length && vis) {
      const pg = new THREE.BufferGeometry().setFromPoints(ptsW);
      grp.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: View.colors.skDef, size: 6, sizeAttenuation: false })));
    }
    const box = new THREE.Box3(); for (let i = 0; i < solid.length; i += 3) box.expandByPoint(new V3(solid[i], solid[i + 1], solid[i + 2]));
    g.add(grp);
    View.sketchViews.set(sk.id, { sk, group: grp, lines, regions, box, polys: buildSketchPolys(sk) });
  }
  View.needs = true;
}
function buildSketchPolys(sk) {
  const { P } = skIndex(sk.data);
  return sk.data.ents.filter((e) => e.type !== 'point').map((e) => ({ ent: e, pts: entPolyline(P, e).map((q) => toWorld(sk.plane, q[0], q[1])) }));
}

/* ---------- screen helpers ---------- */
function toScreen(p) {
  const v = p.clone().project(View.camera);
  return { x: ((v.x + 1) / 2) * View.w, y: ((1 - v.y) / 2) * View.h, z: v.z };
}
function distToSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y; const l = dx * dx + dy * dy;
  let t = l ? ((px - a.x) * dx + (py - a.y) * dy) / l : 0; t = clamp(t, 0, 1);
  return { d: Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t)), t, z: a.z + (b.z - a.z) * t };
}
function rayFrom(x, y) {
  const rc = new THREE.Raycaster(); rc.setFromCamera(new V2((x / View.w) * 2 - 1, -(y / View.h) * 2 + 1), View.camera);
  return rc;
}
function sectionClips(p) {
  const s = View.section; if (!s) return false;
  const n = s.axis === 'x' ? new V3(1, 0, 0) : s.axis === 'y' ? new V3(0, 1, 0) : new V3(0, 0, 1);
  const v = p.dot(n) - s.offset; return s.flip ? v < 0 : v > 0;
}

/* pick: returns best hit among allowed kinds */
function pickAt(x, y, kinds) {
  const K = new Set(kinds);
  const rc = rayFrom(x, y);
  const hits = [];
  // part faces
  const meshes = [...View.partViews.values()].filter((pv) => pv.group.visible && pv.mesh.visible).map((pv) => pv.mesh);
  let faceHit = null;
  for (const h of rc.intersectObjects(meshes, false)) { if (sectionClips(h.point)) continue; faceHit = h; break; }
  const faceDepth = faceHit ? toScreen(faceHit.point).z : 1;
  const visibleDepth = (z) => z <= faceDepth + 2e-4;
  if (faceHit) {
    const pv = View.partViews.get(faceHit.object.userData.partId);
    const fid = pv.solid.fid[faceHit.faceIndex];
    if (K.has('face')) { const f = analyze(pv.solid).faces.get(fid); hits.push({ pri: 1, ref: { kind: 'face', part: pv.id, n: arr3(f.normal), p: arr3(faceHit.point) }, faceId: fid }); }
    if (K.has('part')) hits.push({ pri: 0.9, ref: { kind: 'part', id: pv.id } });
  }
  // edges & vertices
  if (K.has('edge') || K.has('vertex')) {
    let be = null, bd = 7, bv = null, bvd = 9;
    for (const pv of View.partViews.values()) {
      if (!pv.group.visible) continue;
      const an = analyze(pv.solid);
      if (K.has('vertex')) for (const c of an.corners) { const s = toScreen(c.p); const d = Math.hypot(s.x - x, s.y - y); if (d < bvd && visibleDepth(s.z) && !sectionClips(c.p)) { bvd = d; bv = { pv, c }; } }
      if (K.has('edge')) for (const e of an.edges) {
        let sp = toScreen(e.pts[0]);
        for (let i = 1; i < e.pts.length; i++) {
          const sq = toScreen(e.pts[i]); const r = distToSeg(x, y, sp, sq);
          if (r.d < bd && visibleDepth(r.z) && !sectionClips(e.pts[i])) { bd = r.d; be = { pv, e }; }
          sp = sq;
        }
      }
    }
    if (bv) hits.push({ pri: 4, ref: { kind: 'vertex', part: bv.pv.id, p: arr3(bv.c.p) } });
    if (be) { const a = be.e.pts[0], b = be.e.pts[be.e.pts.length - 1]; hits.push({ pri: 3, ref: { kind: 'edge', part: be.pv.id, a: arr3(a), b: arr3(be.e.closed ? be.e.pts[Math.floor(be.e.pts.length / 2)] : b) }, edge: be.e }); }
  }
  // sketch regions
  if (K.has('region')) {
    const rm = []; for (const sv of View.sketchViews.values()) rm.push(...sv.regions);
    const h = rc.intersectObjects(rm, false)[0];
    if (h && visibleDepth(toScreen(h.point).z)) {
      const sv = View.sketchViews.get(h.object.userData.sketch); const r = sv.sk.regions[h.object.userData.region];
      hits.push({ pri: 2.5, ref: { kind: 'region', sketch: sv.sk.id, pt: r.sample.slice() } });
    }
  }
  // sketch entities
  if (K.has('sketch') || K.has('sketchLine')) {
    let best = null, bd = 7;
    for (const sv of View.sketchViews.values()) {
      if (!sv.group.visible) continue;
      for (const pp of sv.polys) {
        if (K.has('sketchLine') && !K.has('sketch') && pp.ent.type !== 'line') continue;
        let sp = toScreen(pp.pts[0]);
        for (let i = 1; i < pp.pts.length; i++) { const sq = toScreen(pp.pts[i]); const r = distToSeg(x, y, sp, sq); if (r.d < bd) { bd = r.d; best = { sv, pp }; } sp = sq; }
      }
    }
    if (best) {
      if (K.has('sketchLine') && best.pp.ent.type === 'line') hits.push({ pri: 3.5, ref: { kind: 'sketchEnt', sketch: best.sv.sk.id, ent: best.pp.ent.id } });
      else if (K.has('sketch')) hits.push({ pri: 3.5, ref: { kind: 'sketch', id: best.sv.sk.id } });
    }
  }
  // planes
  if (K.has('plane')) {
    const h = rc.intersectObjects(View.planeViews.map((p) => p.fill), false)[0];
    if (h && visibleDepth(toScreen(h.point).z)) hits.push({ pri: 0.5, ref: { kind: 'plane', id: h.object.userData.planeId } });
  }
  hits.sort((a, b) => b.pri - a.pri);
  return hits[0] || null;
}

/* ---------- highlight ---------- */
function refObjects(ctx, ref, color, strong) {
  const out = [];
  try {
    if (ref.kind === 'face') {
      const { part, face } = resolveFace(ctx, ref); const s = part.solid; const pos = [];
      for (const t of face.tris) for (let k = 0; k < 3; k++) { const v = s.idx[t * 3 + k]; pos.push(s.pos[v * 3], s.pos[v * 3 + 1], s.pos[v * 3 + 2]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.push(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: strong ? 0.55 : 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide })));
    } else if (ref.kind === 'edge') {
      const { edge } = resolveEdge(ctx, ref); const arr = [];
      for (let i = 1; i < edge.pts.length; i++) arr.push(...arr3(edge.pts[i - 1]), ...arr3(edge.pts[i]));
      out.push(new LineSegments2(segGeom(arr), lineMat(color, strong ? 4 : 3.2, { depthTest: false, transparent: true })));
    } else if (ref.kind === 'vertex') {
      const g = new THREE.BufferGeometry().setFromPoints([v3(ref.p)]);
      out.push(new THREE.Points(g, new THREE.PointsMaterial({ color, size: 11, sizeAttenuation: false, depthTest: false })));
    } else if (ref.kind === 'part') {
      const pv = View.partViews.get(ref.id); if (pv) out.push(new THREE.Mesh(pv.mesh.geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: strong ? 0.4 : 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
    } else if (ref.kind === 'region') {
      const sk = ctx.sketches[ref.sketch]; const { region } = resolveRegion(ctx, ref);
      out.push(regionMesh(sk, region, color, strong ? 0.5 : 0.35));
    } else if (ref.kind === 'plane') {
      const pv = View.planeViews.find((p) => p.id === ref.id);
      if (pv) { const m = new THREE.Mesh(pv.fill.geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); out.push(m); }
    } else if (ref.kind === 'sketch' || ref.kind === 'sketchEnt') {
      const sv = View.sketchViews.get(ref.kind === 'sketch' ? ref.id : ref.sketch); const arr = [];
      if (sv) for (const pp of sv.polys) { if (ref.kind === 'sketchEnt' && pp.ent.id !== ref.ent) continue; for (let i = 1; i < pp.pts.length; i++) arr.push(...arr3(pp.pts[i - 1]), ...arr3(pp.pts[i])); }
      if (arr.length) out.push(new LineSegments2(segGeom(arr), lineMat(color, 3.2, { depthTest: false, transparent: true })));
    }
  } catch { /* stale reference */ }
  return out;
}
function clipPlanes() {
  const s = View.section; if (!s) return [];
  const n = s.axis === 'x' ? new V3(1, 0, 0) : s.axis === 'y' ? new V3(0, 1, 0) : new V3(0, 0, 1);
  if (s.flip) n.negate();
  return [new THREE.Plane(n.clone().negate(), s.offset * (s.flip ? -1 : 1))];
}
function setHighlights(ctx, selected, hover) {
  const g = View.groups.hl; clearGroup(g);
  for (const r of selected) for (const o of refObjects(ctx, r, View.colors.sel, true)) { o.renderOrder = 5; g.add(o); }
  if (hover) for (const o of refObjects(ctx, hover, View.colors.hover, false)) { o.renderOrder = 6; g.add(o); }
  const cp = clipPlanes();
  g.traverse((o) => { if (o.material) o.material.clippingPlanes = cp; });
  View.needs = true;
}

/* ---------- preview (tool bodies while editing) ---------- */
function setPreviewSolids(list) {
  const g = View.groups.preview; clearGroup(g);
  for (const { solid, color } of list) {
    if (!solid || !solid.nt) continue;
    const rd = renderData(solid); const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(rd.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(rd.nor, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false })));
    g.add(new LineSegments2(segGeom(rd.lines), lineMat(color, 1, { transparent: true, opacity: 0.8 })));
  }
  View.needs = true;
}

/* ---------- HTML overlays (labels) ---------- */
function updateOverlays() {
  const host = $('#labels'); if (!host) return;
  for (const o of View.overlays) {
    if (!o.el.isConnected) host.append(o.el);
    const p = o.pos(); if (!p) { o.el.hidden = true; continue; }
    const s = toScreen(p);
    const off = s.z > 1 || s.z < -1 || s.x < -50 || s.y < -50 || s.x > View.w + 50 || s.y > View.h + 50;
    o.el.hidden = off;
    o.el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
  }
}
function setOverlays(group, list) {
  View.overlays = View.overlays.filter((o) => { if (o.group === group) { o.el.remove(); return false; } return true; });
  for (const o of list) { o.group = group; View.overlays.push(o); }
  View.needs = true;
}

/* ---------- view cube ---------- */
function buildViewCube() {
  const host = $('#viewcube'); const cube = el('div', { class: 'vc-cube' });
  const H = 34;
  const faces = [
    ['Top', [0, 0, 1], [1, 0, 0], [0, 1, 0], 'top'], ['Bottom', [0, 0, -1], [1, 0, 0], [0, -1, 0], 'bottom'],
    ['Front', [0, -1, 0], [1, 0, 0], [0, 0, 1], 'front'], ['Back', [0, 1, 0], [-1, 0, 0], [0, 0, 1], 'back'],
    ['Right', [1, 0, 0], [0, 1, 0], [0, 0, 1], 'right'], ['Left', [-1, 0, 0], [0, -1, 0], [0, 0, 1], 'left'],
  ];
  for (const [label, N, R, U, view] of faces) {
    const m = [R[0], R[1], R[2], 0, -U[0], -U[1], -U[2], 0, N[0], N[1], N[2], 0, N[0] * H, N[1] * H, N[2] * H, 1];
    const f = el('button', { class: 'vc-face', title: label + ' view', 'aria-label': label + ' view', onclick: () => setNamedView(view), style: { transform: `matrix3d(${m.join(',')})` } }, label.toUpperCase());
    cube.append(f);
  }
  host.append(cube); View.cube = cube;
}
function updateViewCube() {
  if (!View.cube) return;
  const R = new THREE.Matrix4().extractRotation(View.camera.matrixWorldInverse);
  const S = new THREE.Matrix4().makeScale(1, -1, 1);
  const M = S.multiply(R).multiply(new THREE.Matrix4().makeScale(1, 1, 1));
  View.cube.style.transform = `translateZ(-60px) matrix3d(${M.elements.map((v) => v.toFixed(6)).join(',')})`;
}

/* ---------- export snapshot ---------- */
function snapshotPNG() { renderNow(); return View.renderer.domElement.toDataURL('image/png'); }
