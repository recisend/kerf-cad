# Hex Hive Desk Organizer — 2026-11-14

Original geometric design (no brands, characters, logos or real-world products).

## Files
- `2026-11-14-hex-hive-desk-organizer.3mf` — print file (millimetres, 1 part, closed manifold mesh, 884 triangles)
- `2026-11-14-hex-hive-desk-organizer.kerf.json` — editable Kerf CAD source
- `hex-hive-preview.png` — preview render

## Model
- 7 honeycomb cells, flat-to-flat 36 mm outside, pitch 34.4 mm
- Cell heights: 100 mm (centre), alternating 80 / 62 mm (ring)
- Footprint 104.8 × 101.2 mm, height 100 mm (U1 bed is 270 mm, so it fits with room to spare)
- Pen / brush / cable / small-tool holder; each pocket ~32.8 mm across flats

## Snapmaker U1 / 0.4 mm nozzle optimisation
- Walls 1.62 mm = 4 × 0.4 mm perimeters, so the walls are solid perimeter with no thin-wall gap fill
- Floor 2.0 mm = 10 layers at 0.2 mm
- Flat base on the bed, vertical walls, no overhangs: **no supports, no brim needed**
- Cell heights (100 / 80 / 62 mm) and every Z step are multiples of 0.2 mm, so layers land exactly
- Suggested slicer settings (Snapmaker Orca, U1 profile, 0.4 mm nozzle): 0.2 mm layer, 4 walls, 2–3 top/bottom layers, 10–15 % gyroid infill (barely used, walls are almost all perimeter), PLA ~220 °C
- Estimated PLA use: ~110 g solid-equivalent upper bound; the slicer's figure will be lower. Print time is not estimated here because I can't run the slicer in this environment.
- Not yet test-sliced or test-printed. Please slice once on the U1 profile before listing.

## Trend basis (honest caveat)
Searches (vendor/SEO blogs, no verified Etsy data) repeatedly list desk organizers / WFH accessories, home items, and personalised gifts as steady Etsy 3D-print categories, with Q4 gifting as a seasonal peak. These are directional, not hard sales figures. Etsy's own search-volume / Marketplace Insights tools were not available to this run, so check keywords there before listing.

## Draft listing ideas (NOT published)
- Title: "Honeycomb Desk Organizer | Hex Pen Holder | Geometric Office Gift | 3D Printed"
- Tags: desk organizer, pen holder, honeycomb decor, office gift, hexagon organizer, desk accessories, geometric desk, makeup brush holder, teacher gift, home office
- Variants to offer: colour (PLA), optional custom colour pairing
- Upsell idea for later runs: personalised name plate in a cell
