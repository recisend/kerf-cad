# Hex Honeycomb Desk Organizer (2026-11-09)

Original design, not based on any real product, brand, character or licensed item.
Three fused hexagonal cups of different heights (95 / 80 / 65 mm) with a cable notch on the shortest cup.
Pens in the tall cell, brushes or scissors in the middle, clips or a charging cable in the short one.

**Files**
- `hex-honeycomb-organizer.3mf` - print file (mm, single watertight part)
- `hex-honeycomb-organizer.kerf.json` - editable Kerf CAD source (open in the Kerf web app)
- `preview.png` - render

## Optimised for Snapmaker U1, 0.4 mm nozzle

| Feature | Value | Why |
|---|---|---|
| Size | 90.4 x 91.6 x 95 mm | Fits the 270 mm bed with room for a brim |
| Wall | 1.6 mm | Exactly 4 perimeters at 0.4 mm line width |
| Shared wall between cups | 1.6 mm | Same, no gap-fill or thin-wall artefacts |
| Floor | 2.0 mm | 10 layers at 0.2 mm |
| First-layer chamfer | 0.6 mm | Reduces elephant foot (3 layers at 0.2 mm) |
| Overhangs | none | Prints flat on the bed with no supports |
| Mesh | watertight, 0 open edges, 506 triangles | Checked after export |
| Volume | about 59.4 cm3 | About 74 g PLA at 1.24 g/cm3 |

Suggested slicer settings (Snapmaker Orca): 0.4 mm nozzle, 0.2 mm layer height, 4 walls, 0 supports,
about 10% infill (walls carry the strength), 3 top/bottom layers beyond the floor, PLA or PETG.
Please check the final profile in your slicer. These are starting values, not a tested print.

## Etsy listing draft (NOT published)

Title: Honeycomb Desk Organizer - Hexagon Pen Holder, 3 Compartments, Modern Desk Accessory
Tags: desk organizer, pen holder, hexagon organizer, honeycomb, cable organizer, office gift,
stocking stuffer, desk accessories, 3D printed, minimalist desk, teacher gift, home office decor

Trend basis (weak evidence, see note): desk organizers and cable management appear in most 2026
3D-print-for-Etsy seller guides, and November is the start of gift season. These guides are mostly
written by sellers or tool vendors, and no Etsy-published sales data was found. Treat "trending" as
a reasonable bet, not a measured fact.
