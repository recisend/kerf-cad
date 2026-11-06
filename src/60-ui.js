/* =====================================================================
   Application: document, regeneration, feature tree, dialogs,
   selection, measuring, export, persistence
   ===================================================================== */
const MATERIALS = [
  ['steel', 'Steel, mild', 7.85], ['stainless', 'Stainless steel 304', 8.0], ['aluminum', 'Aluminium 6061', 2.7], ['titanium', 'Titanium Ti-6Al-4V', 4.43],
  ['brass', 'Brass C360', 8.5], ['abs', 'ABS', 1.04], ['pla', 'PLA', 1.24], ['nylon', 'Nylon PA12', 1.01], ['oak', 'Oak', 0.75],
];
const PART_COLORS = ['#9aa7b4', '#c7a76a', '#7f9fb8', '#b98a7c', '#8fae8b', '#a596bf', '#c1b49a', '#7fb0ad'];

const App = {
  doc: null, snaps: [], ctx: null, sel: [], hover: null, dialog: null, undo: [], redo: [], dlReady: null,
};

/* ---------- document ---------- */
function newDoc(name = 'Untitled part studio') {
  return { v: 1, name, features: [], rollback: null, partProps: {}, vis: {}, counters: {} };
}
function rollIndex() { const d = App.doc; return d.rollback == null ? d.features.length : clamp(d.rollback, 0, d.features.length); }
function nextName(type) {
  const c = App.doc.counters; c[type] = (c[type] || 0) + 1;
  return `${FEATURES[type].label} ${c[type]}`;
}
function partProps(id) {
  const pp = App.doc.partProps;
  if (!pp[id]) {
    const n = Object.keys(pp).length;
    pp[id] = { name: `Part ${n + 1}`, color: PART_COLORS[n % PART_COLORS.length], material: 'aluminum', hidden: false };
  }
  return pp[id];
}
function snapshotDoc() { return JSON.stringify({ features: App.doc.features.map(stripFeature), rollback: App.doc.rollback, partProps: App.doc.partProps, vis: App.doc.vis, counters: App.doc.counters, name: App.doc.name }); }
function stripFeature(f) { const o = {}; for (const k of Object.keys(f)) if (!k.startsWith('_')) o[k] = f[k]; return o; }
function pushUndo() { App.undo.push(snapshotDoc()); if (App.undo.length > 80) App.undo.shift(); App.redo = []; updateUndoButtons(); }
function restore(json) { const d = JSON.parse(json); Object.assign(App.doc, d); regen(0); saveLocal(); }
function undoDoc() { if (App.dialog || SK) return; if (!App.undo.length) return; App.redo.push(snapshotDoc()); restore(App.undo.pop()); updateUndoButtons(); toast('Undone'); }
function redoDoc() { if (App.dialog || SK) return; if (!App.redo.length) return; App.undo.push(snapshotDoc()); restore(App.redo.pop()); updateUndoButtons(); toast('Redone'); }
function updateUndoButtons() { const u = $('#btnUndo'), r = $('#btnRedo'); if (u) u.disabled = !App.undo.length; if (r) r.disabled = !App.redo.length; }
function saveLocal() { try { localStorage.setItem('kerf-doc', JSON.stringify({ ...JSON.parse(snapshotDoc()), v: 1 })); } catch { /* storage unavailable */ } }
function loadLocal() { try { const s = localStorage.getItem('kerf-doc'); if (s) { const d = JSON.parse(s); if (d && Array.isArray(d.features)) return d; } } catch { /* ignore */ } return null; }

/* ---------- regeneration ---------- */
function regen(from = 0) {
  const t0 = performance.now();
  if (from === 0) { FID = 1; App.snaps = []; }
  let ctx = from > 0 && App.snaps[from - 1] ? App.snaps[from - 1] : newCtx();
  const end = rollIndex(); const fs = App.doc.features;
  for (let i = from; i < fs.length; i++) {
    if (i >= end) { fs[i]._rolled = true; continue; }
    fs[i]._rolled = false;
    ctx = runFeature(ctx, fs[i]);
    App.snaps[i] = ctx;
  }
  App.snaps.length = Math.min(App.snaps.length, end);
  App.ctx = ctx;
  for (const p of ctx.parts) partProps(p.id);
  App.sel = App.sel.filter((r) => refAlive(ctx, r));
  App.lastRegenMs = performance.now() - t0;
  refreshAll();
  const st = $('#status'); if (st) st.textContent = `${App.doc.features.length} features · ${ctx.parts.length} part${ctx.parts.length === 1 ? '' : 's'} · rebuilt in ${Math.round(App.lastRegenMs)} ms`;
}
function ctxBefore(index) {
  if (index <= 0) return newCtx();
  if (App.snaps[index - 1]) return App.snaps[index - 1];
  let ctx = newCtx();
  for (let i = 0; i < index; i++) { ctx = runFeature(ctx, App.doc.features[i]); App.snaps[i] = ctx; }
  return ctx;
}
function refAlive(ctx, r) {
  try {
    if (r.kind === 'face') resolveFace(ctx, r); else if (r.kind === 'edge') resolveEdge(ctx, r);
    else if (r.kind === 'part') return !!findPart(ctx, r.id);
    else if (r.kind === 'plane') return !!ctx.planes[r.id];
    else if (r.kind === 'vertex') return ctx.parts.some((p) => p.id === r.part);
    return true;
  } catch { return false; }
}
function displayCtx() { return App.dialog?.ctx || App.ctx; }

/* ---------- visibility ---------- */
function consumedSketches() {
  const s = new Set(); const scan = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(scan); if (o.kind === 'region' && o.sketch) s.add(o.sketch); if (o.kind === 'sketch' && o.id) s.add(o.id); for (const v of Object.values(o)) if (typeof v === 'object') scan(v); };
  for (const f of App.doc.features) if (f.type !== 'sketch' && !f.suppressed) scan(f.params);
  return s;
}
function isVisible(id) {
  const v = App.doc.vis[id]; if (v != null) return v;
  if (['top', 'front', 'right'].includes(id)) return true;
  if (App._consumed?.has(id)) return false;
  return true;
}
function hiddenParts() { return new Set(Object.entries(App.doc.partProps).filter(([, p]) => p.hidden).map(([k]) => k)); }

function refreshAll() {
  App._consumed = consumedSketches();
  const ctx = displayCtx();
  syncParts(ctx, partProps, hiddenParts());
  syncPlanes(ctx, isVisible);
  const af = activeField();
  const showRegions = !!af && af.pick.includes('region');
  syncSketches(ctx, (id) => (SK && SK.feature.id === id ? false : isVisible(id) || (af && (af.pick.includes('sketch') || af.pick.includes('sketchLine')))), showRegions);
  if (SK) { const sv = View.sketchViews.get(SK.feature.id); if (sv) sv.group.visible = false; }
  // planes labels
  setOverlays('planes', View.planeViews.map((p) => ({ el: el('span', { class: 'plabel' }, p.name), pos: () => p.label })));
  // preview tool body for remove/intersect
  if (App.dialog) {
    const f = App.dialog.feature; const t = ctx.tools?.[f.id];
    const op = f.params.op;
    setPreviewSolids(t && (op === 'remove' || op === 'intersect' || f.type === 'hole') && !f._error ? [{ solid: t.solid, color: View.colors.remove }] : []);
  } else setPreviewSolids([]);
  updateHighlights();
  renderTree(); renderParts(); renderMeasure();
  saveLocal();
}
function updateHighlights() {
  const ctx = displayCtx();
  let sel = App.sel;
  if (SK) { setHighlights(ctx, [], null); return; }
  if (App.dialog) { const af = activeField(); const f = App.dialog.feature; sel = []; for (const fd of FEATURES[f.type].fields) if (fd.type === 'pick' && (!fd.show || fd.show(f.params))) sel.push(...(f.params[fd.key] || []).filter((r) => r.kind !== 'feature')); void af; }
  setHighlights(ctx, sel, App.hover);
}

/* ---------- feature tree ---------- */
function featureIconName(f) { if (f.type === 'primitive') return { box: 'box', cylinder: 'cylinder', sphere: 'sphere', cone: 'cylinder', torus: 'sphere' }[f.params.shape] || 'box'; return FEATURES[f.type].icon; }
function renderTree() {
  const host = $('#tree'); host.innerHTML = '';
  const mk = (id, label, ic, extra = {}) => el('li', { class: 'row ' + (extra.cls || ''), 'data-id': id }, el('span', { class: 'ri', html: icon(ic) }), el('span', { class: 'rn' }, label), extra.after || null);
  const std = [['top', 'Top'], ['front', 'Front'], ['right', 'Right']];
  host.append(el('li', { class: 'row muted', 'data-id': 'origin' }, el('span', { class: 'ri', html: icon('origin') }), el('span', { class: 'rn' }, 'Origin')));
  for (const [id, n] of std) {
    const r = mk(id, n, 'plane', { cls: 'plane-row', after: eyeBtn(id) });
    r.addEventListener('click', () => { if (pickFeatureOrPlane({ kind: 'plane', id })) return; selectRef({ kind: 'plane', id }, true); });
    host.append(r);
  }
  const end = rollIndex();
  App.doc.features.forEach((f, i) => {
    if (i === end) host.append(rollbackRow());
    const err = f._error; const warn = f._warn;
    const isSel = App.treeSel === f.id; const editing = App.dialog?.feature.id === f.id;
    const pickedHere = App.dialog && activeField()?.pick.includes('feature') && (App.dialog.feature.params[activeField().key] || []).some((r) => r.id === f.id);
    const cls = ['frow', err ? 'err' : '', f.suppressed ? 'supp' : '', i >= end ? 'rolled' : '', isSel ? 'sel' : '', editing ? 'editing' : '', pickedHere ? 'picked' : ''].join(' ');
    const after = el('span', { class: 'rr' },
      err ? el('span', { class: 'badge-err', title: err, html: icon('error') }) : warn ? el('span', { class: 'badge-warn', title: warn, html: icon('error') }) : null,
      f.type === 'sketch' || f.type === 'plane' ? eyeBtn(f.id) : null);
    const row = el('li', { class: 'row ' + cls, 'data-id': f.id, tabindex: '0', title: err ? `${f.name}: ${err}` : f.name }, el('span', { class: 'ri', html: icon(featureIconName(f)) }), el('span', { class: 'rn' }, f.type === 'variable' ? `${f.name}  #${f.params.vname} = ${f.params.value}` : f.name), after);
    row.addEventListener('click', () => {
      if (pickFeatureOrPlane({ kind: 'feature', id: f.id, type: f.type })) return;
      App.treeSel = f.id; renderTree();
      if (f.type === 'plane' && App.ctx.planes[f.id]) selectRef({ kind: 'plane', id: f.id }, true);
    });
    row.addEventListener('dblclick', () => editFeature(f.id));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter') editFeature(f.id); if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); deleteFeature(f.id); } });
    row.addEventListener('contextmenu', (e) => { e.preventDefault(); featureMenu(f, e.clientX, e.clientY); });
    host.append(row);
  });
  if (end >= App.doc.features.length) host.append(rollbackRow());
  if (!App.doc.features.length) host.append(el('li', { class: 'empty-hint' }, 'Start with a sketch on the Top plane, or add a primitive.'));
}
function eyeBtn(id) {
  const vis = isVisible(id);
  return el('button', { class: 'eye' + (vis ? '' : ' off'), title: vis ? 'Hide' : 'Show', 'aria-label': (vis ? 'Hide ' : 'Show ') + id, html: icon(vis ? 'eye' : 'eyeoff'), onclick: (e) => { e.stopPropagation(); App.doc.vis[id] = !vis; refreshAll(); } });
}
function rollbackRow() {
  const r = el('li', { class: 'rollback', title: 'Rollback bar: drag to roll the history back', tabindex: '0', 'aria-label': 'Rollback bar' }, el('span', {}, ''));
  r.addEventListener('pointerdown', (e) => {
    if (App.dialog || SK) return;
    e.preventDefault(); r.setPointerCapture(e.pointerId); r.classList.add('drag');
    const rows = () => $$('#tree .frow');
    const move = (ev) => {
      const rs = rows(); let idx = rs.length;
      for (let i = 0; i < rs.length; i++) { const b = rs[i].getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { idx = i; break; } }
      r.dataset.target = idx;
      $$('#tree .frow').forEach((x, i) => x.classList.toggle('would-roll', i >= idx));
    };
    const up = () => {
      r.removeEventListener('pointermove', move); r.removeEventListener('pointerup', up); r.classList.remove('drag');
      const idx = r.dataset.target != null ? +r.dataset.target : rollIndex();
      if (idx !== rollIndex()) { pushUndo(); App.doc.rollback = idx >= App.doc.features.length ? null : idx; regen(Math.min(idx, App.snaps.length)); }
      else renderTree();
    };
    r.addEventListener('pointermove', move); r.addEventListener('pointerup', up);
  });
  r.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const i = clamp(rollIndex() + (e.key === 'ArrowUp' ? -1 : 1), 0, App.doc.features.length); pushUndo(); App.doc.rollback = i >= App.doc.features.length ? null : i; regen(Math.min(i, App.snaps.length)); $('#tree .rollback')?.focus(); }
  });
  return r;
}
function featureMenu(f, x, y) {
  const i = App.doc.features.indexOf(f);
  showMenu(x, y, [
    ['Edit', () => editFeature(f.id)],
    ['Rename', () => renameFeature(f)],
    [f.suppressed ? 'Unsuppress' : 'Suppress', () => { pushUndo(); f.suppressed = !f.suppressed; regen(Math.min(i, App.snaps.length)); }],
    ['Roll history to here', () => { pushUndo(); App.doc.rollback = i + 1 >= App.doc.features.length ? null : i + 1; regen(Math.min(i + 1, App.snaps.length)); }],
    ['Move up', () => moveFeature(f, -1), i === 0], ['Move down', () => moveFeature(f, 1), i === App.doc.features.length - 1],
    null,
    ['Delete', () => deleteFeature(f.id), false, 'danger'],
  ]);
}
function moveFeature(f, d) { const fs = App.doc.features; const i = fs.indexOf(f); const j = i + d; if (j < 0 || j >= fs.length) return; pushUndo(); [fs[i], fs[j]] = [fs[j], fs[i]]; regen(Math.min(i, j)); }
function renameFeature(f) {
  const row = $(`#tree [data-id="${f.id}"] .rn`); if (!row) return;
  const inp = el('input', { class: 'rename', value: f.name, 'aria-label': 'Feature name' }); row.replaceWith(inp); inp.focus(); inp.select();
  const done = (ok) => { if (ok && inp.value.trim()) { pushUndo(); f.name = inp.value.trim(); } renderTree(); saveLocal(); };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
  inp.addEventListener('blur', () => done(true));
}
function deleteFeature(id) {
  const fs = App.doc.features; const i = fs.findIndex((f) => f.id === id); if (i < 0) return;
  pushUndo(); fs.splice(i, 1);
  if (App.doc.rollback != null && i < App.doc.rollback) App.doc.rollback--;
  regen(Math.min(i, App.snaps.length)); toast(`Deleted. Undo with Ctrl+Z`);
}

/* ---------- parts list ---------- */
function renderParts() {
  const host = $('#parts'); host.innerHTML = '';
  const ctx = displayCtx();
  $('#partsCount').textContent = `(${ctx.parts.length})`;
  for (const p of ctx.parts) {
    const pr = partProps(p.id);
    const sel = App.sel.some((r) => r.kind === 'part' && r.id === p.id);
    const row = el('li', { class: 'row prow' + (sel ? ' sel' : '') + (pr.hidden ? ' supp' : ''), tabindex: '0' },
      el('span', { class: 'swatch', style: { background: pr.color } }),
      el('span', { class: 'rn' }, pr.name),
      el('span', { class: 'rr' }, el('button', { class: 'eye' + (pr.hidden ? ' off' : ''), title: pr.hidden ? 'Show' : 'Hide', 'aria-label': (pr.hidden ? 'Show ' : 'Hide ') + pr.name, html: icon(pr.hidden ? 'eyeoff' : 'eye'), onclick: (e) => { e.stopPropagation(); pr.hidden = !pr.hidden; refreshAll(); } })));
    row.addEventListener('click', (e) => { if (App.dialog) { const af = activeField(); if (af && af.pick.includes('part')) { addPick({ kind: 'part', id: p.id }); return; } } selectRef({ kind: 'part', id: p.id }, !(e.shiftKey || e.ctrlKey || e.metaKey)); });
    row.addEventListener('contextmenu', (e) => { e.preventDefault(); partMenu(p, e.clientX, e.clientY); });
    row.addEventListener('dblclick', () => partMenu(p, row.getBoundingClientRect().right - 10, row.getBoundingClientRect().top + 20));
    host.append(row);
  }
  if (!ctx.parts.length) host.append(el('li', { class: 'empty-hint' }, 'No parts yet.'));
}
function partMenu(p, x, y) {
  const pr = partProps(p.id);
  showMenu(x, y, [
    ['Rename', () => { const nn = el('input', { class: 'rename', value: pr.name, 'aria-label': 'Part name' }); const host = $('#parts'); const row = [...host.children][App.ctx.parts.indexOf(p)]; const rn = row?.querySelector('.rn'); if (!rn) return; rn.replaceWith(nn); nn.focus(); nn.select(); const done = (ok) => { if (ok && nn.value.trim()) pr.name = nn.value.trim(); renderParts(); saveLocal(); renderMeasure(); }; nn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); }); nn.addEventListener('blur', () => done(true)); }],
    ['Appearance…', () => colorPopover(p, x, y)],
    ['Material…', () => materialPopover(p, x, y)],
    [pr.hidden ? 'Show' : 'Hide', () => { pr.hidden = !pr.hidden; refreshAll(); }],
    ['Isolate', () => { for (const q of App.ctx.parts) partProps(q.id).hidden = q.id !== p.id; refreshAll(); }],
    ['Show all parts', () => { for (const q of App.ctx.parts) partProps(q.id).hidden = false; refreshAll(); }],
    ['Mass properties', () => { App.sel = [{ kind: 'part', id: p.id }]; refreshAll(); openMassPanel(); }],
    ['Export this part…', () => exportMenu(x, y, [p])],
    null,
    ['Delete part', () => addFeatureDirect('deletePart', { parts: [{ kind: 'part', id: p.id }] }), false, 'danger'],
  ]);
}
function colorPopover(p, x, y) {
  const pr = partProps(p.id);
  const pal = ['#9aa7b4', '#5b6673', '#c7a76a', '#b87333', '#7f9fb8', '#3f6e9c', '#b98a7c', '#a33b3b', '#8fae8b', '#3f7a52', '#a596bf', '#e0b84a', '#d9d4c7', '#2f3338', '#7fb0ad', '#e07a3f'];
  const box = el('div', { class: 'swatches' }, ...pal.map((c) => el('button', { class: 'sw' + (c === pr.color ? ' on' : ''), style: { background: c }, 'aria-label': 'Color ' + c, onclick: () => { pr.color = c; closeMenu(); refreshAll(); } })),
    el('label', { class: 'custom-col' }, 'Custom ', el('input', { type: 'color', value: pr.color, oninput: (e) => { pr.color = e.target.value; refreshAll(); } })));
  showPopover(x, y, el('div', { class: 'pop-h' }, `Appearance · ${pr.name}`), box);
}
function materialPopover(p, x, y) {
  const pr = partProps(p.id);
  const list = el('div', { class: 'matlist' }, ...MATERIALS.map(([k, n, d]) => el('button', { class: 'mi' + (pr.material === k ? ' on' : ''), onclick: () => { pr.material = k; closeMenu(); saveLocal(); renderMeasure(); if ($('#massPanel') && !$('#massPanel').hidden) openMassPanel(); } }, el('span', {}, n), el('span', { class: 'num' }, `${d} g/cm³`))));
  showPopover(x, y, el('div', { class: 'pop-h' }, `Material · ${pr.name}`), list);
}

/* ---------- menus & popovers ---------- */
function showMenu(x, y, items) {
  closeMenu();
  const m = el('div', { class: 'menu', role: 'menu', id: 'ctxmenu' });
  for (const it of items) {
    if (!it) { m.append(el('hr')); continue; }
    const [label, fn, disabled, cls] = it;
    m.append(el('button', { role: 'menuitem', class: cls || '', disabled: !!disabled, onclick: () => { closeMenu(); fn(); } }, label));
  }
  document.body.append(m); placeFloating(m, x, y);
  m.querySelector('button:not([disabled])')?.focus();
}
function showPopover(x, y, ...kids) { closeMenu(); const m = el('div', { class: 'menu pop', id: 'ctxmenu' }, ...kids); document.body.append(m); placeFloating(m, x, y); }
function placeFloating(m, x, y) {
  const r = m.getBoundingClientRect(); const W = window.innerWidth, H = window.innerHeight;
  m.style.left = clamp(x, 8, W - r.width - 8) + 'px'; m.style.top = clamp(y, 8, H - r.height - 8) + 'px';
}
function closeMenu() { $('#ctxmenu')?.remove(); }
document.addEventListener('pointerdown', (e) => { const m = $('#ctxmenu'); if (m && !m.contains(e.target)) closeMenu(); });

/* ---------- selection ---------- */
function refKey(r) { return JSON.stringify(r); }
function sameRef(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'part' || a.kind === 'plane' || a.kind === 'sketch' || a.kind === 'feature') return a.id === b.id;
  if (a.kind === 'sketchEnt') return a.sketch === b.sketch && a.ent === b.ent;
  if (a.kind === 'region') { if (a.sketch !== b.sketch) return false; try { const ctx = displayCtx(); return resolveRegion(ctx, a).region === resolveRegion(ctx, b).region; } catch { return false; } }
  if (a.kind === 'face') { try { const ctx = displayCtx(); const x = resolveFace(ctx, a), y = resolveFace(ctx, b); return x.part.id === y.part.id && x.face.id === y.face.id; } catch { return false; } }
  if (a.kind === 'edge') { try { const ctx = displayCtx(); const x = resolveEdge(ctx, a), y = resolveEdge(ctx, b); return x.edge === y.edge; } catch { return false; } }
  if (a.kind === 'vertex') return v3(a.p).distanceTo(v3(b.p)) < 1e-6;
  return refKey(a) === refKey(b);
}
function selectRef(r, replace) {
  if (replace) App.sel = [];
  const i = App.sel.findIndex((q) => sameRef(q, r));
  if (i >= 0) App.sel.splice(i, 1); else App.sel.push(r);
  updateHighlights(); renderParts(); renderMeasure();
}
function refLabel(r) {
  const ctx = displayCtx();
  const pn = (id) => partProps(id).name;
  switch (r.kind) {
    case 'face': { try { const { part, face } = resolveFace(ctx, r); return `${face.planar ? 'Face' : 'Curved face'} of ${pn(part.id)}`; } catch { return 'Missing face'; } }
    case 'edge': return `Edge of ${pn(r.part)}`;
    case 'vertex': return `Vertex of ${pn(r.part)}`;
    case 'part': return pn(r.id);
    case 'plane': return (ctx.planes[r.id]?.name || 'Plane') + (['top', 'front', 'right'].includes(r.id) ? ' plane' : '');
    case 'region': return `Region of ${featName(r.sketch)}`;
    case 'sketch': return featName(r.id);
    case 'sketchEnt': return `Line in ${featName(r.sketch)}`;
    case 'feature': return featName(r.id);
  }
  return r.kind;
}
const featName = (id) => App.doc.features.find((f) => f.id === id)?.name || 'Missing';

/* ---------- feature dialog ---------- */
function activeField() {
  const d = App.dialog; if (!d) return null;
  const fd = FEATURES[d.feature.type].fields.find((q) => q.key === d.activeKey);
  if (!fd || (fd.show && !fd.show(d.feature.params))) return null;
  return fd;
}
function firstPickKey(f) { const fd = FEATURES[f.type].fields.find((q) => q.type === 'pick' && (!q.show || q.show(f.params)) && !(f.params[q.key] || []).length); return fd?.key || null; }
function startFeature(type, preset = null) {
  if (SK) return;
  if (App.dialog) cancelDialog();
  const f = { id: uid('f'), type, name: nextName(type), params: defaultParams(type) };
  if (preset) Object.assign(f.params, preset);
  // use current selection for matching fields
  const used = new Set();
  for (const fd of FEATURES[type].fields) {
    if (fd.type !== 'pick' || (fd.show && !fd.show(f.params))) continue;
    const m = App.sel.filter((r) => !used.has(r) && fd.pick.includes(r.kind));
    if (m.length) { f.params[fd.key] = fd.multi ? m : [m[0]]; (fd.multi ? m : [m[0]]).forEach((r) => used.add(r)); }
  }
  if (type === 'extrude' && !f.params.entities.length) autoRegions(f);
  if (type === 'revolve' && !f.params.entities.length) autoRegions(f);
  const index = rollIndex();
  App.doc.features.splice(index, 0, f);
  if (App.doc.rollback != null) App.doc.rollback++;
  App.dialog = { feature: f, index, isNew: true, base: ctxBefore(index), activeKey: firstPickKey(f) };
  App.sel = [];
  openDialogUI();
}
function autoRegions(f) {
  // pick regions of the most recent visible sketch
  const ctx = App.ctx; const sks = App.doc.features.slice(0, rollIndex()).filter((q) => q.type === 'sketch' && ctx.sketches[q.id]).reverse();
  for (const s of sks) {
    if (App._consumed?.has(s.id)) continue;
    const sk = ctx.sketches[s.id]; if (!sk.regions.length) continue;
    f.params.entities = sk.regions.filter((r) => regionDepth(sk.regions, r) % 2 === 0).map((r) => ({ kind: 'region', sketch: s.id, pt: r.sample.slice() }));
    return;
  }
}
function addFeatureDirect(type, params) {
  pushUndo();
  const f = { id: uid('f'), type, name: nextName(type), params: { ...defaultParams(type), ...params } };
  const index = rollIndex(); App.doc.features.splice(index, 0, f); if (App.doc.rollback != null) App.doc.rollback++;
  regen(Math.min(index, App.snaps.length));
}
function editFeature(id) {
  if (SK) return;
  if (App.dialog) cancelDialog();
  const i = App.doc.features.findIndex((f) => f.id === id); if (i < 0) return;
  const f = App.doc.features[i];
  App.dialog = { feature: f, index: i, isNew: false, prev: deepClone(f.params), prevName: f.name, base: ctxBefore(i), activeKey: null };
  App.sel = [];
  openDialogUI();
}
function openDialogUI() {
  const d = App.dialog; const f = d.feature;
  $('#dialog').hidden = false;
  renderDialog();
  runPreview();
  if (f.type === 'sketch') {
    const ref = (f.params.plane || [])[0];
    if (ref) beginSketchEditing(); else { d.activeKey = 'plane'; renderDialog(); setHint('Select a plane or a flat face to sketch on'); refreshAll(); }
  }
  document.body.classList.add('has-dialog');
}
function beginSketchEditing() {
  const d = App.dialog; const f = d.feature;
  let plane; try { plane = resolvePlane(d.base, f.params.plane[0]); } catch (e) { toast(e.message, 'error'); return; }
  d.activeKey = null;
  startSketchSession(f, plane, d.base);
  document.body.classList.add('sketching');
  renderToolbar(); renderDialog(); refreshAll();
  setSketchTool(f.params.data?.ents?.length ? 'select' : 'line');
}
function uiSketchChanged() { if (!App.dialog) return; App.dialog.feature.params.data = deepClone(SK.data); schedulePreview(); }
let _pv = 0;
function schedulePreview() { clearTimeout(_pv); _pv = setTimeout(runPreview, 90); }
function runPreview() {
  const d = App.dialog; if (!d) return;
  const t0 = performance.now();
  d.ctx = runFeature(d.base, d.feature);
  d.ms = performance.now() - t0;
  renderDialogStatus(); refreshAll(); renderTree();
}
function commitDialog() {
  const d = App.dialog; if (!d) return;
  if (d.feature.type === 'sketch' && SK) { d.feature.params.data = deepClone(SK.data); endSketchSession(); }
  const undoState = d.isNew ? null : null; void undoState;
  // build undo entry: document as it was before this dialog
  const f = d.feature; const fs = App.doc.features;
  const cur = { params: deepClone(f.params), name: f.name };
  if (d.isNew) { const i = fs.indexOf(f); fs.splice(i, 1); if (App.doc.rollback != null) App.doc.rollback--; pushUndo(); fs.splice(i, 0, f); if (App.doc.rollback != null) App.doc.rollback++; }
  else { f.params = d.prev; f.name = d.prevName; pushUndo(); f.params = cur.params; f.name = cur.name; }
  closeDialogUI();
  regen(Math.min(d.index, App.snaps.length));
  if (f._error) toast(`${f.name}: ${f._error}`, 'error');
}
function cancelDialog() {
  const d = App.dialog; if (!d) return;
  if (SK) endSketchSession();
  const fs = App.doc.features;
  if (d.isNew) { const i = fs.indexOf(d.feature); if (i >= 0) fs.splice(i, 1); if (App.doc.rollback != null) App.doc.rollback--; App.doc.counters[d.feature.type]--; }
  else { d.feature.params = d.prev; d.feature.name = d.prevName; }
  closeDialogUI();
  regen(Math.min(d.index, App.snaps.length));
}
function closeDialogUI() {
  App.dialog = null; App.hover = null; $('#dialog').hidden = true; document.body.classList.remove('has-dialog', 'sketching');
  renderToolbar(); setHint('');
}
function renderDialog() {
  const d = App.dialog; const f = d.feature; const def = FEATURES[f.type]; const host = $('#dialog'); host.innerHTML = '';
  const head = el('div', { class: 'dlg-h' },
    el('span', { class: 'ri', html: icon(featureIconName(f)) }),
    el('input', { class: 'dlg-name', value: f.name, 'aria-label': 'Feature name', oninput: (e) => { f.name = e.target.value; }, onkeydown: (e) => e.stopPropagation() }),
    el('button', { class: 'ok', title: 'Accept (Enter)', 'aria-label': 'Accept', html: icon('check'), onclick: commitDialog }),
    el('button', { class: 'cancel', title: 'Cancel (Esc)', 'aria-label': 'Cancel', html: icon('close'), onclick: cancelDialog }));
  host.append(head);
  const body = el('div', { class: 'dlg-b' });
  for (const fd of def.fields) {
    if (fd.show && !fd.show(f.params)) continue;
    if (f.type === 'sketch' && SK) continue;
    body.append(renderField(f, fd));
  }
  if (f.type === 'sketch' && SK) {
    body.append(el('div', { class: 'sk-info' },
      el('div', { class: 'kv' }, el('span', {}, 'Plane'), el('b', {}, refLabel(f.params.plane[0]))),
      el('div', { class: 'kv' }, el('span', {}, 'Status'), el('b', { id: 'skStatus' }, '')),
      el('p', { class: 'small' }, 'Blue curves are under-defined; dark curves are fully constrained. Double-click a dimension to edit it; use #variables in any value.')));
  }
  host.append(body, el('div', { class: 'dlg-f', id: 'dlgStatus' }));
  if (SK) updateSketchStatus();
  renderDialogStatus();
}
function renderDialogStatus() {
  const s = $('#dlgStatus'); if (!s || !App.dialog) return; const f = App.dialog.feature;
  s.innerHTML = '';
  if (f._error) s.append(el('div', { class: 'msg err' }, el('span', { html: icon('error') }), f._error));
  else if (f._warn) s.append(el('div', { class: 'msg warn' }, el('span', { html: icon('error') }), f._warn));
  else if (f.type !== 'sketch') s.append(el('div', { class: 'msg ok' }, `Preview regenerated in ${Math.max(1, Math.round(App.dialog.ms || 0))} ms`));
}
function renderField(f, fd) {
  const v = f.params[fd.key]; const id = 'fld-' + fd.key;
  const wrap = el('div', { class: 'fld fld-' + fd.type });
  const label = fd.label ? el('label', { for: id }, fd.label) : null;
  const set = (val, rerender = false) => { f.params[fd.key] = val; if (rerender) renderDialog(); schedulePreview(); };
  if (fd.type === 'pick') {
    const active = App.dialog.activeKey === fd.key;
    const box = el('div', { class: 'pick' + (active ? ' active' : ''), id, tabindex: '0', role: 'button', 'aria-pressed': active ? 'true' : 'false', onclick: () => { App.dialog.activeKey = fd.key; renderDialog(); refreshAll(); setHint(pickHint(fd)); }, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } } });
    if (!v.length) box.append(el('span', { class: 'ph' }, active ? pickHint(fd) : 'Click to select…'));
    v.forEach((r, i) => box.append(el('span', { class: 'chip', onmouseenter: () => { App.hover = r; updateHighlights(); }, onmouseleave: () => { App.hover = null; updateHighlights(); } }, refLabel(r),
      el('button', { 'aria-label': 'Remove ' + refLabel(r), html: icon('close'), onclick: (e) => { e.stopPropagation(); const nv = v.slice(); nv.splice(i, 1); set(nv, true); App.hover = null; } }))));
    wrap.append(el('div', { class: 'lbl' }, fd.label, fd.optional ? el('span', { class: 'opt' }, ' optional') : null), box);
    if (fd.hint) wrap.append(el('div', { class: 'small' }, fd.hint));
    return wrap;
  }
  if (fd.type === 'seg') {
    const g = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': fd.label || fd.key });
    for (const [k, n] of fd.options) g.append(el('button', { class: v === k ? 'on' : '', role: 'radio', 'aria-checked': v === k ? 'true' : 'false', onclick: () => set(k, true) }, n));
    if (label) wrap.append(el('div', { class: 'lbl' }, fd.label));
    wrap.append(g); return wrap;
  }
  if (fd.type === 'select') {
    const s = el('select', { id, onchange: (e) => set(e.target.value, true) }, ...fd.options.map(([k, n]) => el('option', { value: k, selected: v === k }, n)));
    wrap.append(label, s); return wrap;
  }
  if (fd.type === 'check') {
    const c = el('input', { type: 'checkbox', id, checked: !!v, onchange: (e) => set(e.target.checked, true) });
    wrap.append(el('label', { class: 'chk', for: id }, c, el('span', {}, fd.label))); return wrap;
  }
  if (fd.type === 'text') {
    wrap.append(label, el('input', { id, type: 'text', value: v ?? '', oninput: (e) => set(e.target.value), onkeydown: (e) => e.stopPropagation(), spellcheck: 'false' })); return wrap;
  }
  // numeric expression
  const unit = fd.type === 'len' ? 'mm' : fd.type === 'ang' ? 'deg' : '';
  const inp = el('input', { id, type: 'text', value: String(v ?? ''), inputmode: 'decimal', spellcheck: 'false', autocomplete: 'off' });
  const res = el('span', { class: 'eval' });
  const check = () => {
    try { const n = evalExpr(inp.value, (App.dialog.base || App.ctx).vars); inp.classList.remove('bad'); res.textContent = /[#A-Za-z(]/.test(inp.value.replace(/\b(mm|cm|m|in|ft|deg|rad)\b/g, '')) ? `= ${fmt(n, 3)}` : ''; return true; }
    catch (e) { inp.classList.add('bad'); res.textContent = e.message; return false; }
  };
  inp.addEventListener('input', () => { check(); set(inp.value); });
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { commitDialog(); return; }
    if (e.key === 'Escape') { cancelDialog(); return; }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && /^-?[\d.]+\s*[a-z]*$/i.test(inp.value.trim())) {
      e.preventDefault(); const m = inp.value.trim().match(/^(-?[\d.]+)\s*([a-z]*)$/i); const step = e.shiftKey ? 10 : fd.type === 'int' ? 1 : 1;
      const nv = +(parseFloat(m[1]) + (e.key === 'ArrowUp' ? step : -step)).toFixed(4); inp.value = nv + (m[2] ? ' ' + m[2] : ''); check(); set(inp.value);
    }
  });
  check();
  wrap.append(label, el('div', { class: 'num-in' }, inp, unit ? el('span', { class: 'unit' }, unit) : null), res);
  return wrap;
}
function pickHint(fd) {
  const names = { region: 'sketch regions', face: 'faces', edge: 'edges', part: 'parts', plane: 'planes', sketch: 'a sketch', sketchLine: 'a sketch line', feature: 'features in the list', vertex: 'vertices' };
  return 'Select ' + fd.pick.map((k) => names[k]).join(' or ');
}
function addPick(r) {
  const d = App.dialog; const fd = activeField(); if (!fd) return;
  const cur = d.feature.params[fd.key] || [];
  const i = cur.findIndex((q) => sameRef(q, r));
  let nv;
  if (i >= 0) { nv = cur.slice(); nv.splice(i, 1); }
  else nv = fd.multi ? [...cur, r] : [r];
  d.feature.params[fd.key] = nv;
  if (!fd.multi && i < 0) { const nk = firstPickKey(d.feature); if (nk && nk !== fd.key) d.activeKey = nk; }
  renderDialog();
  if (d.feature.type === 'sketch' && fd.key === 'plane' && nv.length) { beginSketchEditing(); return; }
  schedulePreview(); setHint(activeField() ? pickHint(activeField()) : '');
}
function pickFeatureOrPlane(r) {
  if (!App.dialog) return false;
  const fd = activeField(); if (!fd) return false;
  if (r.kind === 'feature' && fd.pick.includes('feature')) {
    const idx = App.doc.features.findIndex((f) => f.id === r.id);
    if (idx >= App.dialog.index) { toast('Pick a feature that comes before this one', 'error'); return true; }
    if (!['extrude', 'revolve', 'sweep', 'loft', 'hole', 'primitive'].includes(r.type)) { toast('Only solid-creating features can be patterned or mirrored', 'error'); return true; }
    addPick({ kind: 'feature', id: r.id }); return true;
  }
  if (r.kind === 'plane' && fd.pick.includes('plane')) { addPick(r); return true; }
  if (r.kind === 'feature' && fd.pick.includes('sketch')) { const f = App.doc.features.find((q) => q.id === r.id); if (f?.type === 'sketch') { addPick({ kind: 'sketch', id: f.id }); return true; } }
  return false;
}

/* ---------- viewport pointer ---------- */
function viewportKinds() {
  const fd = activeField();
  if (fd) return fd.pick.filter((k) => k !== 'feature');
  if (App.dialog) return [];
  return ['vertex', 'edge', 'face', 'plane'];
}
function initPointer() {
  const cvs = View.renderer.domElement;
  let down = null; let raf = 0;
  cvs.addEventListener('contextmenu', (e) => e.preventDefault());
  cvs.addEventListener('pointerdown', (e) => {
    closeMenu();
    if (SK) { if (skPointer('down', e)) { cvs.setPointerCapture(e.pointerId); } return; }
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  cvs.addEventListener('pointermove', (e) => {
    if (SK) { skPointer('move', e); return; }
    if (e.buttons) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = cvs.getBoundingClientRect(); const kinds = viewportKinds();
      const h = kinds.length ? pickAt(e.clientX - r.left, e.clientY - r.top, kinds) : null;
      const nh = h ? h.ref : null;
      if (JSON.stringify(nh) !== JSON.stringify(App.hover)) { App.hover = nh; updateHighlights(); }
      cvs.style.cursor = nh ? 'pointer' : '';
    });
  });
  cvs.addEventListener('pointerup', (e) => {
    if (SK) { skPointer('up', e); return; }
    if (!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4; down = null;
    if (moved) return;
    const r = cvs.getBoundingClientRect(); const kinds = viewportKinds();
    const h = kinds.length ? pickAt(e.clientX - r.left, e.clientY - r.top, kinds) : null;
    if (App.dialog) { if (h) addPick(h.ref); return; }
    if (!h) { if (App.sel.length) { App.sel = []; updateHighlights(); renderParts(); renderMeasure(); } return; }
    selectRef(h.ref, false);
  });
  cvs.addEventListener('dblclick', (e) => { if (SK) { skPointer('dbl', e); return; } });
  cvs.addEventListener('pointerleave', () => { if (App.hover) { App.hover = null; updateHighlights(); } });
}

/* ---------- measure panel ---------- */
function samplePoints(ctx, r) {
  if (r.kind === 'vertex') return [v3(r.p)];
  if (r.kind === 'edge') return resolveEdge(ctx, r).edge.pts;
  if (r.kind === 'face') { const { part, face } = resolveFace(ctx, r); const s = part.solid; const out = []; for (const t of face.tris) for (let k = 0; k < 3; k++) out.push(s.vert(s.idx[t * 3 + k])); return out; }
  return [];
}
function renderMeasure() {
  const host = $('#measure'); if (!host) return;
  const ctx = App.ctx; const sel = App.dialog ? [] : App.sel;
  if (!sel.length) { host.hidden = true; return; }
  const rows = [];
  const add = (k, v) => rows.push(el('div', { class: 'kv' }, el('span', {}, k), el('b', { class: 'num' }, v)));
  try {
    if (sel.length === 1) {
      const r = sel[0];
      if (r.kind === 'vertex') add('Position', r.p.map((q) => fmt(q, 2)).join(', ') + ' mm');
      if (r.kind === 'edge') {
        const { edge } = resolveEdge(ctx, r); add('Length', fmt(edge.length, 3) + ' mm');
        if (edge.straight) { const d = edge.pts.at(-1).clone().sub(edge.pts[0]).normalize(); add('Direction', [d.x, d.y, d.z].map((q) => fmt(q, 3)).join(', ')); }
        else if (edge.closed) { const c = centroidOf(edge.pts); const rr = edge.pts.reduce((a, p) => a + p.distanceTo(c), 0) / edge.pts.length; add('Diameter', '≈ ' + fmt(rr * 2, 3) + ' mm'); add('Center', [c.x, c.y, c.z].map((q) => fmt(q, 2)).join(', ')); }
      }
      if (r.kind === 'face') {
        const { face } = resolveFace(ctx, r); add('Area', fmt(face.area, 2) + ' mm²');
        if (face.planar) add('Normal', [face.normal.x, face.normal.y, face.normal.z].map((q) => fmt(q, 3)).join(', '));
        else add('Type', 'Curved');
      }
      if (r.kind === 'part') {
        const p = findPart(ctx, r.id); if (p) { const m = massProps(p.solid); const pr = partProps(r.id); const mat = MATERIALS.find((q) => q[0] === pr.material);
          add('Volume', fmt(m.volume, 1) + ' mm³'); add('Mass', fmt((m.volume / 1000) * mat[2], 2) + ' g'); add('Material', mat[1]); }
      }
      if (r.kind === 'plane') { const pl = ctx.planes[r.id]; if (pl) { add('Origin', arr3(pl.o).map((q) => fmt(q, 2)).join(', ')); add('Normal', arr3(pl.n).map((q) => fmt(q, 3)).join(', ')); } }
    } else {
      const geo = sel.filter((r) => ['vertex', 'edge', 'face'].includes(r.kind));
      if (geo.length === 2) {
        const [a, b] = geo;
        if (a.kind === 'vertex' && b.kind === 'vertex') {
          const p = v3(a.p), q = v3(b.p); add('Distance', fmt(p.distanceTo(q), 3) + ' mm');
          add('ΔX ΔY ΔZ', [q.x - p.x, q.y - p.y, q.z - p.z].map((v) => fmt(v, 3)).join('  '));
        } else {
          const A = samplePoints(ctx, a), B = samplePoints(ctx, b);
          const fa = a.kind === 'face' ? resolveFace(ctx, a).face : null, fb = b.kind === 'face' ? resolveFace(ctx, b).face : null;
          if (fa?.planar && fb?.planar) {
            const ang = Math.acos(clamp(fa.normal.dot(fb.normal), -1, 1)) / DEG;
            add('Angle', fmt(ang, 2) + '°');
            if (Math.abs(fa.normal.dot(fb.normal)) > 0.99999) add('Distance', fmt(Math.abs(fa.d - fa.normal.dot(fb.centroid)), 3) + ' mm');
          } else if (a.kind === 'edge' && b.kind === 'edge') {
            const ea = resolveEdge(ctx, a).edge, eb = resolveEdge(ctx, b).edge;
            if (ea.straight && eb.straight) { const u = ea.pts.at(-1).clone().sub(ea.pts[0]).normalize(), w = eb.pts.at(-1).clone().sub(eb.pts[0]).normalize(); add('Angle', fmt(Math.acos(clamp(Math.abs(u.dot(w)), 0, 1)) / DEG, 2) + '°'); }
          } else if ((fa?.planar && b.kind === 'vertex') || (fb?.planar && a.kind === 'vertex')) {
            const f = fa || fb, p = v3((a.kind === 'vertex' ? a : b).p); add('Normal distance', fmt(Math.abs(f.normal.dot(p) - f.d), 3) + ' mm');
          }
          let md = Infinity; for (const p of A) for (const q of B) md = Math.min(md, p.distanceTo(q));
          add('Minimum distance', '≈ ' + fmt(md, 3) + ' mm');
        }
      } else if (sel.every((r) => r.kind === 'part')) {
        let V = 0, M = 0; for (const r of sel) { const p = findPart(ctx, r.id); if (!p) continue; const m = massProps(p.solid); V += m.volume; M += (m.volume / 1000) * MATERIALS.find((q) => q[0] === partProps(r.id).material)[2]; }
        add('Parts', String(sel.length)); add('Total volume', fmt(V, 1) + ' mm³'); add('Total mass', fmt(M, 2) + ' g');
      } else if (sel.every((r) => r.kind === 'face')) {
        add('Total area', fmt(sel.reduce((a, r) => a + resolveFace(ctx, r).face.area, 0), 2) + ' mm²');
      } else if (sel.every((r) => r.kind === 'edge')) {
        add('Total length', fmt(sel.reduce((a, r) => a + resolveEdge(ctx, r).edge.length, 0), 3) + ' mm');
      }
    }
  } catch { /* stale */ }
  host.innerHTML = '';
  host.append(el('div', { class: 'mh' }, el('span', { html: icon('measure') }), `${sel.length} selected`, el('button', { class: 'x', 'aria-label': 'Clear selection', html: icon('close'), onclick: () => { App.sel = []; updateHighlights(); renderParts(); renderMeasure(); } })), ...rows);
  if (!rows.length) host.append(el('div', { class: 'small' }, 'Select a vertex, edge, face or part to measure it. Shift is not needed; clicks add to the selection.'));
  host.hidden = false;
}

/* ---------- mass properties ---------- */
function openMassPanel() {
  const host = $('#massPanel'); const ctx = App.ctx;
  const ids = App.sel.filter((r) => r.kind === 'part').map((r) => r.id);
  const parts = (ids.length ? ctx.parts.filter((p) => ids.includes(p.id)) : ctx.parts.filter((p) => !partProps(p.id).hidden));
  host.innerHTML = '';
  host.append(el('div', { class: 'mh' }, el('span', { html: icon('mass') }), 'Mass properties', el('button', { class: 'x', 'aria-label': 'Close', html: icon('close'), onclick: () => (host.hidden = true) })));
  if (!parts.length) { host.append(el('div', { class: 'small' }, 'There are no visible parts.')); host.hidden = false; return; }
  let V = 0, A = 0, M = 0; const C = new V3(); const bb = new THREE.Box3();
  const tbody = el('tbody');
  for (const p of parts) {
    const m = massProps(p.solid); const pr = partProps(p.id); const mat = MATERIALS.find((q) => q[0] === pr.material); const mass = (m.volume / 1000) * mat[2];
    V += m.volume; A += m.area; M += mass; C.addScaledVector(m.centroid, mass); bb.union(p.solid.bbox());
    tbody.append(el('tr', {}, el('td', {}, el('span', { class: 'swatch', style: { background: pr.color } }), pr.name), el('td', {}, mat[1]), el('td', { class: 'num' }, fmt(m.volume / 1000, 3)), el('td', { class: 'num' }, fmt(mass, 2))));
  }
  if (M > 0) C.divideScalar(M);
  const sz = bb.getSize(new V3());
  const kv = (k, v) => el('div', { class: 'kv' }, el('span', {}, k), el('b', { class: 'num' }, v));
  host.append(
    el('div', { class: 'tbl-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Part'), el('th', {}, 'Material'), el('th', { class: 'num' }, 'cm³'), el('th', { class: 'num' }, 'g'))), tbody)),
    kv('Volume', fmt(V, 1) + ' mm³'), kv('Surface area', fmt(A, 1) + ' mm²'), kv('Mass', fmt(M, 2) + ' g'),
    kv('Center of mass', [C.x, C.y, C.z].map((q) => fmt(q, 2)).join(', ') + ' mm'),
    kv('Bounding box', `${fmt(sz.x, 2)} × ${fmt(sz.y, 2)} × ${fmt(sz.z, 2)} mm`),
    el('div', { class: 'small' }, 'Change a part’s material from its menu in the Parts list.'));
  host.hidden = false;
}

/* ---------- export / import ---------- */
async function offerFile(filename, data, zipInner) {
  let dl = null;
  try { dl = App.dlReady ? await Promise.race([App.dlReady, new Promise((r) => setTimeout(() => r(null), 300))]) : null; } catch { dl = null; }
  if (dl) {
    let fname = filename, payload = data;
    if (zipInner) { payload = makeZip([{ name: filename, data }]); fname = filename.replace(/\.[^.]+$/, '') + '.zip'; }
    try { await dl.save({ filename: fname, data: payload instanceof ArrayBuffer ? payload.slice(0) : payload }); toast(`Saved ${fname}`); }
    catch (e) { if (e?.code !== 'declined') toast('This view cannot save files. Open the page in a browser tab to export.', 'error'); }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data]);
  const a = el('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Exported ${filename}`);
}
const safeName = () => (App.doc.name || 'part').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'part';
function exportMesh(fmtId, parts) {
  const ctx = App.ctx; const list = parts || ctx.parts.filter((p) => !partProps(p.id).hidden);
  if (!list.length) { toast('There are no visible parts to export', 'error'); return; }
  const base = parts && parts.length === 1 ? partProps(parts[0].id).name.replace(/\s+/g, '-').toLowerCase() : safeName();
  let files;
  try { files = exportModel(fmtId, list.map((p) => ({ name: partProps(p.id).name, color: partProps(p.id).color, solid: p.solid })), base); }
  catch (e) { toast(e.message, 'error'); return; }
  if (files.length === 1 && files[0].zip) offerFile(files[0].name, makeZip(files[0].zip), true);
  else if (files.length === 1) offerFile(files[0].name, files[0].data, true);
  else offerFile(`${base}-${fmtId}.zip`, makeZip(files), false);
}
function exportMenu(x, y, parts) {
  showMenu(x, y, [...EXPORT_FORMATS.map((f) => [`${f.label}  ·  ${f.note}`, () => exportMesh(f.id, parts)]),
    ...(parts ? [] : [null, ['PNG image of the view', exportImage], ['Kerf document (.json)', exportDoc]])]);
}
function exportDoc() { offerFile(safeName() + '.kerf.json', JSON.stringify({ app: 'kerf', ...JSON.parse(snapshotDoc()) }, null, 1)); }
function exportImage() {
  const url = snapshotPNG(); const b64 = atob(url.split(',')[1]); const u8 = new Uint8Array(b64.length); for (let i = 0; i < b64.length; i++) u8[i] = b64.charCodeAt(i);
  offerFile(safeName() + '.png', new Blob([u8], { type: 'image/png' }));
}
function importDoc(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try { const d = JSON.parse(fr.result); if (!Array.isArray(d.features)) throw new Error('Not a Kerf document');
      pushUndo(); App.doc = { ...newDoc(), ...d }; $('#docName').value = App.doc.name; regen(0); fitView(); toast(`Opened ${file.name}`); }
    catch (e) { toast('Could not open that file: ' + e.message, 'error'); }
  };
  fr.readAsText(file);
}
function confirmBox(title, text, okLabel, fn) {
  const m = el('div', { class: 'modal-bg' }, el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('h2', {}, title), el('p', {}, text),
    el('div', { class: 'modal-btns' }, el('button', { class: 'btn', onclick: () => m.remove() }, 'Cancel'), el('button', { class: 'btn primary', onclick: () => { m.remove(); fn(); } }, okLabel))));
  document.body.append(m); m.querySelector('.primary').focus();
}

/* ---------- toolbars ---------- */
function tb(id, ic, label, fn, key) {
  return el('button', { class: 'tb', id: 'tb-' + id, title: label + (key ? `  (${key})` : ''), 'aria-label': label, html: icon(ic), onclick: fn });
}
function renderToolbar() {
  const host = $('#toolbar'); host.innerHTML = '';
  if (SK) {
    const g1 = el('div', { class: 'tg' }, ...SKETCH_TOOLS.map((t) => { const b = tb(t.id, t.icon, t.label, () => setSketchTool(t.id), t.key === 'Escape' ? 'Esc' : t.key); b.dataset.tool = t.id; return b; }));
    const sides = el('label', { class: 'sides', title: 'Polygon sides' }, el('span', {}, 'Sides'), el('input', { type: 'number', min: '3', max: '64', value: String(SK.polySides), id: 'polySides', onchange: (e) => { SK.polySides = clamp(Math.round(+e.target.value || 6), 3, 64); setSketchTool('polygon'); }, onkeydown: (e) => e.stopPropagation() }));
    const g2 = el('div', { class: 'tg' }, ...SKETCH_CONS.map((t) => tb(t.id, t.icon, t.label, () => applySketchCommand(t.id), t.key)));
    const g3 = el('div', { class: 'tg' }, (() => { const b = tb('gridsnap', 'grid', 'Snap to grid', () => { SK.gridSnap = !SK.gridSnap; b.classList.toggle('on', SK.gridSnap); }); b.classList.toggle('on', SK.gridSnap); return b; })(),
      tb('normal', 'plane', 'View normal to sketch', () => viewNormalTo(SK.plane), 'N'), tb('skundo', 'undo', 'Undo in sketch', skUndo, 'Ctrl+Z'), tb('skredo', 'redo', 'Redo in sketch', skRedo, 'Ctrl+Y'));
    const done = el('button', { class: 'btn primary finish', onclick: commitDialog, title: 'Finish sketch (Enter)' }, el('span', { html: icon('check') }), 'Finish sketch');
    host.append(g1, sides, g2, g3, el('div', { class: 'spacer' }), done);
    updateSketchToolbar();
    return;
  }
  const groups = [
    [tb('undo', 'undo', 'Undo', undoDoc, 'Ctrl+Z'), tb('redo', 'redo', 'Redo', redoDoc, 'Ctrl+Y')],
    [tb('sketch', 'sketch', 'Sketch', () => startFeature('sketch'), 'Shift+S')],
    [tb('extrude', 'extrude', 'Extrude', () => startFeature('extrude'), 'Shift+E'), tb('revolve', 'revolve', 'Revolve', () => startFeature('revolve'), 'Shift+W'), tb('sweep', 'sweep', 'Sweep', () => startFeature('sweep')), tb('loft', 'loft', 'Loft', () => startFeature('loft'))],
    [tb('fillet', 'fillet', 'Fillet', () => startFeature('fillet'), 'Shift+F'), tb('chamfer', 'chamfer', 'Chamfer', () => startFeature('chamfer'), 'Shift+C'), tb('shell', 'shell', 'Shell', () => startFeature('shell')), tb('hole', 'hole', 'Hole', () => startFeature('hole'), 'Shift+H')],
    [tb('lpattern', 'lpattern', 'Linear pattern', () => startFeature('lpattern')), tb('cpattern', 'cpattern', 'Circular pattern', () => startFeature('cpattern')), tb('mirror', 'mirror', 'Mirror', () => startFeature('mirror'))],
    [tb('boolean', 'boolean', 'Boolean', () => startFeature('boolean')), tb('split', 'split', 'Split part', () => startFeature('split')), tb('transform', 'transform', 'Transform', () => startFeature('transform')), tb('deletePart', 'trash', 'Delete part', () => startFeature('deletePart'))],
    [tb('plane', 'plane', 'Plane', () => startFeature('plane'), 'Shift+P'), tb('box', 'box', 'Box', () => startFeature('primitive', { shape: 'box' })), tb('cyl', 'cylinder', 'Cylinder', () => startFeature('primitive', { shape: 'cylinder' })), tb('sph', 'sphere', 'Sphere / cone / torus', () => startFeature('primitive', { shape: 'sphere' })), tb('variable', 'variable', 'Variable', () => startFeature('variable'), 'Shift+V')],
    [tb('mass', 'mass', 'Mass properties', openMassPanel), tb('section', 'section', 'Section view', toggleSectionPanel), tb('display', 'display', 'Display mode', (e) => displayMenu(e))],
  ];
  for (const g of groups) host.append(el('div', { class: 'tg' }, ...g));
  updateUndoButtons();
  $('#tb-undo').id = 'btnUndo'; $('#tb-redo').id = 'btnRedo'; updateUndoButtons();
}
function updateSketchToolbar() { if (!SK) return; $$('#toolbar [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === SK.tool)); }
function displayMenu(e) {
  const b = e.currentTarget.getBoundingClientRect();
  const modes = [['shadedEdges', 'Shaded with edges'], ['shaded', 'Shaded'], ['hidden', 'Hidden line'], ['wire', 'Wireframe'], ['xray', 'Translucent']];
  showMenu(b.left, b.bottom + 6, [...modes.map(([k, n]) => [(View.display === k ? '● ' : '○ ') + n, () => { setDisplay(k); try { localStorage.setItem('kerf-display', k); } catch { /* */ } }]), null,
    [(View.camera.isPerspectiveCamera ? '● ' : '○ ') + 'Perspective', () => setProjection(!View.camera.isPerspectiveCamera)]]);
}
function toggleSectionPanel() {
  const p = $('#sectionPanel');
  if (!p.hidden) { p.hidden = true; setSection(null); return; }
  const box = sceneBox(); const s = View.section || { axis: 'y', offset: 0, flip: false };
  const range = () => { const a = s.axis; return [box.min[a] - 1, box.max[a] + 1]; };
  const [lo, hi] = range(); s.offset = clamp(s.offset, lo, hi) || (lo + hi) / 2;
  p.innerHTML = '';
  const slider = el('input', { type: 'range', id: 'secOff', min: String(lo), max: String(hi), step: 'any', value: String(s.offset), 'aria-label': 'Section offset', oninput: (e) => { s.offset = +e.target.value; val.textContent = fmt(s.offset, 2) + ' mm'; setSection({ ...s }); } });
  const val = el('span', { class: 'num' }, fmt(s.offset, 2) + ' mm');
  const axisSeg = el('div', { class: 'seg' }, ...['x', 'y', 'z'].map((a) => el('button', { class: s.axis === a ? 'on' : '', onclick: () => { s.axis = a; View.section = s; p.hidden = true; toggleSectionPanel(); } }, a.toUpperCase())));
  p.append(el('div', { class: 'mh' }, el('span', { html: icon('section') }), 'Section view', el('button', { class: 'x', 'aria-label': 'Close section view', html: icon('close'), onclick: () => { p.hidden = true; setSection(null); } })),
    el('div', { class: 'kv' }, el('span', {}, 'Normal axis'), axisSeg), el('div', { class: 'kv' }, el('span', {}, 'Offset'), val), slider,
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: s.flip, onchange: (e) => { s.flip = e.target.checked; setSection({ ...s }); } }), el('span', {}, 'Flip side')));
  p.hidden = false; setSection({ ...s });
}
function setHint(t) { const h = $('#hint'); if (h) { h.textContent = t; h.hidden = !t; } }

/* ---------- keyboard ---------- */
function initKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key; const mod = e.ctrlKey || e.metaKey;
    if (mod && k.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); SK ? skUndo() : undoDoc(); return; }
    if (mod && (k.toLowerCase() === 'y' || (k.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); SK ? skRedo() : redoDoc(); return; }
    if (mod) return;
    if (SK) {
      if (k === 'Escape') { if (SK.draw) { SK.draw = null; removeOrphansSoft(); renderSketch(); } else if (SK.tool !== 'select') setSketchTool('select'); else if (SK.sel.size) { SK.sel.clear(); renderSketch(); } return; }
      if (k === 'Enter') { if (SK.draw) finishDraw(); else commitDialog(); return; }
      if (k === 'Delete' || k === 'Backspace') { applySketchCommand('delete'); return; }
      if (k.toLowerCase() === 'n') { viewNormalTo(SK.plane); return; }
      const t = SKETCH_TOOLS.find((q) => q.key && q.key.toLowerCase() === k.toLowerCase()); if (t) { setSketchTool(t.id); return; }
      const c = SKETCH_CONS.find((q) => q.key && q.key.toLowerCase() === k.toLowerCase()); if (c) { applySketchCommand(c.id); return; }
      return;
    }
    if (App.dialog) { if (k === 'Escape') cancelDialog(); if (k === 'Enter') commitDialog(); return; }
    if (k === 'Escape') { App.sel = []; updateHighlights(); renderParts(); renderMeasure(); closeMenu(); return; }
    if (k === 'f' || k === 'F' && !e.shiftKey) { if (!e.shiftKey) { fitView(); return; } }
    if (e.shiftKey) {
      const map = { S: 'sketch', E: 'extrude', W: 'revolve', F: 'fillet', C: 'chamfer', H: 'hole', P: 'plane', V: 'variable' };
      const views = { '!': 'front', '@': 'back', '#': 'left', $: 'right', '%': 'top', '^': 'bottom', '&': 'iso' };
      const code = e.code.startsWith('Digit') ? ['', 'front', 'back', 'left', 'right', 'top', 'bottom', 'iso'][+e.code.slice(5)] : null;
      if (code) { setNamedView(code); return; }
      if (views[k]) { setNamedView(views[k]); return; }
      if (map[k.toUpperCase()]) { e.preventDefault(); startFeature(map[k.toUpperCase()]); return; }
    }
    if (k === '?') toggleHelp();
  });
}
function toggleHelp() {
  const m = $('#help'); m.hidden = !m.hidden;
}
