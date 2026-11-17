# Honeycomb Desk Organizer — 2026-11-17

Original design (4 fused hexagonal cups, stepped heights). Not based on any real product, brand or character.

## Model
| | |
|---|---|
| File | `honeycomb-desk-organizer.3mf` (mm, single manifold part, 252 vertices / 500 triangles, checked) |
| Size | 145.6 x 118.2 x 100 mm (fits Snapmaker U1's 270 x 270 x 270 mm volume with room for 2 side by side) |
| Cup heights | 100 / 80 / 60 / 40 mm; inner width 56 mm across flats |
| Volume / PLA mass | 96.97 cm3 -> about 120 g if solid (less with the slicer's wall/infill settings) |
| Source | `honeycomb-desk-organizer.kerf.json` (open in Kerf; walls/size are plain numbers in the sketches) |

## Optimized for Snapmaker U1, 0.4 mm nozzle
- Wall thickness 1.6 mm = exactly 4 perimeters of 0.4 mm lines, floor 2.0 mm = 10 layers at 0.2 mm. No thin-wall gaps or gap-fill.
- Vertical walls and flat bottom: no supports, no brim needed.
- Hex footprint is an even multiple of the line width; nothing finer than 1.6 mm.

## Suggested slicer settings (Snapmaker Orca, U1 0.4 profile)
Settings are not stored in the 3MF (Kerf exports geometry only). Set when slicing:
- Layer height 0.2 mm, 4 wall loops, top/bottom layers 5/5, infill 10-15% (walls are nearly solid anyway)
- Supports off, orientation as exported (open end up)
- PLA, ~210 C nozzle / 55-60 C bed (check your filament's label)
- Optional: use a different filament per cup on the U1's multi-tool head (paint cups by height) for a colourful variant.
- Not yet test-printed. Print one before listing and check wall bonding between cups.

## Trend research (honest note)
Seller guides for 2026 consistently list desk/home organisation, phone stands, personalised items and articulated fidget toys as proven Etsy 3D-print categories. I found no hard Etsy sales numbers for hex desk organizers specifically, so "trending" is directional, not proven. Personalisation (name text) and colour combos are the usual way to raise price 30-50%.

## Listing draft (NOT published — needs your permission)
Title: Honeycomb Desk Organizer - 4 Cup Hexagon Pen Holder, Modern Geometric Desk Decor, 3D Printed
Tags: desk organizer, pen holder, hexagon decor, 3D printed, office gift, honeycomb, desk accessories, geometric, makeup brush holder
