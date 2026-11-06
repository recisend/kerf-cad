#!/bin/sh
# Assemble Kerf CAD into a single HTML page.
cd "$(dirname "$0")"
JS="src/01-util.js src/05-icons.js src/10-kernel.js src/15-formats.js src/20-sketch.js src/30-features.js src/40-view.js src/50-sketchui.js src/60-ui.js src/90-main.js"
{
  cat src/shell.html
  cat <<'MAP'
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
  "three-mesh-bvh": "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.7/build/index.module.js",
  "three-bvh-csg": "https://cdn.jsdelivr.net/npm/three-bvh-csg@0.0.18/build/index.module.js"
} }
</script>
<script type="module">
MAP
  cat $JS
  echo '</script>'
} > kerf.html
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'; cat kerf.html; echo '</body></html>'; } > kerf-local.html
wc -c kerf.html
