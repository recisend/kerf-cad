// End-to-end check: drive the server through a real MCP client over stdio.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || mkdtempSync(join(tmpdir(), 'kerf-mcp-'));
const client = new Client({ name: 'kerf-smoke', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(here, '..', 'server.mjs')], stderr: 'ignore' }));
const tools = await client.listTools(); console.log('tools:', tools.tools.map((t) => t.name).join(', '));
let failures = 0;
const call = async (name, args = {}, quiet = false) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  if (r.isError) { failures++; console.log(`✗ ${name}: ${text}`); }
  else console.log(`✓ ${name}${quiet ? '' : ': ' + text.slice(0, 220).replace(/\s+/g, ' ')}`);
  return { r, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};
await call('new_document', { name: 'Smoke bracket' });
await call('set_variable', { name: 'width', value: '90 mm' });
const s1 = await call('create_sketch', { plane: 'top', entities: [{ type: 'rectangle', id: 'plate', center: [0, 0], width: 90, height: 60 }], constraints: [{ type: 'length', entity: 'plate.bottom', value: '#width' }, { type: 'length', entity: 'plate.right', value: 60 }] });
console.log('   sketch dof', s1.json?.degrees_of_freedom, 'regions', s1.json?.regions?.length);
await call('add_feature', { type: 'extrude', params: { entities: 'Sketch 1', depth: '8' } });
await call('create_sketch', { plane: { face: 'top' }, entities: [{ type: 'circle', center: [0, 0], diameter: 28 }] });
await call('add_feature', { type: 'extrude', params: { entities: { sketch: 'Sketch 2' }, depth: '22', op: 'add' } });
await call('create_sketch', { plane: { face: { direction: 'top', nth: 1 } }, entities: [[-35, -20], [35, -20], [35, 20], [-35, 20]].map((at) => ({ type: 'point', at })) });
await call('add_feature', { type: 'hole', params: { sketch: 'Sketch 3', style: 'cbore', dia: '6.6', cboreDia: '11', cboreDepth: '4' } });
await call('add_feature', { type: 'fillet', params: { edges: { parallel_to: 'z', on_face: undefined }, radius: '6' } });
await call('create_sketch', { plane: { face: 'top' }, entities: [{ type: 'circle', center: [0, 0], radius: 8 }] });
await call('add_feature', { type: 'extrude', params: { entities: 'Sketch 4', op: 'remove', endType: 'through', flip: true } });
await call('add_feature', { type: 'chamfer', params: { edges: 'nonexistent' } }); failures--; // expected error
await call('set_part', { part: 'Part 1', name: 'Bracket', material: 'steel', color: '#3f6e9c' });
const mp = await call('mass_properties');
await call('set_variable', { name: 'width', value: '110' });
const doc = await call('get_document', {}, true); console.log('   after width=110 size:', doc.json.parts[0].size, 'errors:', doc.json.features.filter((f) => f.error).map((f) => f.name + ': ' + f.error));
await call('list_topology', { include: 'faces', limit: 3 });
await call('measure', { a: { face: 'top' }, b: { face: 'bottom' } });
const img = await call('render_view', { view: 'iso', width: 800, height: 560, save_path: join(out, 'iso.png') });
console.log('   image content:', img.r.content.some((c) => c.type === 'image'));
for (const f of ['stl', '3mf', 'step', 'obj', 'glb', 'fbx', 'dae', 'usda', 'ply', 'amf', 'x3d', 'wrl', 'off', 'gltf', 'stl-ascii']) await call('export_model', { format: f, path: out + '/' }, true);
await call('save_document', { path: join(out, 'bracket.kerf.json') });
await call('undo'); await call('open_document', { path: join(out, 'bracket.kerf.json') }, true);
console.log(failures ? `${failures} unexpected failure(s)` : 'all good', '·', out);
await client.close(); process.exit(failures ? 1 : 0);
