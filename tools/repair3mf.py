#!/usr/bin/env python3
"""Repair tessellation artifacts in a Kerf 3MF: drop zero-area sliver triangles and
re-stitch the T-junctions they leave (split the neighbouring triangle at the collinear vertex).
Usage: repair3mf.py in.3mf out.3mf"""
import sys, zipfile, re, collections, math
src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
xml = zin.read('3D/3dmodel.model').decode()
vs = [tuple(map(float, m)) for m in re.findall(r'<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"', xml)]
tr = [tuple(map(int, m)) for m in re.findall(r'<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"', xml)]
sub = lambda p, q: [p[i]-q[i] for i in range(3)]
cross = lambda u, w: [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]]
norm = lambda u: math.sqrt(sum(t*t for t in u))
area = lambda t: norm(cross(sub(vs[t[1]], vs[t[0]]), sub(vs[t[2]], vs[t[0]]))) / 2
TOL = 5e-3
tr = [t for t in tr if area(t) > 1e-3 and len(set(t)) == 3]

def retriangulate_plane(tr, zval):
    """Rebuild the flat bottom face (all vertices at z == zval): drop its triangles, walk the
    outline left by its neighbours, and ear-clip it again (keeps every outline vertex)."""
    face = [t for t in tr if all(abs(vs[v][2]-zval) < 1e-6 for v in t)]
    rest = [t for t in tr if t not in face]
    cnt = collections.Counter()
    for t in rest:
        for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): cnt[(p, q)] += 1
    # outline edges: neighbour edges lying in the plane with no reverse partner; the face runs them reversed
    nxt = {}
    for (p, q), v in cnt.items():
        if abs(vs[p][2]-zval) < 1e-6 and abs(vs[q][2]-zval) < 1e-6 and (q, p) not in cnt:
            nxt.setdefault(q, []).append(p)
    if not nxt: return tr
    start = next(iter(nxt)); loop = [start]
    while True:
        cur = loop[-1]; options = nxt.get(cur, [])
        if len(options) != 1: print('bottom outline is not a single simple loop; skipping'); return tr
        n = options[0]
        if n == start: break
        loop.append(n)
        if len(loop) > len(nxt) + 2: print('outline walk failed; skipping'); return tr
    if len(loop) != len(nxt): print('multiple outline loops; skipping'); return tr
    P = lambda i: vs[i][:2]
    sa = sum(P(loop[i])[0]*P(loop[(i+1) % len(loop)])[1]-P(loop[(i+1) % len(loop)])[0]*P(loop[i])[1] for i in range(len(loop)))/2
    if sa < 0: loop.reverse()   # make CCW
    cr2 = lambda a, b, c: (P(b)[0]-P(a)[0])*(P(c)[1]-P(a)[1])-(P(b)[1]-P(a)[1])*(P(c)[0]-P(a)[0])
    def inside(a, b, c, d):
        e = 1e-9
        return cr2(a, b, d) > -e and cr2(b, c, d) > -e and cr2(c, a, d) > -e
    poly = loop[:]; out = []
    guard = 0
    while len(poly) > 3 and guard < 10000:
        guard += 1; clipped = False
        for i in range(len(poly)):
            a, b, c = poly[i-1], poly[i], poly[(i+1) % len(poly)]
            if cr2(a, b, c) <= 1e-6: continue
            if any(inside(a, b, c, d) for d in poly if d not in (a, b, c)): continue
            out.append((a, b, c)); poly.pop(i); clipped = True; break
        if not clipped: print('ear clipping stuck; skipping'); return tr
    if cr2(*poly) > 1e-9: out.append(tuple(poly))
    # CCW in xy => normal +z; bottom face needs -z, so flip
    return rest + [(a, c, b) for a, b, c in out]
cnt0 = collections.Counter()
for t in tr:
    for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): cnt0[(p, q)] += 1
if any((q, p) not in cnt0 or v != 1 for (p, q), v in cnt0.items()):
    zmin = min(v[2] for v in vs)
    tr = retriangulate_plane(tr, zmin)
def on_seg(a, c, b):
    ac = sub(vs[c], vs[a]); ab = sub(vs[b], vs[a]); L = norm(ac)
    if L < 1e-9: return False
    t = sum(ac[i]*ab[i] for i in range(3)) / (L*L)
    if not (1e-6 < t < 1-1e-6): return False
    return norm(cross(ac, ab)) / L < TOL
for it in range(50):
    cnt = collections.Counter()
    for t in tr:
        for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): cnt[(p, q)] += 1
    openE = {k for k, v in cnt.items() if (k[1], k[0]) not in cnt or v != 1}
    if not openE: break
    ov = {v for k in openE for v in k}
    new = []; changed = False
    for t in tr:
        done = False
        for i in range(3):
            a, c, d = t[i], t[(i+1) % 3], t[(i+2) % 3]
            if (a, c) in openE:
                bs = [b for b in ov if b not in (a, c) and on_seg(a, c, b)]
                if bs:
                    b = min(bs, key=lambda b: norm(sub(vs[b], vs[a])))
                    new += [(a, b, d), (b, c, d)]; done = changed = True; break
        if not done: new.append(t)
    tr = [t for t in new if area(t) > 1e-3]
    if not changed: break
cnt = collections.Counter()
for t in tr:
    for p, q in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): cnt[(p, q)] += 1
bad = [k for k, v in cnt.items() if v != 1 or (k[1], k[0]) not in cnt]
print('triangles', len(tr), 'remaining open edges', len(bad))
used = sorted({v for t in tr for v in t}); remap = {v: i for i, v in enumerate(used)}
verts = ''.join(f'     <vertex x="{vs[v][0]:g}" y="{vs[v][1]:g}" z="{vs[v][2]:g}"/>\n' for v in used)
tris = ''.join(f'     <triangle v1="{remap[a]}" v2="{remap[b]}" v3="{remap[c]}"/>\n' for a, b, c in tr)
xml2 = re.sub(r'<vertices>.*?</vertices>', lambda m: '<vertices>\n' + verts + '    </vertices>', xml, flags=re.S)
xml2 = re.sub(r'<triangles>.*?</triangles>', lambda m: '<triangles>\n' + tris + '    </triangles>', xml2, flags=re.S)
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
    for n in zin.namelist():
        zout.writestr(n, xml2 if n == '3D/3dmodel.model' else zin.read(n))
