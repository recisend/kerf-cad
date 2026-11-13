# Honeycomb Desk Caddy — 2026-11-13

Original parametric design (7 fused hex cells, stepped heights 80/60/45 mm). Not modelled on any real product, brand or character.

## Files
- `honeycomb-desk-caddy.3mf` — print file (millimetres, single watertight part, Z-up, flat bottom)
- `honeycomb-desk-caddy.kerf.json` — editable Kerf source (open in the Kerf web app / MCP)
- `preview.png` — render

## Why this product (trend basis)
Seller-education and marketplace sources (Etsy "best selling 3D printed" pages, Snapmaker, JLC3DP, PrintPal, eufyMake 2026 roundups) consistently name **desk / home organisation** as a top 3D-print category for 2026, with personalised and gift-able decor next. A hex organiser sits in both and is ideal for Black Friday / holiday gifting (peak window now through mid-December).
Caveat: those sources are mostly vendor blogs, not Etsy sales data. Treat as directional and sanity-check search volume in eRank/Marmalead before listing.

## Snapmaker U1 / 0.4 mm nozzle optimisation
- Size 78.8 × 76.0 × 80 mm — well inside the U1 270 × 270 × 270 mm build volume.
- No supports needed: vertical walls, flat 2.0 mm floor on the bed, no overhangs.
- All Z dimensions are multiples of 0.2 mm (floor 2.0; heights 80 / 60 / 45) → clean layers at 0.2 mm layer height.
- Wall thickness is a multiple of the 0.4 mm line width: outer wall 1.2 mm (3 perimeters), shared walls 1.6 mm (4 perimeters), floor 2.0 mm (10 layers at 0.2).
- Single material / single colour (works on any one U1 toolhead; or swap filament at a layer for two-tone).

### Suggested slicer settings (Snapmaker Orca)
| Setting | Value |
|---|---|
| Printer / nozzle | Snapmaker U1, 0.4 mm |
| Layer height | 0.2 mm |
| Walls | 3 (4 also fine) |
| Top/bottom layers | 5 / 8 (floor is 10 layers solid) |
| Infill | 15 % gyroid (almost all geometry is perimeter) |
| Supports | Off |
| Brim | Optional 3 mm if the bed adhesion is marginal |
| Material | PLA (est. ~52 g, ≈ 4–5 h; confirm in slicer) |
| Elephant-foot compensation | 0.1–0.15 mm in slicer |

## Not done / needs the owner
- **Not published anywhere.** Listing text below is a draft only; nothing was posted to Etsy.
- Check Etsy's current 3D-printed-item disclosure rules ("made by seller", production partner info) before listing.
- Print one test piece to verify pen fit and finish before selling; take real photos (the render is not a product photo).

## Draft listing (unpublished)
**Title:** Honeycomb Pen Holder – Hexagon Desk Organizer – 3D Printed Desk Caddy – Gift for Home Office
**Tags:** desk organizer, pen holder, hexagon decor, 3d printed, office gift, honeycomb, pencil cup, makeup brush holder, home office decor, geometric decor, teacher gift, desk accessories, stationery holder
**Description:** Seven connected hexagon cells in three heights hold pens, pencils, markers, brushes, scissors and rulers. Printed in PLA on a Snapmaker U1, sturdy 1.2–1.6 mm walls, flat base that won't tip. Approx. 79 × 76 × 80 mm. Available in your choice of colour. Hand wash / wipe clean; not for hot liquids or dishwasher.
