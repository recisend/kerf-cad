# Honeycomb Desk Organizer (original design, 2026-11-12)

Original geometric design (no real-world product, brand or licensed item). 7 fused hexagonal cells in a honeycomb layout with staggered heights (84 / 60 / 42 mm) for pens, brushes, tools and small supplies.

- Source: `honeycomb-desk-organizer.kerf.json` (Kerf CAD, parametric) · Export: `honeycomb-desk-organizer.3mf` (mm)
- Size: 115.1 x 110.9 x 84 mm, ~89 cm3 solid (~105 g PLA at walls-only fill)

## Snapmaker U1 / 0.4 mm nozzle optimization
- Footprint 115 x 111 mm fits the U1's 270 x 270 x 270 mm bed with huge margin; fits a single plate.
- Walls 1.6 mm outer (4 perimeters x 0.4), 2.4 mm shared cell walls (6 perimeters), 2.4 mm floor (12 layers @ 0.2 mm) - all exact multiples of the 0.4 mm line width.
- Flat base, vertical walls, no overhangs: print with **no supports, no brim** needed.
- Suggested: 0.4 mm nozzle, 0.2 mm layers, 3 walls, 4 top/bottom layers, 10-15% gyroid infill (walls dominate), PLA 215-220 C. For a two-tone look use the U1's multi-toolhead: switch colour at a layer change (e.g. z=42 mm and z=60 mm to match cell heights).
- Print time estimate ~5-6 h at default speeds (estimate; slice to confirm).

## Why this product (research notes)
Desk organizers and fidget-type items were the strongest consistently-reported 3D print niches on Etsy in 2026 (keyword vendors cite ~40k monthly searches for custom organizers with low competition - vendor figures, verify with eRank/Marmalead before relying on them). Hex/honeycomb organizers are a popular geometric style. Etsy only allows 3D-printed items from the seller's own designs, so this original design is compliant. Personalization drives >25% of Nov/Dec sales: consider a custom-colour option. Etsy Cyber Sales Event reportedly starts Nov 18.

## Draft listing (NOT published - awaiting owner approval)
**Title:** Honeycomb Desk Organizer - Hexagon Pen Holder, Geometric Desk Caddy, 3D Printed Office Gift
**Tags:** desk organizer, pen holder, honeycomb, hexagon decor, office gift, desk accessories, 3d printed, makeup brush holder, teacher gift, geometric decor

## Verification
Exported 3MF checked: units mm, 416 vertices / 828 triangles, watertight and manifold (0 open or duplicate edges), volume matches the CAD kernel (89,197 mm3). Not yet sliced in Snapmaker Orca - print-time/filament numbers are estimates.
