/* =====================================================================
   Model export formats. Input: [{ name, color: '#rrggbb', solid }].
   Kerf works in millimetres with +Z up; each writer converts to the
   unit and up-axis its format expects.
   ===================================================================== */
const _enc = new TextEncoder();
const hexRGB = (c) => { const h = String(c || '#9aa7b4').replace('#', ''); const f = h.length === 3 ? h.split('').map((q) => q + q).join('') : h; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255); };
const srgbToLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const n6 = (v) => (Math.abs(v) < 1e-12 ? '0' : (+v.toFixed(6)).toString());
const safeId = (s, i) => (String(s || 'Part').replace(/[^A-Za-z0-9_]/g, '_').replace(/^([^A-Za-z_])/, '_$1') || 'Part') + '_' + (i + 1);
function concatBytes(list) { const n = list.reduce((a, b) => a + b.length, 0); const o = new Uint8Array(n); let p = 0; for (const b of list) { o.set(b, p); p += b.length; } return o; }
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(u8).toString('base64'); }
const triNormal = (s, t) => { const a = s.vert(s.idx[t * 3]), b = s.vert(s.idx[t * 3 + 1]), c = s.vert(s.idx[t * 3 + 2]); return new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).normalize(); };

/* ---- STL ---- */
function fmtSTLAscii(parts) {
  const out = [];
  for (const p of parts) {
    const s = p.solid; const name = String(p.name).replace(/\s+/g, '_');
    out.push(`solid ${name}\n`);
    for (let t = 0; t < s.nt; t++) {
      const n = triNormal(s, t); out.push(` facet normal ${n6(n.x)} ${n6(n.y)} ${n6(n.z)}\n  outer loop\n`);
      for (let k = 0; k < 3; k++) { const v = s.idx[t * 3 + k]; out.push(`   vertex ${n6(s.pos[v * 3])} ${n6(s.pos[v * 3 + 1])} ${n6(s.pos[v * 3 + 2])}\n`); }
      out.push('  endloop\n endfacet\n');
    }
    out.push(`endsolid ${name}\n`);
  }
  return out.join('');
}

/* ---- OBJ + MTL ---- */
function fmtOBJ(parts, base) {
  let obj = `# Kerf CAD export, units: mm, +Z up\nmtllib ${base}.mtl\n`, mtl = '# Kerf CAD materials\n', off = 1;
  parts.forEach((p, i) => {
    const s = p.solid, id = safeId(p.name, i), [r, g, b] = hexRGB(p.color);
    mtl += `newmtl ${id}\nKd ${n6(r)} ${n6(g)} ${n6(b)}\nKa 0 0 0\nKs 0.2 0.2 0.2\nNs 40\nd 1\nillum 2\n\n`;
    const L = [`o ${id}\nusemtl ${id}\n`];
    for (let v = 0; v < s.nv; v++) L.push(`v ${n6(s.pos[v * 3])} ${n6(s.pos[v * 3 + 1])} ${n6(s.pos[v * 3 + 2])}\n`);
    for (let t = 0; t < s.nt; t++) L.push(`f ${s.idx[t * 3] + off} ${s.idx[t * 3 + 1] + off} ${s.idx[t * 3 + 2] + off}\n`);
    obj += L.join(''); off += s.nv;
  });
  return [{ name: base + '.obj', data: obj }, { name: base + '.mtl', data: mtl }];
}

/* ---- PLY (binary, per-vertex colour) ---- */
function fmtPLY(parts) {
  const nv = parts.reduce((a, p) => a + p.solid.nv, 0), nt = parts.reduce((a, p) => a + p.solid.nt, 0);
  const head = _enc.encode(`ply\nformat binary_little_endian 1.0\ncomment Kerf CAD export, units: mm\nelement vertex ${nv}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face ${nt}\nproperty list uchar int vertex_indices\nend_header\n`);
  const body = new DataView(new ArrayBuffer(nv * 15 + nt * 13)); let o = 0;
  for (const p of parts) { const c = hexRGB(p.color).map((q) => Math.round(q * 255)); for (let v = 0; v < p.solid.nv; v++) { for (let k = 0; k < 3; k++) { body.setFloat32(o, p.solid.pos[v * 3 + k], true); o += 4; } for (const q of c) body.setUint8(o++, q); } }
  let base = 0;
  for (const p of parts) { for (let t = 0; t < p.solid.nt; t++) { body.setUint8(o++, 3); for (let k = 0; k < 3; k++) { body.setInt32(o, p.solid.idx[t * 3 + k] + base, true); o += 4; } } base += p.solid.nv; }
  return concatBytes([head, new Uint8Array(body.buffer)]);
}

/* ---- OFF ---- */
function fmtOFF(parts) {
  const nv = parts.reduce((a, p) => a + p.solid.nv, 0), nt = parts.reduce((a, p) => a + p.solid.nt, 0);
  const L = [`OFF\n# Kerf CAD export, units: mm\n${nv} ${nt} 0\n`]; let base = 0;
  for (const p of parts) for (let v = 0; v < p.solid.nv; v++) L.push(`${n6(p.solid.pos[v * 3])} ${n6(p.solid.pos[v * 3 + 1])} ${n6(p.solid.pos[v * 3 + 2])}\n`);
  for (const p of parts) { for (let t = 0; t < p.solid.nt; t++) L.push(`3 ${p.solid.idx[t * 3] + base} ${p.solid.idx[t * 3 + 1] + base} ${p.solid.idx[t * 3 + 2] + base}\n`); base += p.solid.nv; }
  return L.join('');
}

/* ---- AMF ---- */
function fmtAMF(parts) {
  const L = ['<?xml version="1.0" encoding="UTF-8"?>\n<amf unit="millimeter" version="1.1">\n <metadata type="producer">Kerf CAD</metadata>\n'];
  parts.forEach((p, i) => { const [r, g, b] = hexRGB(p.color); L.push(` <material id="${i + 1}"><metadata type="name">${xmlEsc(p.name)}</metadata><color><r>${n6(r)}</r><g>${n6(g)}</g><b>${n6(b)}</b></color></material>\n`); });
  parts.forEach((p, i) => {
    const s = p.solid; L.push(` <object id="${i + 1}">\n  <metadata type="name">${xmlEsc(p.name)}</metadata>\n  <mesh>\n   <vertices>\n`);
    for (let v = 0; v < s.nv; v++) L.push(`    <vertex><coordinates><x>${n6(s.pos[v * 3])}</x><y>${n6(s.pos[v * 3 + 1])}</y><z>${n6(s.pos[v * 3 + 2])}</z></coordinates></vertex>\n`);
    L.push(`   </vertices>\n   <volume materialid="${i + 1}">\n`);
    for (let t = 0; t < s.nt; t++) L.push(`    <triangle><v1>${s.idx[t * 3]}</v1><v2>${s.idx[t * 3 + 1]}</v2><v3>${s.idx[t * 3 + 2]}</v3></triangle>\n`);
    L.push('   </volume>\n  </mesh>\n </object>\n');
  });
  L.push('</amf>\n'); return L.join('');
}

/* ---- X3D and VRML (Y-up, so the model is rotated -90° about X) ---- */
function fmtX3D(parts) {
  const L = ['<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE X3D PUBLIC "ISO//Web3D//DTD X3D 3.3//EN" "http://www.web3d.org/specifications/x3d-3.3.dtd">\n<X3D profile="Interchange" version="3.3">\n <head><meta name="generator" content="Kerf CAD"/><unit category="length" name="millimeter" conversionFactor="0.001"/></head>\n <Scene>\n  <Transform rotation="1 0 0 -1.5707963">\n'];
  parts.forEach((p) => {
    const s = p.solid, [r, g, b] = hexRGB(p.color); const ci = [], pt = [];
    for (let t = 0; t < s.nt; t++) ci.push(`${s.idx[t * 3]} ${s.idx[t * 3 + 1]} ${s.idx[t * 3 + 2]} -1`);
    for (let v = 0; v < s.nv; v++) pt.push(`${n6(s.pos[v * 3])} ${n6(s.pos[v * 3 + 1])} ${n6(s.pos[v * 3 + 2])}`);
    L.push(`   <Shape DEF="${safeId(p.name, parts.indexOf(p))}">\n    <Appearance><Material diffuseColor="${n6(r)} ${n6(g)} ${n6(b)}" specularColor="0.2 0.2 0.2"/></Appearance>\n    <IndexedFaceSet solid="true" creaseAngle="0.5" coordIndex="${ci.join(' ')}">\n     <Coordinate point="${pt.join(', ')}"/>\n    </IndexedFaceSet>\n   </Shape>\n`);
  });
  L.push('  </Transform>\n </Scene>\n</X3D>\n'); return L.join('');
}
function fmtWRL(parts) {
  const L = ['#VRML V2.0 utf8\n# Kerf CAD export, units: mm\nTransform {\n rotation 1 0 0 -1.5707963\n children [\n'];
  parts.forEach((p, i) => {
    const s = p.solid, [r, g, b] = hexRGB(p.color); const ci = [], pt = [];
    for (let t = 0; t < s.nt; t++) ci.push(`${s.idx[t * 3]}, ${s.idx[t * 3 + 1]}, ${s.idx[t * 3 + 2]}, -1`);
    for (let v = 0; v < s.nv; v++) pt.push(`${n6(s.pos[v * 3])} ${n6(s.pos[v * 3 + 1])} ${n6(s.pos[v * 3 + 2])}`);
    L.push(`  DEF ${safeId(p.name, i)} Shape {\n   appearance Appearance { material Material { diffuseColor ${n6(r)} ${n6(g)} ${n6(b)} } }\n   geometry IndexedFaceSet {\n    solid TRUE\n    creaseAngle 0.5\n    coord Coordinate { point [ ${pt.join(', ')} ] }\n    coordIndex [ ${ci.join(', ')} ]\n   }\n  }\n`);
  });
  L.push(' ]\n}\n'); return L.join('');
}

/* ---- Collada 1.4.1 ---- */
function fmtDAE(parts) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const fx = [], mats = [], geos = [], nodes = [];
  parts.forEach((p, i) => {
    const id = safeId(p.name, i), s = p.solid, [r, g, b] = hexRGB(p.color);
    fx.push(`  <effect id="${id}-fx"><profile_COMMON><technique sid="common"><phong><diffuse><color>${n6(r)} ${n6(g)} ${n6(b)} 1</color></diffuse><specular><color>0.2 0.2 0.2 1</color></specular><shininess><float>40</float></shininess></phong></technique></profile_COMMON></effect>\n`);
    mats.push(`  <material id="${id}-mat" name="${xmlEsc(p.name)}"><instance_effect url="#${id}-fx"/></material>\n`);
    const pos = []; for (let v = 0; v < s.nv; v++) pos.push(`${n6(s.pos[v * 3])} ${n6(s.pos[v * 3 + 1])} ${n6(s.pos[v * 3 + 2])}`);
    const idx = Array.from(s.idx).join(' ');
    geos.push(`  <geometry id="${id}-geo" name="${xmlEsc(p.name)}"><mesh>\n   <source id="${id}-pos"><float_array id="${id}-pos-arr" count="${s.nv * 3}">${pos.join(' ')}</float_array><technique_common><accessor source="#${id}-pos-arr" count="${s.nv}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>\n   <vertices id="${id}-vtx"><input semantic="POSITION" source="#${id}-pos"/></vertices>\n   <triangles material="m" count="${s.nt}"><input semantic="VERTEX" source="#${id}-vtx" offset="0"/><p>${idx}</p></triangles>\n  </mesh></geometry>\n`);
    nodes.push(`   <node id="${id}" name="${xmlEsc(p.name)}" type="NODE"><instance_geometry url="#${id}-geo"><bind_material><technique_common><instance_material symbol="m" target="#${id}-mat"/></technique_common></bind_material></instance_geometry></node>\n`);
  });
  return `<?xml version="1.0" encoding="utf-8"?>\n<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">\n <asset><contributor><authoring_tool>Kerf CAD</authoring_tool></contributor><created>${now}</created><modified>${now}</modified><unit name="millimeter" meter="0.001"/><up_axis>Z_UP</up_axis></asset>\n <library_effects>\n${fx.join('')} </library_effects>\n <library_materials>\n${mats.join('')} </library_materials>\n <library_geometries>\n${geos.join('')} </library_geometries>\n <library_visual_scenes>\n  <visual_scene id="Scene" name="Scene">\n${nodes.join('')}  </visual_scene>\n </library_visual_scenes>\n <scene><instance_visual_scene url="#Scene"/></scene>\n</COLLADA>\n`;
}

/* ---- USD (usda text) ---- */
function fmtUSDA(parts) {
  const L = ['#usda 1.0\n(\n    defaultPrim = "Kerf"\n    metersPerUnit = 0.001\n    upAxis = "Z"\n    doc = "Kerf CAD export"\n)\n\ndef Xform "Kerf"\n{\n'];
  parts.forEach((p, i) => {
    const s = p.solid, [r, g, b] = hexRGB(p.color);
    const pts = []; for (let v = 0; v < s.nv; v++) pts.push(`(${n6(s.pos[v * 3])}, ${n6(s.pos[v * 3 + 1])}, ${n6(s.pos[v * 3 + 2])})`);
    L.push(`    def Mesh "${safeId(p.name, i)}"\n    {\n        uniform bool doubleSided = 0\n        int[] faceVertexCounts = [${new Array(s.nt).fill(3).join(', ')}]\n        int[] faceVertexIndices = [${Array.from(s.idx).join(', ')}]\n        point3f[] points = [${pts.join(', ')}]\n        color3f[] primvars:displayColor = [(${n6(r)}, ${n6(g)}, ${n6(b)})] (\n            interpolation = "constant"\n        )\n        uniform token subdivisionScheme = "none"\n    }\n`);
  });
  L.push('}\n'); return L.join('');
}

/* ---- glTF 2.0 / GLB (metres, +Y up) ---- */
function gltfBuild(parts) {
  const json = { asset: { version: '2.0', generator: 'Kerf CAD' }, scene: 0, scenes: [{ name: 'Kerf', nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [] };
  const bins = []; let off = 0;
  const addView = (arr, target) => { const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: u8.length, target }); bins.push(u8); off += u8.length; const pad = (4 - (off % 4)) % 4; if (pad) { bins.push(new Uint8Array(pad)); off += pad; } return json.bufferViews.length - 1; };
  parts.forEach((p, i) => {
    const rd = renderData(p.solid); const n = rd.pos.length / 3;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < n; k++) {
      const x = rd.pos[k * 3] / 1000, y = rd.pos[k * 3 + 2] / 1000, z = -rd.pos[k * 3 + 1] / 1000; // Z-up mm -> Y-up m
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      nor[k * 3] = rd.nor[k * 3]; nor[k * 3 + 1] = rd.nor[k * 3 + 2]; nor[k * 3 + 2] = -rd.nor[k * 3 + 1];
      [x, y, z].forEach((v, a) => { mn[a] = Math.min(mn[a], v); mx[a] = Math.max(mx[a], v); });
    }
    const pv = addView(pos, 34962), nv = addView(nor, 34962);
    json.accessors.push({ bufferView: pv, componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx }, { bufferView: nv, componentType: 5126, count: n, type: 'VEC3' });
    const c = hexRGB(p.color).map(srgbToLin);
    json.materials.push({ name: p.name, pbrMetallicRoughness: { baseColorFactor: [...c, 1], metallicFactor: 0.1, roughnessFactor: 0.6 } });
    json.meshes.push({ name: p.name, primitives: [{ attributes: { POSITION: json.accessors.length - 2, NORMAL: json.accessors.length - 1 }, material: i, mode: 4 }] });
    json.nodes.push({ name: p.name, mesh: i }); json.scenes[0].nodes.push(i);
  });
  const bin = concatBytes(bins); json.buffers.push({ byteLength: bin.length });
  return { json, bin };
}
function fmtGLB(parts) {
  const { json, bin } = gltfBuild(parts);
  let js = _enc.encode(JSON.stringify(json)); const jpad = (4 - (js.length % 4)) % 4; js = concatBytes([js, _enc.encode(' '.repeat(jpad))]);
  const total = 12 + 8 + js.length + 8 + bin.length;
  const h = new DataView(new ArrayBuffer(28));
  h.setUint32(0, 0x46546c67, true); h.setUint32(4, 2, true); h.setUint32(8, total, true); h.setUint32(12, js.length, true); h.setUint32(16, 0x4e4f534a, true);
  const h2 = new DataView(new ArrayBuffer(8)); h2.setUint32(0, bin.length, true); h2.setUint32(4, 0x004e4942, true);
  return concatBytes([new Uint8Array(h.buffer, 0, 20), js, new Uint8Array(h2.buffer), bin]);
}
function fmtGLTF(parts) { const { json, bin } = gltfBuild(parts); json.buffers[0].uri = 'data:application/octet-stream;base64,' + b64(bin); return JSON.stringify(json, null, 1); }

/* ---- FBX 7.4 binary ---- */
function fbxNode(name, props = [], children = []) { return { name, props, children }; }
const P70 = (...ps) => fbxNode('Properties70', [], ps.map((p) => fbxNode('P', p)));
function fbxPropBytes([t, v]) {
  const dv = (n) => new DataView(new ArrayBuffer(n));
  if (t === 'C') return new Uint8Array([67, v ? 1 : 0]);
  if (t === 'I') { const d = dv(5); d.setUint8(0, 73); d.setInt32(1, v, true); return new Uint8Array(d.buffer); }
  if (t === 'D') { const d = dv(9); d.setUint8(0, 68); d.setFloat64(1, v, true); return new Uint8Array(d.buffer); }
  if (t === 'L') { const d = dv(9); d.setUint8(0, 76); d.setBigInt64(1, BigInt(v), true); return new Uint8Array(d.buffer); }
  if (t === 'S' || t === 'R') { const b = typeof v === 'string' ? _enc.encode(v) : v; const d = dv(5); d.setUint8(0, t.charCodeAt(0)); d.setUint32(1, b.length, true); return concatBytes([new Uint8Array(d.buffer), b]); }
  if (t === 'd' || t === 'i') {
    const sz = t === 'd' ? 8 : 4; const d = dv(13 + v.length * sz);
    d.setUint8(0, t.charCodeAt(0)); d.setUint32(1, v.length, true); d.setUint32(5, 0, true); d.setUint32(9, v.length * sz, true);
    for (let k = 0; k < v.length; k++) t === 'd' ? d.setFloat64(13 + k * 8, v[k], true) : d.setInt32(13 + k * 4, v[k], true);
    return new Uint8Array(d.buffer);
  }
  throw new Error('FBX property type ' + t);
}
function fbxNodeBytes(node, start, isLast) {
  const name = _enc.encode(node.name); const props = node.props.map(fbxPropBytes); const plen = props.reduce((a, b) => a + b.length, 0);
  const headLen = 13 + name.length; let pos = start + headLen + plen; const kids = [];
  node.children.forEach((c, i) => { const b = fbxNodeBytes(c, pos, i === node.children.length - 1); kids.push(b); pos += b.length; });
  const sentinel = node.children.length || (!node.props.length && !isLast) ? new Uint8Array(13) : new Uint8Array(0);
  pos += sentinel.length;
  const h = new DataView(new ArrayBuffer(13)); h.setUint32(0, pos, true); h.setUint32(4, node.props.length, true); h.setUint32(8, plen, true); h.setUint8(12, name.length);
  return concatBytes([new Uint8Array(h.buffer), name, ...props, ...kids, sentinel]);
}
function fmtFBX(parts) {
  let nextId = 1000000; const objs = [], conns = [];
  parts.forEach((p, i) => {
    const s = p.solid; const gid = nextId++, mid = nextId++, matid = nextId++; const nm = String(p.name || 'Part ' + (i + 1));
    const verts = Array.from(s.pos, (q) => +q); const pvi = [];
    for (let t = 0; t < s.nt; t++) pvi.push(s.idx[t * 3], s.idx[t * 3 + 1], -s.idx[t * 3 + 2] - 1);
    const rd = renderData(s); const normals = Array.from(rd.nor, (q) => +q);
    objs.push(fbxNode('Geometry', [['L', gid], ['S', nm + '\x00\x01Geometry'], ['S', 'Mesh']], [
      P70(), fbxNode('GeometryVersion', [['I', 124]]),
      fbxNode('Vertices', [['d', verts]]), fbxNode('PolygonVertexIndex', [['i', pvi]]),
      fbxNode('LayerElementNormal', [['I', 0]], [fbxNode('Version', [['I', 102]]), fbxNode('Name', [['S', '']]), fbxNode('MappingInformationType', [['S', 'ByPolygonVertex']]), fbxNode('ReferenceInformationType', [['S', 'Direct']]), fbxNode('Normals', [['d', normals]])]),
      fbxNode('LayerElementMaterial', [['I', 0]], [fbxNode('Version', [['I', 101]]), fbxNode('Name', [['S', '']]), fbxNode('MappingInformationType', [['S', 'AllSame']]), fbxNode('ReferenceInformationType', [['S', 'IndexToDirect']]), fbxNode('Materials', [['i', [0]]])]),
      fbxNode('Layer', [['I', 0]], [fbxNode('Version', [['I', 100]]), fbxNode('LayerElement', [], [fbxNode('Type', [['S', 'LayerElementNormal']]), fbxNode('TypedIndex', [['I', 0]])]), fbxNode('LayerElement', [], [fbxNode('Type', [['S', 'LayerElementMaterial']]), fbxNode('TypedIndex', [['I', 0]])])]),
    ]));
    objs.push(fbxNode('Model', [['L', mid], ['S', nm + '\x00\x01Model'], ['S', 'Mesh']], [fbxNode('Version', [['I', 232]]), P70(), fbxNode('Shading', [['C', true]]), fbxNode('Culling', [['S', 'CullingOff']])]));
    const [r, g, b] = hexRGB(p.color);
    objs.push(fbxNode('Material', [['L', matid], ['S', nm + '\x00\x01Material'], ['S', '']], [fbxNode('Version', [['I', 102]]), fbxNode('ShadingModel', [['S', 'phong']]), fbxNode('MultiLayer', [['I', 0]]),
      P70([['S', 'DiffuseColor'], ['S', 'Color'], ['S', ''], ['S', 'A'], ['D', r], ['D', g], ['D', b]], [['S', 'Diffuse'], ['S', 'Vector3D'], ['S', 'Vector'], ['S', ''], ['D', r], ['D', g], ['D', b]])]));
    conns.push(fbxNode('C', [['S', 'OO'], ['L', mid], ['L', 0]]), fbxNode('C', [['S', 'OO'], ['L', gid], ['L', mid]]), fbxNode('C', [['S', 'OO'], ['L', matid], ['L', mid]]));
  });
  const I = (n, v) => [['S', n], ['S', 'int'], ['S', 'Integer'], ['S', ''], ['I', v]], D = (n, v) => [['S', n], ['S', 'double'], ['S', 'Number'], ['S', ''], ['D', v]];
  const root = [
    fbxNode('FBXHeaderExtension', [], [fbxNode('FBXHeaderVersion', [['I', 1003]]), fbxNode('FBXVersion', [['I', 7400]]), fbxNode('Creator', [['S', 'Kerf CAD']])]),
    fbxNode('FileId', [['R', new Uint8Array([0x28, 0xb3, 0x2a, 0xeb, 0xb6, 0x24, 0xcc, 0xc2, 0xbf, 0xc8, 0xb0, 0x2a, 0xa9, 0x2b, 0xfc, 0xf1])]]),
    fbxNode('CreationTime', [['S', '1970-01-01 10:00:00:000']]),
    fbxNode('Creator', [['S', 'Kerf CAD']]),
    fbxNode('GlobalSettings', [], [fbxNode('Version', [['I', 1000]]), P70(I('UpAxis', 2), I('UpAxisSign', 1), I('FrontAxis', 1), I('FrontAxisSign', -1), I('CoordAxis', 0), I('CoordAxisSign', 1), I('OriginalUpAxis', 2), I('OriginalUpAxisSign', 1), D('UnitScaleFactor', 0.1), D('OriginalUnitScaleFactor', 0.1))]),
    fbxNode('Documents', [], [fbxNode('Count', [['I', 1]]), fbxNode('Document', [['L', 999999], ['S', ''], ['S', 'Scene']], [P70(), fbxNode('RootNode', [['L', 0]])])]),
    fbxNode('References'),
    fbxNode('Definitions', [], [fbxNode('Version', [['I', 100]]), fbxNode('Count', [['I', 1 + parts.length * 3]]),
      fbxNode('ObjectType', [['S', 'GlobalSettings']], [fbxNode('Count', [['I', 1]])]), fbxNode('ObjectType', [['S', 'Model']], [fbxNode('Count', [['I', parts.length]])]),
      fbxNode('ObjectType', [['S', 'Geometry']], [fbxNode('Count', [['I', parts.length]])]), fbxNode('ObjectType', [['S', 'Material']], [fbxNode('Count', [['I', parts.length]])])]),
    fbxNode('Objects', [], objs),
    fbxNode('Connections', [], conns),
  ];
  const head = concatBytes([_enc.encode('Kaydara FBX Binary  \x00'), new Uint8Array([0x1a, 0x00]), new Uint8Array(new Uint32Array([7400]).buffer)]);
  const chunks = [head]; let pos = head.length;
  root.forEach((n, i) => { const b = fbxNodeBytes(n, pos, i === root.length - 1); chunks.push(b); pos += b.length; });
  chunks.push(new Uint8Array(13)); pos += 13;
  const foot = [0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66, 0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e];
  chunks.push(new Uint8Array(foot), new Uint8Array(4)); pos += 20;
  let pad = ((pos + 15) & ~15) - pos; if (pad === 0) pad = 16;
  chunks.push(new Uint8Array(pad), new Uint8Array(new Uint32Array([7400]).buffer), new Uint8Array(120),
    new Uint8Array([0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e, 0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b]));
  return concatBytes(chunks);
}

/* ---- STEP AP203: planar faces kept whole, curved faces faceted ---- */
function fmtSTEP(parts, base) {
  let id = 0; const L = []; const E = (s) => { id++; L.push(`#${id}=${s};`); return '#' + id; };
  const R = (v) => { const s = (+v.toFixed(6)).toString(); return s.includes('.') || s.includes('e') ? s.replace('e', 'E') : s + '.'; };
  const str = (s) => "'" + String(s).replace(/'/g, "''").replace(/[^\x20-\x7e]/g, '_') + "'";
  const appCtx = E("APPLICATION_CONTEXT('configuration controlled 3D designs of mechanical parts and assemblies')");
  E(`APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,${appCtx})`);
  const mechCtx = E(`MECHANICAL_CONTEXT('',${appCtx},'mechanical')`), desCtx = E(`DESIGN_CONTEXT('',${appCtx},'design')`);
  const lu = E('(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))'), au = E('(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))'), su = E('(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())');
  const unc = E(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-04),${lu},'distance_accuracy_value','confusion accuracy')`);
  const geo = E(`(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${unc}))GLOBAL_UNIT_ASSIGNED_CONTEXT((${lu},${au},${su}))REPRESENTATION_CONTEXT('Kerf','3D'))`);
  const origin = E("CARTESIAN_POINT('',(0.,0.,0.))"), dz = E("DIRECTION('',(0.,0.,1.))"), dx = E("DIRECTION('',(1.,0.,0.))");
  const ax = E(`AXIS2_PLACEMENT_3D('',${origin},${dz},${dx})`);
  parts.forEach((p) => {
    const s = p.solid; const an = analyze(s);
    const vp = new Map(); const pt = (v) => { let r = vp.get(v); if (!r) { r = E(`CARTESIAN_POINT('',(${R(s.pos[v * 3])},${R(s.pos[v * 3 + 1])},${R(s.pos[v * 3 + 2])}))`); vp.set(v, r); } return r; };
    const plane = (n, at) => { const o = E(`CARTESIAN_POINT('',(${R(at.x)},${R(at.y)},${R(at.z)}))`); const nd = E(`DIRECTION('',(${R(n.x)},${R(n.y)},${R(n.z)}))`); const ref = Math.abs(n.z) < 0.9 ? new V3(0, 0, 1).cross(n).normalize() : new V3(1, 0, 0); const rd = E(`DIRECTION('',(${R(ref.x)},${R(ref.y)},${R(ref.z)}))`); return E(`PLANE('',${E(`AXIS2_PLACEMENT_3D('',${o},${nd},${rd})`)})`); };
    const faces = [];
    for (const f of an.faces.values()) {
      if (f.planar) {
        const loops = faceLoopIndices(s, f);
        if (loops) {
          const pl = plane(f.normal, s.vert(s.idx[f.tris[0] * 3]));
          const bounds = loops.map((L2, k) => E(`${k === 0 ? 'FACE_OUTER_BOUND' : 'FACE_BOUND'}('',${E(`POLY_LOOP('',(${L2.map(pt).join(',')}))`)},.T.)`));
          faces.push(E(`FACE_SURFACE('',(${bounds.join(',')}),${pl},.T.)`)); continue;
        }
      }
      for (const t of f.tris) {
        const a = s.idx[t * 3], b = s.idx[t * 3 + 1], c = s.idx[t * 3 + 2];
        const loop = E(`POLY_LOOP('',(${pt(a)},${pt(b)},${pt(c)}))`);
        faces.push(E(`FACE_SURFACE('',(${E(`FACE_OUTER_BOUND('',${loop},.T.)`)}),${plane(triNormal(s, t), s.vert(a))},.T.)`));
      }
    }
    const shell = E(`CLOSED_SHELL('',(${faces.join(',')}))`);
    const brep = E(`FACETED_BREP(${str(p.name)},${shell})`);
    const rep = E(`FACETED_BREP_SHAPE_REPRESENTATION(${str(p.name)},(${ax},${brep}),${geo})`);
    const prod = E(`PRODUCT(${str(p.name)},${str(p.name)},'',(${mechCtx}))`);
    const pdf = E(`PRODUCT_DEFINITION_FORMATION('','',${prod})`);
    const pd = E(`PRODUCT_DEFINITION('design','',${pdf},${desCtx})`);
    const pds = E(`PRODUCT_DEFINITION_SHAPE('','',${pd})`);
    E(`SHAPE_DEFINITION_REPRESENTATION(${pds},${rep})`);
    const [r, g, b] = hexRGB(p.color);
    const col = E(`COLOUR_RGB('',${R(r)},${R(g)},${R(b)})`);
    const sty = E(`PRESENTATION_STYLE_ASSIGNMENT((${E(`SURFACE_STYLE_USAGE(.BOTH.,${E(`SURFACE_SIDE_STYLE('',(${E(`SURFACE_STYLE_FILL_AREA(${E(`FILL_AREA_STYLE('',(${E(`FILL_AREA_STYLE_COLOUR('',${col})`)}))`)})`)}))`)})`)}))`);
    E(`MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION('',(${E(`STYLED_ITEM('',(${sty}),${brep})`)}),${geo})`);
  });
  const now = new Date().toISOString().slice(0, 19);
  return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Kerf CAD part studio'),'2;1');\nFILE_NAME(${str(base + '.step')},'${now}',(''),(''),'Kerf CAD','Kerf CAD','');\nFILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));\nENDSEC;\nDATA;\n${L.join('\n')}\nENDSEC;\nEND-ISO-10303-21;\n`;
}
/* boundary loops of a planar face as vertex-index chains, outer first; null if unusable */
function faceLoopIndices(s, f) {
  const nv = s.nv; const cnt = new Map();
  for (const t of f.tris) for (let k = 0; k < 3; k++) { const a = s.idx[t * 3 + k], b = s.idx[t * 3 + (k + 1) % 3]; const key = a < b ? a * nv + b : b * nv + a; cnt.set(key, (cnt.get(key) || 0) + 1); }
  const next = new Map();
  for (const t of f.tris) for (let k = 0; k < 3; k++) { const a = s.idx[t * 3 + k], b = s.idx[t * 3 + (k + 1) % 3]; const key = a < b ? a * nv + b : b * nv + a; if (cnt.get(key) === 1) { if (next.has(a)) return null; next.set(a, b); } }
  const loops = []; const used = new Set();
  for (const st of next.keys()) {
    if (used.has(st)) continue; const L = []; let v = st;
    while (!used.has(v)) { used.add(v); L.push(v); v = next.get(v); if (v === undefined) return null; }
    if (v !== st || L.length < 3) return null;
    loops.push(L);
  }
  if (!loops.length) return null;
  const n = f.normal; const ref = Math.abs(n.z) < 0.9 ? new V3(0, 0, 1) : new V3(1, 0, 0); const X = new V3().crossVectors(ref, n).normalize(), Y = new V3().crossVectors(n, X);
  const area = (L) => { let a = 0; for (let i = 0; i < L.length; i++) { const p = s.vert(L[i]), q = s.vert(L[(i + 1) % L.length]); a += p.dot(X) * q.dot(Y) - q.dot(X) * p.dot(Y); } return a / 2; };
  loops.sort((a, b) => area(b) - area(a));
  if (area(loops[0]) <= 0) return null;
  return loops;
}

/* ---- registry ---- */
const EXPORT_FORMATS = [
  { id: 'stl', label: 'STL (binary)', ext: 'stl', note: 'mesh, mm' },
  { id: 'stl-ascii', label: 'STL (ASCII)', ext: 'stl', note: 'mesh, mm' },
  { id: '3mf', label: '3MF', ext: '3mf', note: 'mesh with part colours, mm' },
  { id: 'step', label: 'STEP AP203', ext: 'step', note: 'faceted solid: flat faces exact, curves faceted' },
  { id: 'obj', label: 'OBJ + MTL', ext: 'obj', note: 'mesh with materials, mm' },
  { id: 'glb', label: 'glTF binary (GLB)', ext: 'glb', note: 'metres, Y up' },
  { id: 'gltf', label: 'glTF (JSON)', ext: 'gltf', note: 'metres, Y up, embedded buffer' },
  { id: 'fbx', label: 'FBX 7.4 binary', ext: 'fbx', note: 'mm units, Z up' },
  { id: 'dae', label: 'Collada (DAE)', ext: 'dae', note: 'mm units, Z up' },
  { id: 'usda', label: 'USD (usda)', ext: 'usda', note: 'mm units, Z up' },
  { id: 'ply', label: 'PLY (binary)', ext: 'ply', note: 'vertex colours, mm' },
  { id: 'off', label: 'OFF', ext: 'off', note: 'mesh, mm' },
  { id: 'amf', label: 'AMF', ext: 'amf', note: 'mesh with colours, mm' },
  { id: 'x3d', label: 'X3D', ext: 'x3d', note: 'mm, Y up' },
  { id: 'wrl', label: 'VRML 2.0', ext: 'wrl', note: 'mm, Y up' },
];
/* returns [{name, data}] where data is a string or Uint8Array; first entry is the main file */
function exportModel(fmtId, parts, base = 'part') {
  if (!parts.length) throw new Error('There are no parts to export');
  const solids = parts.map((p) => p.solid), names = parts.map((p) => p.name), colors = parts.map((p) => p.color);
  const one = (ext, data) => [{ name: `${base}.${ext}`, data }];
  switch (fmtId) {
    case 'stl': return one('stl', new Uint8Array(solidsToSTL(solids)));
    case 'stl-ascii': return one('stl', fmtSTLAscii(parts));
    case '3mf': return [{ name: `${base}.3mf`, zip: solidsTo3MFParts(solids, names, colors) }];
    case 'step': return one('step', fmtSTEP(parts, base));
    case 'obj': return fmtOBJ(parts, base);
    case 'glb': return one('glb', fmtGLB(parts));
    case 'gltf': return one('gltf', fmtGLTF(parts));
    case 'fbx': return one('fbx', fmtFBX(parts));
    case 'dae': return one('dae', fmtDAE(parts));
    case 'usda': return one('usda', fmtUSDA(parts));
    case 'ply': return one('ply', fmtPLY(parts));
    case 'off': return one('off', fmtOFF(parts));
    case 'amf': return one('amf', fmtAMF(parts));
    case 'x3d': return one('x3d', fmtX3D(parts));
    case 'wrl': return one('wrl', fmtWRL(parts));
  }
  throw new Error(`Unknown format "${fmtId}". Use one of: ${EXPORT_FORMATS.map((f) => f.id).join(', ')}`);
}
