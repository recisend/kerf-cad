# Honeycomb Desk Caddy (2026-11-12)

Original design, not based on any real product, brand or character.

**Why this one:** Desk organizers and pen holders are a consistently recurring Etsy/3D-print seller category. Sources are seller guides and blogs, not Etsy sales data, so this is a directional signal rather than a guaranteed seller. Check Etsy's current policy for 3D-printed items before listing.

## Geometry
- 7 hex cells (1 tall center + 6 ring cells alternating 80 / 60 mm; center 100 mm)
- Overall: 79.9 x 77.2 x 100 mm (fits the Snapmaker U1 270 mm build volume with lots of room)
- Cell inner width: about 24.5 mm flat-to-flat
- Walls: 1.6 mm (4 perimeters at 0.4 mm). Shared walls between cells are 1.6 mm. Floor: 2.0 mm
- No overhangs, no bridges, flat bottom: prints with no supports
- Volume about 62.8 cm3 (about 78 g PLA solid-ish, less with normal infill)

## Suggested slicer settings (Snapmaker U1, 0.4 mm nozzle)
- Layer height 0.2 mm, line width 0.42-0.45 mm
- 4 walls, 10 top / 10 bottom layers is more than enough: floor is 2.0 mm, so use 8-10 bottom layers
- Infill 10-15% (walls are nearly all perimeters anyway)
- No supports, no brim needed (use brim 3-4 mm if bed adhesion is a concern on the tall center cell)
- Orientation: as exported (flat on bed, Z up)
- Material: PLA / PETG; multicolor via the U1's tool heads is possible by colour-changing by height

## Files
- `honeycomb-desk-caddy.3mf` - print file (mm)
- `honeycomb-desk-caddy.kerf.json` - editable Kerf CAD source
- `preview.png`

## Status
Not listed anywhere. Needs the owner's permission before any publishing.
