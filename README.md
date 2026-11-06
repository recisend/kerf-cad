# Kerf CAD

A parametric part modeler that runs in the browser, plus an MCP server that lets Claude build parts with the same kernel.

- **Web app:** open `kerf-local.html` in a browser (it loads three.js from a CDN). `kerf.html` is the same page without the document wrapper, as published to claude.ai.
- **MCP server:** see [`mcp/README.md`](mcp/README.md).

Features: constrained sketches with a live solver; extrude, revolve, sweep and loft; fillet, chamfer, shell and holes; linear/circular patterns, mirror, boolean, split and transform; planes, primitives and `#variables`; measuring, mass properties and section view. Export to STL, 3MF, STEP, OBJ, GLB/glTF, FBX, Collada, USD, PLY, OFF, AMF, X3D and VRML.

## Layout

| Path | What |
|---|---|
| `src/` | Source: kernel (`10-kernel.js`), exporters (`15-formats.js`), sketch solver (`20-sketch.js`), features (`30-features.js`), viewport and UI. |
| `build.sh` | Builds `kerf.html` and `kerf-local.html` from `src/`. |
| `mcp/` | The MCP server. `mcp/lib/kernel.mjs` is generated from `src/` by `npm run build` in `mcp/`. |

## Rebuild

```bash
./build.sh
```

```bash
cd mcp && npm install && npm run build && npm test
```
