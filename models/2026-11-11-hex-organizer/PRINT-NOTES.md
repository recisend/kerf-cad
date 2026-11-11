# Hex Desk Organizer Set (4 colours) — 2026-11-11

Original geometric design (plain hexagon cups, no real-world product, brand or character).
File: `hex-desk-organizer-set.3mf` (millimetres, 4 separate named bodies, one colour each).
Editable source: `hex-desk-organizer-set.kerf.json` (open in Kerf CAD).

## Why this design
- Etsy research (see sources below): personalised/niche and multi-colour desk items hold price better than generic flexi animals and phone stands, which are saturated.
- Snapmaker U1 is a 4-toolhead printer: the set is built as exactly 4 bodies, so each cup prints in its own filament colour with no purge-heavy swaps.
- Sells as a set (4 cups) which raises average order value. Honeycomb layout encourages add-on sets.

## Optimised for Snapmaker U1, 0.4 mm nozzle
| Item | Value |
|---|---|
| Plate footprint | about 114.5 x 91.5 mm, max height 80 mm (U1 volume 270 x 270 x 270 mm) |
| Wall thickness | 1.6 mm (4 perimeters at 0.4 mm line width) |
| Floor thickness | 1.6 mm (8 layers at 0.2 mm) |
| Layer height | 0.2 mm (U1 reference profile for PLA, 0.4 mm standard-flow nozzle) |
| Supports | none needed (vertical walls, flat bottom) |
| Gap between cups | 3.0 mm on the plate (flats are 44.0 mm across, pitch 47 mm); slide cups together for a flush honeycomb |
| Estimated PLA | about 74 g total (volume-based, 100% solid estimate; the slicer figure will be lower) |

Suggested slicer settings (Snapmaker Orca): 4 walls, 0 % infill is fine for walls, 5 top / 8 bottom layers, seam aligned to a corner, bottom-edge elephant-foot compensation 0.1–0.15 mm.
Assign filament 1–4 to Cup A, B, C, D.

## Not yet done
- Not test-printed. No slicer was available in this environment, so print time and filament use are unverified.
- Nothing has been published or listed anywhere. Publishing needs your explicit permission.

## Sources
- https://www.trendlytic.io/blog/3d-printed-items-to-sell-on-etsy
- https://www.eufymake.com/blogs/business-ideas/best-3d-print-sell-profitable-items
- https://www.snapmaker.com/snapmaker-u1/specs
