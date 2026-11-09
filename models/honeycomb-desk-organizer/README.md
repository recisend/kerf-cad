# Honeycomb Desk Organizer

Original design, not modelled on any real product, brand or character.
Seven hexagonal cells sharing walls, stepped at three heights (85 / 70 / 55 mm)
for pens, brushes, tools, makeup brushes or small plants.

Files
- `honeycomb-desk-organizer.3mf` is the print file (millimetres, single part).
- `honeycomb-desk-organizer.kerf.json` is the editable Kerf CAD source.
- `preview-iso.png` and `preview-top.png` are renders.

## Printer fit: Snapmaker U1, 0.4 mm nozzle

| Item | Value |
| --- | --- |
| Size | 100.7 x 97.2 x 85 mm (U1 volume is 270^3, so it fits easily) |
| Wall thickness | 1.6 mm = exactly 4 perimeters at 0.4 mm line width (shared walls included) |
| Floor | 2.0 mm = 10 layers at 0.2 mm |
| Overhangs / supports | None. Every wall is vertical and the floor sits on the bed, so no supports. |
| Orientation | Print as exported, flat on the bed, open side up |
| Volume | about 74 cm^3, roughly 90 g of PLA (estimate; check in the slicer) |

Suggested slicer settings
- 0.4 mm nozzle profile, 0.20 mm layer height
- 4 wall loops, 5 to 10% gyroid or grid infill (the part is almost all walls)
- Top and bottom shell layers: 5
- Enable elephant-foot compensation (about 0.1 to 0.2 mm). No chamfer is modelled on the bottom edge.
- Brim not needed. Slow the first layer slightly for adhesion.
- PLA or PETG work. Multi-colour option on the U1: assign one filament per cell
  height group.

Known mesh note: the bottom face is made of seven coplanar faces. This leaves a few T-junction vertices in
the exported mesh. The solid is closed (volume matches Kerf's own), and slicers weld
these automatically.

## Etsy listing notes (draft, not published)

Why this design: it follows the home and desk organization category, which recurs
in 2026 seller guides alongside planters, phone stands, fidgets and personalised
gifts. The trend sources are seller and vendor blogs, not Etsy sales data, so treat
the demand as directional and check Etsy search for "desk organizer" before listing.
The listing would sell the physical print, and the design is original, which fits
Etsy's rule that 3D-printed items must be the seller's own design.

Possible title: `Honeycomb Desk Organizer, Hexagon Pen Holder, Modern Geometric Desk Decor`
Possible tags: desk organizer, pen holder, honeycomb decor, hexagon organizer,
geometric desk, office gift, makeup brush holder, home office decor, desk accessories,
3d printed gift

Upsell ideas: custom colour choices, a name or initial on one cell wall.

Nothing has been published. Listing needs the owner's approval.
