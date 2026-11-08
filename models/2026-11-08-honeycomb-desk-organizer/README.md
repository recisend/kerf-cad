# Honeycomb Desk Organizer (2026-11-08)

Original geometric design (no real-world product, brand or IP). Five interlocking hex cells in stepped heights (35 / 50 / 65 / 80 / 95 mm) for pens, brushes, scissors, rulers, clips.

- Files: `honeycomb-desk-organizer.3mf` (print file), `honeycomb-desk-organizer.kerf.json` (editable Kerf source), `preview.png`
- Size: 121.5 x 82.6 x 95 mm (fits the Snapmaker U1 270 mm build volume with room to spare)
- Volume: ~71.9 cm3 solid; real print uses far less with 15% infill

## Why this one (research, 2026-11-08)
- Sources agree that generic flexi dragons / phone stands are saturated and cheap; functional desk items, home-office gifts and personalised items hold up better. Desk accessories are a listed Q4 gift category.
- "3d printed organizer" has ~3,600 avg monthly searches but heavy competition (~54k listings) and demand dropped YoY, so differentiate with design (stepped honeycomb, multiple colours) rather than price.
- Etsy requires 3D printed items to be the seller's own design (since June 2025) - this is an original model.
- Caveat: these figures come from seller-tool blogs, not Etsy itself; treat as directional.

## Snapmaker U1 / 0.4 mm nozzle design rules applied
- Walls 1.6 mm = exactly 4 x 0.4 mm perimeters (shared walls too); floor 2.0 mm = 10 layers at 0.2 mm
- Flat bottom, vertical walls, no overhangs, no bridges -> **no supports**
- Single body, watertight, mm units, Z-up, exported as 3MF

## Suggested slicer settings (Snapmaker Orca / Luban)
- Nozzle 0.4 mm, layer height 0.2 mm (0.16 mm for nicer rims), first layer 0.2 mm
- Walls: 4 perimeters (1.6 mm); top layers n/a (open top); bottom layers 5
- Infill 10-15% (floor only), no supports, brim not needed (wide flat base)
- PLA at the filament's recommended temps; vertical seam: aligned or rear
- Multicolour idea for the U1's 4 toolheads: a different colour per cell via colour change at layer 1 (cells share walls, so use a painted/segmented colour per cell in the slicer) - good for listing photos
- Est. print: ~20 g-60 g of filament depending on infill, roughly 6-9 h

## Draft Etsy listing (NOT published - needs owner approval)
**Title:** Honeycomb Desk Organizer - Hexagon Pen Holder, Stepped Desk Caddy, Home Office Gift, 3D Printed
**Tags:** desk organizer, pen holder, honeycomb, hexagon decor, office gift, desk accessories, makeup brush holder, home office, geometric, 3d printed
**Description:** Five stepped hexagon cells hold pens, brushes, scissors, rulers and more. Printed in PLA, 121 x 83 x 95 mm. Pick your colour. Made to order.
