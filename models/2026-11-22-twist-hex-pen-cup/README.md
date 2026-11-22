# Twisted Hex Pen Cup / Bud Vase — 2026-11-22

Original design (abstract geometry, not based on any real product, brand, character or IP).
**Status: DRAFT. Not published anywhere. Nothing is listed on Etsy.**

## Files
- `twist-hex-pen-cup.3mf` — print file (millimetres)
- `twist-hex-pen-cup.kerf.json` — editable Kerf CAD source
- `preview.png` — render

## Model
- 80 x 80 x 100 mm (fits the Snapmaker U1's 270 mm build volume with room to spare; fits ~4 per plate for batch printing)
- Hex section twisted 90 degrees over the height (5 stacked twisted segments)
- Open top, 2.0 mm floor (10 layers at 0.2 mm), wall about 1.7 mm (about 4 perimeters at 0.42 mm line width)
- Max overhang about 32 degrees from vertical, so no supports. Flat base, no brim needed
- Solid volume 48.2 cm3, about 60 g of PLA

## Snapmaker U1 / 0.4 mm nozzle starting settings (verify in your slicer profile)
- Layer height 0.20 mm, line width 0.42 mm, 4 walls, 5 top / 5 bottom layers
- Infill 10-15 % gyroid (almost all of the part is walls), supports off
- Seam: aligned or back, so the seam lines up with a hex vertex
- Silk / matte PLA looks best on the twist facets

## Known caveat
The exported mesh has volume that matches Kerf's value (48,213 mm3), but about 75 seam edges at the z = 20/40/60/80/100 segment joins are
not strictly manifold (duplicate edges from the segment union). Orca-based slicers normally auto-repair this. Open the 3MF in the
slicer and confirm there is no repair warning before printing a batch. I could not run a slicer in this environment.

## Why this design (trend evidence, directional only)
Web sources (blog and Etsy best-seller list pages, not hard sales data) point to home decor / desk organizers, spiral and twisted vases
and lamps as consistently selling 3D-printed categories. Etsy also now requires 3D printed items to come from the seller's own design,
so an original model matters.
I could not access Etsy search-volume or sold-listing tools (the marketing MCP servers failed to connect), so please check
Etsy's own trends / search suggestions before listing.

## Draft listing text (NOT published)
Title: Twisted Hexagon Pen Holder, Modern Desk Organizer, Geometric Vase, 3D Printed Home Office Decor
Tags: desk organizer, pen holder, geometric vase, modern decor, office gift, 3d printed, twisted vase, dried flower vase, makeup brush holder, minimalist decor
