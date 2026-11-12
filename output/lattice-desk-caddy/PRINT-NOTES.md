# Lattice Desk Caddy — print notes (Snapmaker U1, 0.4 mm nozzle)

Original design (hexagonal pen/desk cup with 18 diamond windows). Not based on any real product, brand or character.

**Files**
- `lattice-desk-caddy.3mf` — import this into Snapmaker Orca (millimetres, 2 objects: `Caddy Body`, `Accent Rim`)
- `lattice-desk-caddy.kerf.json` — editable Kerf CAD source
- `preview-iso.png` — render

**Size**: 72.7 x 82.8 x 91 mm (U1 bed is 270 x 270 x 270 mm). Body 86 mm tall + 5 mm rim.
**Material estimate**: ~71 g body + ~4 g rim in PLA (walls are almost solid at 2.8 mm).

## Designed for a 0.4 mm nozzle
- Wall 2.8 mm = 7 x 0.4 mm lines. Floor 3.0 mm = 15 layers at 0.2 mm. Rim 5 mm.
- Windows are diamonds, so every edge is 45 deg: **no supports needed**, no bridging.
- Gap between windows is at least 3 mm; nothing thinner than 2.8 mm anywhere.
- Prints upright, flat floor on the bed.

## Suggested Orca settings (verify in your slicer; I could not slice here)
- Nozzle 0.4 mm, layer height 0.20 mm, 7 wall loops (or "Arachne" with 2.8 mm walls), 3 top / 15 bottom layers (3 mm floor)
- Supports: off
- Two colours: assign extruder 1 to `Caddy Body`, extruder 2 to `Accent Rim`. They touch on a flat face at Z = 86 mm, so the colour change is a clean layer swap.
- Seam: back / aligned, so the vertical corners stay clean.

## Mesh checks (done)
- Both objects are closed manifold meshes (every edge shared by exactly 2 triangles); volumes match the CAD (body 57,356 mm3, rim 3,362 mm3).
- The raw Kerf export had T-junctions on two corner seams; they were repaired in the 3MF.
- Not done: an actual slice / print test.

## Listing draft (NOT published — needs your approval)
Title: Hexagon Lattice Pen Holder | Modern Desk Organizer | 3D Printed Two-Tone Pencil Cup
Tags idea: desk organizer, pen holder, pencil cup, office decor, 3D printed, home office gift, teacher gift, geometric decor
