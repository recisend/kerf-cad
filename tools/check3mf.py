#!/usr/bin/env python3
"""Sanity-check a Kerf 3MF export: manifold edges, degenerate triangles, bbox, volume,
and fit inside the Snapmaker U1 build volume (270 x 270 x 270 mm)."""
import sys, zipfile, re, collections
path = sys.argv[1]
x = zipfile.ZipFile(path).read('3D/3dmodel.model').decode()
vs = [tuple(map(float, m)) for m in re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', x)]
tr = [tuple(map(int, m)) for m in re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"', x)]
e = collections.Counter()
for a, b, c in tr:
    for p, q in ((a, b), (b, c), (c, a)): e[(p, q)] += 1
bad = [k for k, v in e.items() if v != 1 or (k[1], k[0]) not in e]
def area(t):
    a, b, c = t
    u = [vs[b][i]-vs[a][i] for i in range(3)]; w = [vs[c][i]-vs[a][i] for i in range(3)]
    cr = [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]]
    return sum(t*t for t in cr) ** .5 / 2
deg = sum(1 for t in tr if area(t) < 1e-4)
vol = sum((vs[a][0]*(vs[b][1]*vs[c][2]-vs[b][2]*vs[c][1])-vs[a][1]*(vs[b][0]*vs[c][2]-vs[b][2]*vs[c][0])+vs[a][2]*(vs[b][0]*vs[c][1]-vs[b][1]*vs[c][0]))/6 for a, b, c in tr)
size = [max(v[i] for v in vs)-min(v[i] for v in vs) for i in range(3)]
print(f'vertices={len(vs)} triangles={len(tr)} open/non-manifold edges={len(bad)} degenerate tris={deg}')
print(f'volume={vol/1000:.2f} cm3  size={size[0]:.1f} x {size[1]:.1f} x {size[2]:.1f} mm')
print('fits Snapmaker U1 (270^3):', all(s <= 270 for s in size))
