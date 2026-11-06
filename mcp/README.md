# Kerf CAD MCP server

An MCP server that lets Claude (or any MCP client) build parametric parts with the Kerf CAD kernel: constrained sketches, extrude/revolve/sweep/loft, fillet, chamfer, shell, holes, patterns, mirror, booleans and more. It can measure the result, render it to a PNG it can look at, and export it to 15 file formats.

It runs locally over stdio and needs Node 18 or newer. Documents are the same `.kerf.json` files the Kerf web app opens and saves, so you can build a part here and keep editing it in the browser, or the other way round.

## Install

```bash
cd kerf/mcp
npm install
```

`lib/kernel.mjs` is generated from the web app's sources in `../src`. It is already built. Only run `npm run build` after changing those sources.

## Connect it

Claude Code:

```bash
claude mcp add kerf -- node /absolute/path/to/kerf/mcp/server.mjs
```

Claude Desktop (`claude_desktop_config.json`):

```json
{ "mcpServers": { "kerf": { "command": "node", "args": ["/absolute/path/to/kerf/mcp/server.mjs"] } } }
```

## Tools

| Tool | What it does |
|---|---|
| `create_sketch`, `update_sketch` | Constrained 2D sketches: lines, polylines, rectangles, circles, arcs, polygons, slots, points, splines, plus constraints and driving dimensions. Returns the solved geometry, degrees of freedom and closed regions. |
| `add_feature`, `update_feature`, `delete_feature` | Extrude, revolve, sweep, loft, fillet, chamfer, shell, hole, plane, linear/circular pattern, mirror, boolean, split, transform, delete part, primitive. A feature that fails is not added; its error is returned. |
| `describe_features` | Every feature type's parameters, options and defaults. |
| `set_variable` | `#variables` usable in any value, e.g. `"#width / 2 + 3 mm"`. |
| `set_rollback`, `undo` | Roll the history back; undo any change. |
| `get_document`, `get_feature`, `list_topology` | Inspect the history, parts, faces and edges. |
| `measure`, `mass_properties` | Distances and angles; volume, area, mass by material, center of mass, bounding box. |
| `set_part` | Name, colour, material and visibility of a part. |
| `render_view` | Shaded PNG with edges from any standard or custom view direction. It can also save the image to a file. |
| `export_model`, `list_formats` | Export to the formats below. |
| `new_document`, `open_document`, `save_document` | Work with `.kerf.json` files. |

## References

Selections are written as selectors, so they survive edits. If you select `{ "parallel_to": "z" }` and later change `#width`, the fillet follows the new edges.

- **Planes:** `"top"`, `"front"`, `"right"`, or a plane feature's name.
- **Sketch regions:** `"Sketch 1"` (every closed shape, with holes respected), or `{ "sketch": "Sketch 1", "region": 0 }`.
- **Faces:**
  - `{ "face": "top" }` is the top-most flat face facing +Z. Also `"+x"`, `"bottom"`, and so on.
  - `{ "face": { "direction": "top", "nth": 1 } }` is the next one down.
  - `{ "face": { "point": [x, y, z] } }` is the face nearest that point.
- **Edges:**
  - `{ "parallel_to": "z", "part": "Bracket", "on_face": "top" }`
  - `{ "edges_of": "top" }`
  - `{ "from": [x, y, z], "to": [x, y, z] }`
- **Topology ids:** `"face:<part>:<n>"` and `"edge:<part>:<n>"` from `list_topology` are valid until the model changes.

## Example

```text
create_sketch  { "plane": "top", "entities": [{ "type": "rectangle", "id": "plate", "center": [0,0], "width": 90, "height": 60 }],
                 "constraints": [{ "type": "length", "entity": "plate.bottom", "value": "#width" }] }
add_feature    { "type": "extrude", "params": { "entities": "Sketch 1", "depth": "8" } }
create_sketch  { "plane": { "face": "top" }, "entities": [{ "type": "point", "at": [-35,-20] }, { "type": "point", "at": [35,20] }] }
add_feature    { "type": "hole", "params": { "sketch": "Sketch 2", "style": "cbore" } }
add_feature    { "type": "fillet", "params": { "edges": { "parallel_to": "z" }, "radius": "6" } }
render_view    { "view": "iso" }
export_model   { "format": "step", "path": "out/bracket.step" }
```

## Export formats

| id | Format | Notes |
|---|---|---|
| `stl`, `stl-ascii` | STL | Millimetres. |
| `3mf` | 3MF | Millimetres, part colours. |
| `step` | STEP AP203 | Faceted solid with part colours. Flat faces are exact; curved faces are faceted. |
| `obj` | OBJ + MTL | Millimetres, materials. |
| `glb`, `gltf` | glTF 2.0 | Metres, +Y up, as the format requires. |
| `fbx` | FBX 7.4 binary | Millimetres, Z up. |
| `dae` | Collada 1.4.1 | Millimetres, Z up. |
| `usda` | USD | Millimetres, Z up. |
| `ply` | PLY | Binary, vertex colours. |
| `off`, `amf` | OFF, AMF | |
| `x3d`, `wrl` | X3D, VRML 2.0 | |

## Limitations

- Fillet and chamfer work on straight edges between flat faces.
- The kernel is mesh-based, so STEP output is faceted. It is not true NURBS geometry.
- There is no IGES output, and no import of other CAD formats.

## Test

```bash
npm test
```

The test drives the server through a real MCP client over stdio. It builds a bracket, changes a variable and checks that everything rebuilds, renders a view, exports every format and round-trips the document.
