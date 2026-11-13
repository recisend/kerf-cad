# Honeycomb Desk Organizer (2026-11-13)

Original design, not based on any real product, brand or character. Made in Kerf CAD via the MCP server (`honeycomb-desk-organizer.kerf.json`).

- Files: `honeycomb-desk-organizer.3mf` (mm, flat on z=0), `honeycomb-desk-organizer.kerf.json` (editable), `preview.png`
- Size: 124.7 x 120 x 95 mm (Snapmaker U1 bed is 270 x 270 x 270 mm, so there is plenty of room)
- 7 hex cells (inner width 38.4 mm across flats), stepped heights 45-95 mm for pens, brushes, scissors, tablet stylus, etc.
- Volume 121 cm3 of material (solid), roughly 90-110 g of filament depending on settings.

## Why this product (trend basis)
Directional, from third-party guides and Etsy category pages (not verified sales data):
- Desk organizers / pen holders show up across Etsy's "best selling 3D printed" categories.
- Etsy's Fall/Winter 2026 reporting points to gifting (Friendsmas, personalised gifts); a desk organizer is an easy gift item that sells year-round, unlike a seasonal ornament.
- "Cozy minimalism" / geometric home decor is an evolving 2026 theme. Honeycomb geometry fits it.
Caveat: no source gave verified 2026 search volume for this exact item. Check eRank / Etsy search suggestions before listing.

## Printability, tuned for Snapmaker U1 + 0.4 mm nozzle
- No supports, no overhangs, no bridges. All walls are vertical.
- Outer walls 1.6 mm = exactly 4 perimeters at 0.4 mm line width; shared walls 3.2 mm = 8 perimeters. No thin-wall gaps.
- Floor 2.0 mm = 10 layers at 0.2 mm (or 8 at 0.25 mm).
- 0.6 mm chamfer on the bottom edge to reduce elephant foot.
- Heights chosen to avoid tall unsupported single-wall features. Aspect ratio of the tallest cell is modest (95 mm on a ~48 mm wide cell).

### Suggested slicer settings (Snapmaker Orca / Orca-based slicer, U1 profile, 0.4 nozzle)
| Setting | Value |
|---|---|
| Layer height | 0.20 mm (0.16 for a nicer finish) |
| Wall loops | 4 |
| Top/bottom layers | 0 top (open), 10 bottom |
| Infill | 10-15% gyroid (almost nothing to fill) |
| Supports | Off |
| Brim | Optional, 5 mm, if the bed adhesion is marginal |
| Filament | PLA / PLA+ (silk or matte PLA photographs well for Etsy); PETG also fine |
| Seam | Aligned or back, vertical seams hide well on hex corners |

Confirm in the slicer that the U1 printer profile and 0.4 mm nozzle preset are selected after importing the 3MF. The 3MF holds geometry only, with no printer settings embedded.

## Draft Etsy listing (NOT published, needs your approval)
Title: Honeycomb Desk Organizer, Modern Geometric Pen Holder, Hexagon Desk Storage, Office Gift
Tags: desk organizer, pen holder, honeycomb decor, hexagon organizer, office gift, desk accessories, geometric decor, 3d printed gift, makeup brush holder, home office decor
Description points: made to order, printed in PLA, 7 compartments, 12.5 x 12 x 9.5 cm, colour options, hand finished.
Note: "3D printed" must be disclosed on Etsy (it is a made-by-you item, which is fine if you print it yourself).
