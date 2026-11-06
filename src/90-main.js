/* =====================================================================
   Sample document + boot
   ===================================================================== */
function sampleDoc() {
  const d = newDoc('Motor mount bracket');
  const F = (type, name, params) => { const f = { id: uid('f'), type, name, params: { ...defaultParams(type), ...params } }; d.features.push(f); d.counters[type] = (d.counters[type] || 0) + 1; return f; };
  const c = (o) => ({ id: uid('c'), ...o });
  F('variable', 'Variable 1', { vname: 'thick', value: '8 mm' });
  F('variable', 'Variable 2', { vname: 'width', value: '90 mm' });
  // base plate: center rectangle
  const s1 = { pts: [{ id: 'a', x: -45, y: -30 }, { id: 'b', x: 45, y: -30 }, { id: 'c', x: 45, y: 30 }, { id: 'd', x: -45, y: 30 }], ents: [], cons: [] };
  ['ab', 'bc', 'cd', 'da'].forEach((k, i) => s1.ents.push({ id: 'l' + i, type: 'line', p1: k[0], p2: k[1] }));
  s1.ents.push({ id: 'd1', type: 'line', p1: 'a', p2: 'c', construction: true }, { id: 'd2', type: 'line', p1: 'b', p2: 'd', construction: true });
  s1.cons.push(c({ type: 'horizontal', e1: 'l0' }), c({ type: 'vertical', e1: 'l1' }), c({ type: 'horizontal', e1: 'l2' }), c({ type: 'vertical', e1: 'l3' }),
    c({ type: 'midpoint', a: 'O', e1: 'd1' }), c({ type: 'midpoint', a: 'O', e1: 'd2' }),
    c({ type: 'length', e1: 'l0', value: '#width', lp: [0, -9] }), c({ type: 'length', e1: 'l1', value: '60', lp: [10, 0] }));
  const sk1 = F('sketch', 'Sketch 1', { plane: [{ kind: 'plane', id: 'top' }], data: s1 });
  const ex1 = F('extrude', 'Extrude 1', { entities: [{ kind: 'region', sketch: sk1.id, pt: [5, 5] }], depth: '#thick', op: 'new' });
  void ex1;
  const top = { kind: 'face', part: ex1.id, n: [0, 0, 1], p: [30, 25, 8] };
  // boss
  const s2 = { pts: [], ents: [{ id: 'k', type: 'circle', c: 'O', r: 14 }], cons: [c({ type: 'diameter', e1: 'k', value: '28', lp: [14, 12] })] };
  const sk2 = F('sketch', 'Sketch 2', { plane: [top], data: s2 });
  F('extrude', 'Extrude 2', { entities: [{ kind: 'region', sketch: sk2.id, pt: [0, 0] }], depth: '22', op: 'add' });
  // mounting holes
  const s3 = { pts: [{ id: 'a', x: -35, y: -20 }, { id: 'b', x: 35, y: -20 }, { id: 'c', x: 35, y: 20 }, { id: 'd', x: -35, y: 20 }], ents: [], cons: [] };
  ['ab', 'bc', 'cd', 'da'].forEach((k, i) => s3.ents.push({ id: 'l' + i, type: 'line', p1: k[0], p2: k[1], construction: true }));
  ['a', 'b', 'c', 'd'].forEach((p) => s3.ents.push({ id: 'pt' + p, type: 'point', p }));
  s3.ents.push({ id: 'd1', type: 'line', p1: 'a', p2: 'c', construction: true });
  s3.cons.push(c({ type: 'horizontal', e1: 'l0' }), c({ type: 'vertical', e1: 'l1' }), c({ type: 'horizontal', e1: 'l2' }), c({ type: 'vertical', e1: 'l3' }), c({ type: 'midpoint', a: 'O', e1: 'd1' }),
    c({ type: 'length', e1: 'l0', value: '#width - 20', lp: [0, -7] }), c({ type: 'length', e1: 'l1', value: '40', lp: [8, 0] }));
  const sk3 = F('sketch', 'Sketch 3', { plane: [top], data: s3 });
  F('hole', 'Hole 1', { sketch: [{ kind: 'sketch', id: sk3.id }], style: 'cbore', dia: '6.6', cboreDia: '11', cboreDepth: '4.4', endType: 'through' });
  // bore through boss
  const s4 = { pts: [], ents: [{ id: 'k', type: 'circle', c: 'O', r: 8 }], cons: [c({ type: 'diameter', e1: 'k', value: '16', lp: [9, 9] })] };
  const sk4 = F('sketch', 'Sketch 4', { plane: [{ kind: 'face', part: ex1.id, n: [0, 0, 1], p: [10, 5, 30] }], data: s4 });
  F('extrude', 'Extrude 3', { entities: [{ kind: 'region', sketch: sk4.id, pt: [0, 0] }], endType: 'through', flip: true, op: 'remove' });
  // rounded corners
  const E = (x, y) => ({ kind: 'edge', part: ex1.id, a: [x, y, 0], b: [x, y, 8] });
  F('fillet', 'Fillet 1', { edges: [E(45, 30), E(-45, 30), E(45, -30), E(-45, -30)], radius: '8' });
  // gusset rib on the Front plane
  const s5 = { pts: [{ id: 'g1', x: 13, y: 8 }, { id: 'g2', x: 27, y: 8 }, { id: 'g3', x: 13, y: 22 }], ents: [], cons: [] };
  s5.ents.push({ id: 'r0', type: 'line', p1: 'g1', p2: 'g2' }, { id: 'r1', type: 'line', p1: 'g2', p2: 'g3' }, { id: 'r2', type: 'line', p1: 'g3', p2: 'g1' });
  s5.cons.push(c({ type: 'horizontal', e1: 'r0' }), c({ type: 'vertical', e1: 'r2' }),
    c({ type: 'length', e1: 'r0', value: '14', lp: [0, -5] }), c({ type: 'length', e1: 'r2', value: '14', lp: [-6, 0] }),
    c({ type: 'hdistance', a: 'O', b: 'g1', value: '13', lp: [0, -14] }), c({ type: 'vdistance', a: 'O', b: 'g1', value: '#thick', lp: [-22, 0] }));
  const sk5 = F('sketch', 'Sketch 5', { plane: [{ kind: 'plane', id: 'front' }], data: s5 });
  const rib = F('extrude', 'Extrude 4', { entities: [{ kind: 'region', sketch: sk5.id, pt: [16, 12] }], endType: 'symmetric', depth: '5', op: 'add' });
  F('cpattern', 'Circular pattern 1', { mode: 'feature', features: [{ kind: 'feature', id: rib.id }], axisSel: 'Z', angle: '360', count: '4', equal: true });
  d.partProps[ex1.id] = { name: 'Bracket', color: '#9aa7b4', material: 'aluminum', hidden: false };
  d.vis = {};
  return d;
}

function boot() {
  try { App.dlReady = window.claude && window.claude.use ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null); } catch { App.dlReady = Promise.resolve(null); }
  initView($('#viewport'));
  initPointer(); initKeys();
  try { const m = localStorage.getItem('kerf-display'); if (m) View.display = m; } catch { /* */ }
  App.doc = loadLocal() || sampleDoc();
  App.doc = { ...newDoc(), ...App.doc };
  $('#docName').value = App.doc.name;
  $('#docName').addEventListener('input', (e) => { App.doc.name = e.target.value; saveLocal(); });
  $('#docName').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); });
  $('#btnNew').addEventListener('click', () => confirmBox('Start a new part studio?', 'The current model is replaced. You can undo this with Ctrl+Z.', 'Start new', () => { pushUndo(); App.doc = newDoc(); $('#docName').value = App.doc.name; App.sel = []; regen(0); fitView(v3(NAMED_VIEWS.iso)); }));
  $('#btnSample').addEventListener('click', () => confirmBox('Load the sample bracket?', 'The current model is replaced. You can undo this with Ctrl+Z.', 'Load sample', () => { pushUndo(); App.doc = sampleDoc(); $('#docName').value = App.doc.name; App.sel = []; regen(0); fitView(v3(NAMED_VIEWS.iso)); }));
  $('#btnOpen').addEventListener('click', () => $('#fileIn').click());
  $('#fileIn').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importDoc(f); e.target.value = ''; });
  $('#btnExport').addEventListener('click', (e) => { const b = e.currentTarget.getBoundingClientRect(); exportMenu(b.left, b.bottom + 6); });
  $('#btnHelp').addEventListener('click', toggleHelp);
  $('#helpClose').addEventListener('click', toggleHelp);
  $('#btnFit').addEventListener('click', () => fitView());
  $('#btnIso').addEventListener('click', () => setNamedView('iso'));
  $('#btnSide').addEventListener('click', () => document.body.classList.toggle('side-open'));
  renderToolbar();
  regen(0);
  // initial camera, no animation
  const box = sceneBox(); const cpos = box.getCenter(new V3()); const size = box.getSize(new V3()).length() || 100;
  View.camera.position.copy(cpos).addScaledVector(v3(NAMED_VIEWS.iso).normalize(), size * 2); View.controls.target.copy(cpos);
  View.camera.zoom = View.viewH / (size * 1.25); View.camera.updateProjectionMatrix(); View.controls.update();
  setDisplay(View.display);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const retheme = () => { readColors(); buildOrigin(); View.partViews.forEach((pv) => { pv.group.parent?.remove(pv.group); disposeObj(pv.group); }); View.partViews.clear(); refreshAll(); if (SK) renderSketch(); };
  media.addEventListener('change', retheme);
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  $('#status').textContent = `Regenerated ${App.doc.features.length} features in ${Math.round(App.lastRegenMs)} ms`;
  document.body.classList.add('ready');
}
try { boot(); } catch (e) { console.error(e); const b = $('#bootErr'); if (b) { b.hidden = false; b.textContent = 'Kerf could not start: ' + e.message; } }
// handle for scripting and debugging from the console
window.kerf = { App, View, get sketch() { return SK; }, regen, analyze, toScreen, skScr: (u, v) => skScr(u, v), V3 };
