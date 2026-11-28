# Frost Snowflake Ornament — 2026-11-28

Original, generic design (no real-world product, brand, character or licensed item).
Built with the Kerf CAD MCP server; export: `frost-snowflake-ornament.3mf` (millimetres).
Editable source: `frost-snowflake-ornament.kerf.json` (open in the Kerf web app).

## Why this one
Seasonal timing (late November → Christmas ornaments / stocking stuffers / tree decor).
Web searches only surfaced blog-level lists naming holiday ornaments, stocking stuffers and
desk items as steady sellers; **no hard Etsy sales numbers were found**, so "trending" here
means "consistently cited seasonal category", not verified rank. Check Etsy search
suggestions / your own stats before committing to a big batch.

## Geometry
- 56.9 x 71.3 x 4.2 mm, prints flat, single part, ~3.75 cm3 (~4.7 g PLA)
- 6-fold arms, 3.2 mm wide (8 lines at 0.4 mm), 3.0 mm thick; raised hex hub 4.2 mm
- Hanging hole 3.2 mm dia in a 8.4 mm dia loop (2.8 mm wall) — fits thin ribbon/twine
- Z=0 is the flat bottom: no supports, no brim needed
- All heights are multiples of 0.2 mm (15 / 21 layers)

## Snapmaker U1 (0.4 mm nozzle) settings
- Slicer profile: Snapmaker U1, 0.4 mm nozzle, 0.20 mm Standard
- Filament: PLA (matte/silk white, silver or ice-blue look best); bed ~60 C, nozzle per filament profile
- Walls: 3, top/bottom layers: 4/3, infill 15% gyroid (mostly walls anyway)
- Supports: off. Brim: off. Plate: textured PEI or smooth, part lies flat
- Optional 2-colour: paint the hub (top 1.2 mm, layers 16-21) with a second U1 toolhead
- Place 6+ per plate for batch printing (U1 bed is 270 x 270 mm)

## Mesh check (please read)
Kerf's boolean union leaves tiny collinear T-junction slivers at arm seams (mesh volume
matches Kerf's 3750.95 mm3 exactly, z-range 0-4.2). Slicers normally auto-repair this; if
Snapmaker Orca reports repaired errors, run it through its "Fix model" once and check the
preview on layer 1 before a batch. Not yet test-printed.

## Draft Etsy listing (NOT published — needs your approval)
**Title:** Snowflake Christmas Ornament, 3D Printed Winter Tree Decor, Stocking Stuffer Gift Tag, Minimalist Holiday Decoration
**Tags:** snowflake ornament, christmas ornament, 3d printed decor, stocking stuffer, winter decor, tree ornament, gift topper, secret santa gift, holiday decor, minimalist xmas
**Description:** Lightweight 3D-printed snowflake ornament, ~7 cm tall, printed in PLA. Comes with a hanging hole for ribbon or twine. Also works as a gift topper or garland piece. Colours may vary slightly by filament batch.
