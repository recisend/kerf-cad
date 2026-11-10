# Hex Honeycomb Desk Organizer — 2026-11-10

Original design (generic honeycomb geometry; no real-world product, brand, character or licensed item).
Built parametrically in Kerf CAD (`hex-honeycomb-desk-organizer.kerf.json`), exported as **3MF** (millimetres).

## Why this design (trend research, 2026-11-10)
Seller guides for 2026 consistently list **desk/home organization**, **fidget/desk items** and **personalised gifts** as the
strongest Etsy 3D-print categories. Caveat: most figures come from vendor blogs and trace back to a single source, so treat
them as directional, not verified sales data. One finding worth noting: eBay data shows planters/vases hardly sell as printed
items, so this daily run prefers organizers and gifts over vases.

## Geometry
| | |
|---|---|
| Overall size | 94.8 × 91.5 × 95 mm (fits the Snapmaker U1 bed comfortably) |
| Cells | 7 hex cells, 30 mm flat-to-flat inner (pens, markers, brushes, tools) |
| Cell heights | 95 / 95 (back), 80 / 70 / 80 (middle), 55 / 55 (front) |
| Walls | 1.2 mm = exactly 3 perimeters at 0.4 mm line width; shared between cells |
| Floor | 2.0 mm = 10 layers at 0.2 mm |
| Overhangs | None — all walls vertical, flat base. **No supports.** |
| Volume / weight | ≈ 61.6 cm³ solid, ≈ 76 g PLA (upper bound; slicer will use less) |

## Snapmaker U1 slicing settings (0.4 mm nozzle)
- Slicer: Snapmaker Orca, U1 profile, 0.4 mm nozzle. Open the 3MF; it should land on the plate flat as-is.
- Layer height 0.2 mm, 3 walls, 4+ bottom layers (the 2 mm floor is solid), 15% infill is irrelevant (walls are near-solid).
- Supports off. Elephant-foot compensation ~0.1–0.15 mm if your first layer flares.
- Single colour by default (PLA, teal `#2f7d6b` in the file). For the U1's multi-colour toolheads you could split by cell
  height in the slicer to colour the rows differently — an easy upsell variant ("3-colour set").
- Please check the U1's current build volume in your slicer; this part is well inside any reasonable value.

## Etsy listing draft (NOT published — awaiting owner approval)
**Title idea:** Honeycomb Desk Organizer, Hexagon Pen Holder, Modern Geometric Desk Decor, Office Gift
**Tags idea:** desk organizer, pen holder, honeycomb, hexagon decor, office gift, teacher gift, 3d printed, desk accessories, geometric decor
**Bullets:** 7 cells, stepped heights, no tools needed, printed in PLA, available in many colours, ready to ship.
**Compliance note:** Etsy requires 3D-printed items to be made by the seller from their own design; this is an original design.
Also check Etsy's rules on disclosing production method before listing.
