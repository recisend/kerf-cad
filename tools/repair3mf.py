#!/usr/bin/env python3
"""Close tiny tessellation holes (3-edge loops) in a Kerf-exported 3MF.

Usage: python3 -I tools/repair3mf.py in.3mf [out.3mf]   (in-place if out omitted)
Only fills holes bounded by exactly three unmatched edges; refuses anything else.
"""
import sys, re, zipfile, collections, shutil, tempfile, os

src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else src
zin = zipfile.ZipFile(src)
name = '3D/3dmodel.model'
x = zin.read(name).decode()
vs = [tuple(map(float, t)) for t in re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', x)]
tri_re = re.compile(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"[^>]*/>')
tris = [tuple(map(int, t)) for t in tri_re.findall(x)]

d = {}
weld = [d.setdefault(tuple(round(c, 3) for c in v), i) for i, v in enumerate(vs)]
edges = collections.Counter()
for a, b, c in tris:
    for p, q in ((weld[a], weld[b]), (weld[b], weld[c]), (weld[c], weld[a])):
        edges[(p, q)] += 1
open_edges = [(q, p) for (p, q) in edges if edges[(q, p)] == 0]  # directed edges that must exist to close the mesh
nxt = collections.defaultdict(list)
for p, q in open_edges: nxt[p].append(q)
new, used = [], set()
for p, q in open_edges:
    if (p, q) in used: continue
    for r in nxt[q]:
        if p in nxt[r]:
            new.append((p, q, r)); used |= {(p, q), (q, r), (r, p)}; break
if len(used) != len(open_edges):
    sys.exit(f"refusing: {len(open_edges)} open edges, only {len(used)} fit 3-edge holes")
print(f"open edges: {len(open_edges)}; adding {len(new)} triangle(s)")
if new:
    ins = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in new)
    x = x.replace('</triangles>', ins + '</triangles>', 1)
tmp = tempfile.mktemp(suffix='.3mf')
with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zin.infolist():
        zo.writestr(it, x.encode() if it.filename == name else zin.read(it.filename))
shutil.move(tmp, dst)
