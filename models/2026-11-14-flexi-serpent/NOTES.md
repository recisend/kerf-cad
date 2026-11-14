# Flexi Serpent (print-in-place chain) – 2026-11-14

Original design, not based on any real product, brand or character.

- Files: `flexi-serpent.3mf` (export), `flexi-serpent.kerf.json` (editable source), `preview.png`
- Size: ~151 x 9 x 6.8 mm, 8 linked segments (fits the Snapmaker U1 270 mm bed, laid flat)
- Hinge: 3.6 mm pin, 4.6 mm hole (0.5 mm radial clearance), 0.4 mm vertical gaps.
  All Z levels are multiples of 0.2 mm (0, 2.0, 2.4, 4.4, 4.8, 6.8).
- Each segment is a separate part in the 3MF. Do NOT let the slicer auto-arrange/split them;
  keep original positions (print-in-place).

## Suggested slicer settings (Snapmaker U1, 0.4 mm nozzle, PLA)
- Layer height 0.2 mm, 3 walls, 15% infill, no supports, no brim needed (adds a thin brim if first layer is flaky)
- Slow outer walls (~60 mm/s), cooling fan high so the 0.4 mm bridges stay clean
- Test print ONE pair of segments first to confirm the gap works on your printer/filament.

## Known limitations (honest status)
- Geometry is simple/boxy: a working print-in-place hinge proof, not yet a polished sellable design.
- Both end segments have one unused hinge feature (empty tab / bare pin).
- Not test-printed. Fillet on the body edges failed in Kerf (corrupted geometry), so it was left out.
- The "trending" claim is based on marketing-level web sources (articulated/flexi fidgets are widely
  reported as a top Etsy category, ~83% search growth for "3d print fidget"); no official Etsy sales data.
- Nothing has been listed or published anywhere.
