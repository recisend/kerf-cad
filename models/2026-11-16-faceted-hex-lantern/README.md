# Faceted Hex Lantern (2026-11-16)

Original geometric tealight lantern: hexagonal body, six pointed-arch windows, open top. Not based on any real product, brand, character or licensed item.

Files: `faceted-hex-lantern.3mf` (print file, mm), `faceted-hex-lantern.kerf.json` (editable Kerf source), `preview.png`.

## Why this design (trend basis)
Web research this run (Nov 2026) found the same categories recurring across 3D-printing-on-Etsy guides: home decor / lighting, personalised gifts, desk and home organisers. It is the holiday season, and candle/lantern decor is gift-friendly. Caveat: most of those guides are written by 3D-tools vendors, not independent sales data, and no source gave a holiday-specific ranking. Check Etsy search suggestions / Etsy Insights before listing. Lightboxes with brand logos were the most-cited bestsellers but need licences, so they were deliberately avoided.

## Dimensions
58.9 x 68.0 x 65.0 mm (flat-to-flat x point-to-point x height). Fits a 270 mm bed with huge margin; ~18.5 cm3, ~23 g PLA solid-equivalent (real use is lower with 3 walls/sparse infill).
Cavity ~64 mm across flats, comfortably fits a standard 38 mm LED tealight (use LED only, never a flame, with PLA).

## Optimised for Snapmaker U1, 0.4 mm nozzle
- Wall thickness 1.6 mm = 4 perimeters at 0.4 mm line width; floor 2.0 mm = 10 layers at 0.2 mm.
- Window geometry: top edges of windows are ~50 degrees from horizontal (<= 45 degree overhang rule satisfied), so no supports and no bridging.
- Flat base, 0.6 mm bottom chamfer to avoid elephant-foot; no thin features below 1.6 mm.
- Single body, one colour part; prints upright, no supports.

Suggested slicer settings (Snapmaker Orca / U1 0.4 nozzle profile): 0.2 mm layer, 4 walls, 2 top/bottom layers where applicable (floor 10 layers), 10-15% infill (irrelevant, walls only), no supports, brim off, PLA (translucent/silk or white looks best lit). Estimated time roughly 2.5-3.5 h per lantern (estimate, not sliced here).

## Note on export
The model was exported with Kerf's 3MF exporter (mesh, mm, Z up, sits on Z=0). The 3MF contains geometry only (no printer/filament profile), so select the Snapmaker U1 0.4 mm profile when importing.

## Etsy listing draft (NOT published)
Title: Geometric Hexagon Tealight Lantern - Modern Candle Holder Decor, 3D Printed, Housewarming Gift
Tags: geometric lantern, tealight holder, 3d printed decor, hexagon decor, housewarming gift, modern home decor, LED candle holder, minimalist decor, winter decor, gift for her/him
Description notes: state LED tealights only, PLA, colour options, dimensions above.

Status: awaiting owner permission before any publishing.
