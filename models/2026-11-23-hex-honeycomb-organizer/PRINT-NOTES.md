# Hex Honeycomb Desk Organizer (original design, 2026-11-23)

**Not published.** Listing text below is a draft for your review; nothing has been posted to Etsy.

## Why this item
Desk organizers / home organization are consistently named among the stronger 3D-print categories for Etsy in 2026 roundups (directional vendor-blog data, not hard Etsy sales numbers). Original generic geometry: no brands, characters or real-product replicas.

## Model
- 3 fused hex cups, heights 70 / 95 / 120 mm, footprint ~81.5 x 82.6 mm, height 120 mm
- Walls 1.6 mm (4 x 0.4 mm lines), floor 2.4 mm, 0.6 mm bottom chamfer (elephant-foot relief)
- No supports, no overhangs, flat base. Volume ~63.3 cm3 (~79 g PLA at 1.24 g/cm3 solid; far less with sparse infill)
- File: `hex-honeycomb-organizer.3mf` (mm, single part). Source: `.kerf.json`

## Snapmaker U1 (0.4 mm nozzle, 270^3 mm volume) suggested slicer settings
- Layer height 0.2 mm, 2 walls (Arachne), 3-4 top/bottom layers, 10-15% infill (walls are nearly solid anyway)
- PLA, textured PEI plate, no supports, brim optional
- Snapmaker's 3MF import loads parameters from the file; this file carries geometry only, so confirm Printer/Filament/Process presets in Snapmaker Orca.
- Single-material; for multicolor, assign a different filament per cup in the slicer.
