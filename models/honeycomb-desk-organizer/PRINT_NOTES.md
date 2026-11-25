# Honeycomb Desk Organizer (original design)

Original geometric design, not based on any real product, brand or character.

## Files
- `honeycomb-desk-organizer.3mf` — print file (millimetres, single closed solid, 870 triangles, 0 open edges)
- `honeycomb-desk-organizer.kerf.json` — editable Kerf CAD source
- `preview.png` — render

## Geometry
- 7 hexagonal pockets, 36.5 mm flat-to-flat (fits pens, markers, scissors, brushes, a cable)
- Stepped heights: back row 95 mm, middle row 75 mm, front row 55 mm
- Overall 115.9 x 111.8 x 95 mm (U1 build volume is 270 mm cube, so fits with a wide margin)
- Wall 1.6 mm everywhere (4 perimeters at 0.4 mm), floor 2.4 mm
- Vertical walls, flat bottom: no supports, no overhangs, no bridges
- ~100.4 cm3 solid; ~124 g PLA as an upper bound (less with sparse infill)

## Snapmaker U1 / 0.4 mm nozzle settings (starting point, verify in Snapmaker Orca)
- Slicer: Snapmaker Orca, U1 profile, 0.4 mm nozzle
- Layer height 0.2 mm (0.16 mm for a finer finish)
- Walls: 4 (= 1.6 mm), Arachne wall generator
- Bottom layers: 12 at 0.2 mm (= 2.4 mm floor); top layers 4
- Infill: 10-15%; barely matters since the walls are almost all perimeter
- Supports: off. Brim: not needed; use a 3-5 mm brim only if corners lift
- Enable elephant-foot compensation (~0.1-0.15 mm) in the slicer instead of modelling a chamfer
- Material: PLA works as-is; PETG/ASA also fine
- Colour idea for the U1's multi-toolhead setup: change colour by height (e.g. one colour per 25 mm band) for a gradient look

I have not sliced this file or printed it. Print time and filament use need to come from your slicer. Run a test print before listing.

## Trend research (honest summary)
- Etsy does not publish a clear current best-seller ranking. Sources found were mostly seller and vendor blogs.
- Consistent signals across them: functional desk and home organization, personalized gifts, geometric home decor.
- ZIK Marketplace Index (eBay, 30 days to Oct 1 2026): workshop organizers sold well, while planters/vases sold little as 3D prints. Most top eBay sellers were branded/licensed items, which this design avoids on purpose.
- Etsy's 2025 rule: 3D-printed items must be your own design. This one is.
- Nothing here guarantees sales. Check Etsy search suggestions and competing listings for "hexagon pen holder" / "desk organizer" before pricing.

## Draft Etsy listing (NOT published)
**Title:** Honeycomb Desk Organizer, Hexagon Pen Holder, Geometric Desk Tidy, Office Gift, 3D Printed

**Tags:** desk organizer, pen holder, hexagon organizer, honeycomb, office gift, desk accessories, geometric decor, 3d printed, makeup brush holder, teacher gift, home office, WFH gift, art supply holder

**Description:** Seven hexagonal pockets in three stepped heights keep pens, markers, scissors, brushes and cables within reach. Printed in PLA with 1.6 mm walls for a sturdy, solid feel. 115 x 112 x 95 mm. Available in your choice of colour. Hand-finished and printed to order.

Pricing, shipping and colours are your call.
