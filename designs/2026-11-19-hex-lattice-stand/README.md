# Hex Lattice Phone Stand (2026-11-19)

Original design, not modelled on any real product, brand or licensed character.

## Files
- `hex-lattice-phone-stand.3mf` – print file (millimetres, 1 manifold part, 214 vertices / 444 triangles, no non-manifold edges)
- `hex-lattice-phone-stand.kerf.json` – editable Kerf source (open in the Kerf web app or via the MCP `open_document`)
- `preview-*.png` – renders (use for listing photos only after printing a real sample)

## Size
75 × 80 × 92 mm (X × Y × Z). The Snapmaker U1 bed is 270 × 270 × 270 mm, so it fits with a large margin and
several can be printed in a single plate (e.g. 3 × 3 = 9 per plate).

## Printing on a Snapmaker U1, 0.4 mm nozzle
The 3MF carries geometry only (no slicer profile), so select the Snapmaker U1 / 0.4 mm nozzle profile in the slicer.
- Orientation: as exported, flat base on the bed. **No supports, no brim needed.**
- Layer height 0.20 mm (0.16 mm for a nicer finish on the angled face)
- Walls: 3 (1.2 mm = 3 × 0.4 mm line width); top/bottom 4 layers
- Infill: 12-15 % gyroid
- PLA (or PETG): suggested starting point 215-220 °C nozzle / 55-60 °C bed, adjust to the filament
- Estimated filament: solid volume 121 cm³ (about 150 g at 100 %), so roughly 60-80 g at the settings above

## Design choices for a clean 0.4 mm print
- Smallest wall: about 5 mm (hex lattice), backrest plate 6 mm; every wall is a multiple of 0.4 mm lines or wider
- Backrest leans back at 70° (underside is 20° from vertical, so no support needed)
- Hex windows are flat-top, so their ceilings are short (9 mm) bridges rather than steep overhangs
- Phone slot is 15 mm wide at the floor (about 14 mm of usable phone + case thickness), with a 12 × 18 mm cable slot through the floor for a charging cable

## Status
Not yet test-printed. Print one sample and check the fit before listing. **Nothing has been published anywhere.**
