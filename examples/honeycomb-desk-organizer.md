# Honeycomb Desk Organizer (2026-11-11)

Original geometric design, no real-world product, brand or character. Seven hexagonal cells with staggered heights (56-104 mm), two-tone split at Z = 48 mm.

Files (all in `examples/`):
- `honeycomb-desk-organizer.3mf`: print file, millimetres, two coloured objects.
- `honeycomb-desk-organizer.kerf.json`: editable source (open it in Kerf).
- `honeycomb-organizer.png`: render.

## Snapmaker U1, 0.4 mm nozzle

| | |
|---|---|
| Footprint / height | 97.2 x 93.9 x 104 mm (U1 volume 270^3 mm) |
| Orientation | As exported, flat on the bed. No supports needed: vertical walls, flat floor. |
| Objects | `Base (Filament 1)` Z 0-48, `Rim (Filament 2)` Z 48-104. Assign one filament to each. |
| Layer height | 0.20 mm (floor 2.4 mm = 12 layers, colour change at layer 240) |
| Walls | 4 perimeters (wall is 1.8 mm = 4 x 0.45 mm line). Infill is irrelevant: every wall is solid. |
| Tool changes | One (a single colour change). Keep the prime tower on. |
| Estimated PLA | about 74 g base + 44 g rim = about 118 g (Kerf volume x PLA density, not a slicer estimate) |

The 3MF carries geometry, units and part colours only. Kerf cannot embed slicer profiles, so set the profile above in the slicer. Print time was not estimated; slice it to get one.

## Mesh check

Both objects: positive signed volume equal to Kerf's volume, closed oriented surface (zero boundary flow). Boolean unions leave some T-junctions, so a strict manifold checker may report open edges; slicers weld these. I did not run the file through Snapmaker's slicer in this environment.

## Why this design

Etsy's 2026 gift pages feature desk organizers and pen holders, often themed; sales volume is not published, so "trending" here is inferred from listing presence, not from sales data. Articulated fidgets look like the biggest category but need print-in-place hinges that Kerf's feature set cannot make. Hex/honeycomb organizers are an evergreen, original shape; colour combinations are the main variant for listings.

## Etsy listing (draft, NOT published)

Title: Honeycomb Desk Organizer | Two-Tone Hexagon Pen Holder | Geometric Office Decor | 3D Printed
Tags: desk organizer, pen holder, honeycomb decor, hexagon organizer, office gift, 3d printed gift, desk accessories, makeup brush holder, geometric decor, teacher gift, home office decor, pencil cup, modern desk
Description: seven staggered hexagon cells for pens, brushes and tools; two-tone, printed in PLA; about 97 x 94 x 104 mm; choose any two colours.
