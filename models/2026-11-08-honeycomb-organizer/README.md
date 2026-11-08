# Honeycomb Desk Organizer Set (2026-11-08)

Original design, no real-world product, brand, character or licensed IP. Modeled in Kerf CAD.

Files
- `honeycomb-organizer-set.3mf` - print file (millimetres, 4 named, coloured parts)
- `honeycomb-organizer-set.kerf.json` - editable Kerf source (open in the web app or via the MCP `open_document`)
- `preview.png` - render

## Design
Four hexagonal cups that tessellate into a honeycomb. Each cup is a separate part with ~0.44 mm gap
between neighbouring flats, so they print as loose pieces and can be rearranged by the buyer.
Each cup is 51.96 mm flat-to-flat (60 mm point-to-point).

| Part | Height | Colour (suggested) | Use | PLA est. |
|---|---|---|---|---|
| Cup 1 | 90 mm | teal `#2f6f6a` | pens / brushes | ~35 g |
| Cup 2 | 65 mm | mustard `#d9a441` | scissors / rulers | ~27 g |
| Cup 3 | 45 mm | cream `#e8e2d4` | markers / small tools | ~20 g |
| Cup 4 | 28 mm | terracotta `#c4604a` | paper clips / SD cards | ~14 g |

Total ~95 g PLA (kerf mass_properties, solid PLA density, before slicer infill/wall settings; these are
open-top hollow cups so the number is close to real).

## Snapmaker U1 / 0.4 mm nozzle optimisation
- Wall 1.6 mm = exactly 4 perimeters at 0.4 mm line width. Floor 1.6 mm = 8 layers at 0.2 mm.
- 0.8 mm x 45 deg chamfer on the bottom edge of every cup to limit elephant's foot. No overhangs, bridges or
  supports anywhere. Flat bottoms, vertical walls, open top.
- Smallest feature is the 1.6 mm wall, well above the 0.4 mm nozzle minimum.
- Footprint of the whole set is ~131 x 105 mm, far inside the U1's 270 x 270 x 270 mm bed. Tallest part 90 mm.
- Four parts = four colours = one per U1 toolhead, so the full set prints multi-colour in a single job
  with no manual filament swaps. Assign filaments per part when you open the 3MF.
- Suggested slicer settings: 0.2 mm layer, 4 walls, 0-5% infill (walls are the structure), 3 top/bottom
  layers, no supports, no brim. Use PLA (any), PETG also fine.
- Cups have a 0.44 mm gap, so keep "elephant foot compensation" on and avoid a brim so they do not fuse.

NOTE: The 3MF from Kerf carries geometry, names and part colours only. It does not contain U1 machine/process
presets or a toolhead-to-filament mapping. Pick the Snapmaker U1 0.4 mm profile in Snapmaker Orca/Luban when
importing, then map each colour to a toolhead. I have not sliced or test-printed this file.

## Draft Etsy listing (NOT published - needs your approval)
Title idea: Honeycomb Desk Organizer Set, Modular Hexagon Pen Holder, Desk Storage, Office Gift
Tags idea: desk organizer, hexagon pen holder, honeycomb decor, office gift, modular storage,
  desk accessories, teacher gift, craft supply holder, minimalist desk, home office
Bullets: set of 4 stackable-looking hex cups in 4 sizes, mix-and-match colours, no assembly,
  lightweight PLA, made to order.

Trend caveat: sources I found (seller guides/blogs, not Etsy sales data) consistently list desk organizers
and gift/personalised items among steady 3D-print sellers, and say Etsy expects your own original designs.
I could not verify live Etsy search volume for this exact product; check eRank/Etsy search before listing.
