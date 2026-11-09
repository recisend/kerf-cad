# Hex Honeycomb Desk Organizer (2026-11-09)

Original design (not based on any real product or licensed character), built with the Kerf CAD MCP.
Seven hexagonal cups of different heights (60–100 mm) share 1.6 mm walls. Use it for pens, brushes, makeup brushes, cutlery or small plants.

| | |
|---|---|
| File to print | `hex-honeycomb-desk-organizer.3mf` (millimetres, single part, watertight: 0 open/non-manifold edges) |
| Editable source | `hex-honeycomb-desk-organizer.kerf.json` (variables `#wall`, `#base`) |
| Size | 90.3 × 87.2 × 100 mm (fits Snapmaker U1's 270 mm bed with room to spare) |
| Volume | ~76.9 cm³ solid, about 95 g of PLA at 100% fill; far less with the settings below |

## Why it suits the Snapmaker U1 with a 0.4 mm nozzle
- Wall 1.6 mm = exactly 4 perimeters of 0.4 mm lines. Shared walls are about 1.64 mm.
- Base 2.0 mm = 10 layers at 0.2 mm. Heights are multiples of 0.2 mm (60/65/70/80/85/90/100).
- Flat bottom, vertical walls, no overhangs, so **no supports** and no brim needed.
- Single body, so it prints in one colour; on the U1's multi-toolhead setup you can assign one filament to the whole model or colour-change by height in the slicer.

## Suggested slicer profile (verify in your own slicer)
- Nozzle 0.4 mm, layer height 0.2 mm, line width ~0.42 mm
- Walls 4, top/bottom layers 5 and 4, infill 10–15% gyroid (walls do the work)
- Supports off, seam: aligned/back, orientation as modelled (flat on bed)
- PLA or PETG; Etsy buyers like matte or silk PLA colours

## Etsy draft (NOT published; needs your approval)
**Title:** Honeycomb Pencil Holder, Hex Desk Organizer, 3D Printed Pen Cup, Geometric Desk Decor
**Tags:** desk organizer, pen holder, honeycomb decor, geometric, office gift, brush holder, 3D printed, desk accessory, makeup brush holder
**Description points:** original design by the shop, printed to order in your colour, 7 compartments, ~90 × 87 × 100 mm, PLA, hand wash only, not food safe.
**Before listing:** state that the item is 3D printed and designed by you (Etsy's Creativity Standards), print and photograph a real sample, and price from your own filament and time costs.

## Trend basis and caveats
Desk and organiser items, plant and geometric decor, and fidget/desk toys keep appearing as strong categories in 2026 roundups (PrintPal, Snapmaker blog, Hyper3D, StackSheriff). Most of those figures come from SEO and affiliate blogs, not Etsy's own data, so treat them as a direction, not a sales guarantee. Test one listing before printing stock.

## Modelling notes
- Cavity inner faces are offset ~0.02 mm from the neighbouring cell's outer face. With exactly coplanar faces, the kernel's mesh had 11 open edges at the height steps.
- The kernel skipped the optional 0.6 mm bottom chamfer, so there is none. If you see elephant foot, enable the slicer's elephant-foot compensation.
