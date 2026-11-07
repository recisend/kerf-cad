# Hex Cell Organizer (2026-11-07)

Original, abstract geometry (no real-world product, brand, character or licensed item).
Seven interlocking hexagonal cells at staggered heights (60 / 70 / 85 / 100 mm) - a desk
pen/brush/tool organizer.

## Files
- `hex-cell-organizer.3mf` - print file (millimetres), single part
- `hex-cell-organizer.kerf.json` - editable Kerf CAD source (open in the web app)
- `preview-iso.png`, `preview-top.png` - renders

## Dimensions
- Footprint 86 x 83.1 mm, height 100 mm (Snapmaker U1 build volume ~270 mm cube - fits easily; more than one fits per plate)
- Cell inner flat-to-flat 26 mm; wall 2.0 mm (5 x 0.4 mm lines); floor 2.0 mm (10 layers @ 0.2 mm)
- Solid volume 91.0 cm3 -> ~113 g PLA if walls print fully solid (check in slicer)

## Printability (0.4 mm nozzle)
- Flat bottom, vertical walls, no overhangs, no bridges -> **no supports needed**
- Wall thickness is a multiple of the 0.4 mm line width, so no gap fill / thin-wall artifacts
- Print upright as exported

## Suggested slicer settings (Snapmaker Orca, Snapmaker U1, 0.4 mm nozzle)
Starting point only - community profile, not an official vendor value. Verify on a test print.
- Layer 0.20 mm, walls 3-5 (2.0 mm wall = 5 lines), Arachne wall generator
- Top 3 / bottom 5 layers, infill 10-15% (irrelevant - walls are solid)
- Brim 3-5 mm recommended (tall, narrow footprint; also protects the toolhead rails per MakerWorld notes)
- Textured PEI plate, PLA. Multi-colour (e.g. colour change by height) works well on the U1's 4 toolheads.
