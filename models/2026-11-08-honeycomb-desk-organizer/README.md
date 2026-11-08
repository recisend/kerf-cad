# Honeycomb Desk Organizer (2026-11-08)

Original design: 7 hexagonal cells in a honeycomb cluster, staggered heights (50 / 60 / 70 / 90 mm).
Holds pens, brushes, markers, makeup brushes, small tools. Not based on any real product, brand or character.

- Overall size: 104.8 x 101.2 x 90 mm (fits Snapmaker U1, 270 x 270 x 270 mm, with huge margin)
- Cell inner width: 32.8 mm flat-to-flat
- Volume: ~82 cm3 (~100 g PLA at 100% solid; less with sparse infill)

## Snapmaker U1 / 0.4 mm nozzle optimisation
- Walls 1.6 mm = exactly 4 perimeters at 0.4 mm line width
- Base 2.0 mm = 10 layers at 0.2 mm (or 8 at 0.25 mm)
- All heights are multiples of 0.2 mm layer height (50/60/70/90 mm)
- Flat bottom, vertical walls, no overhangs: **no supports needed**, no brim needed
- Print orientation as exported (open end up)

Suggested slicer settings (Snapmaker Orca): 0.20 mm layer, 4 walls, 3 top / 0 top layers needed (open top), 10-15% infill (walls make up almost all the volume), PLA ~220 C.
Multi-colour option: U1 is multi-toolhead, so cells can be colour-split per height in the slicer (not done in the file).

## Files
- honeycomb-desk-organizer.3mf (export, mm)
- honeycomb-desk-organizer.kerf.json (editable Kerf source; variable `wall` = 1.6)
- preview.png
- etsy-listing-draft.md (DRAFT ONLY, not published)
