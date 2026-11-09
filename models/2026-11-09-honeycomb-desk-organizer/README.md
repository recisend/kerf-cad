# Honeycomb Desk Organizer (2026-11-09)

Original, generic geometric design: three joined hexagonal cups of different heights (55 / 75 / 100 mm). It is not based on any real product, brand, character or licensed item.

Files
- `honeycomb-desk-organizer.3mf`: print file (millimetres, one part, no supports needed).
- `honeycomb-desk-organizer.kerf.json`: editable Kerf CAD source.
- `preview.png`: render.

## Why this item
Market research found only moderate evidence for desk organizers. Articulated fidget toys had the clearest demand, but they need print-in-place hinges that Kerf's feature set can't reliably produce yet. Sources were seller blogs, not verified Etsy sales data, so this is a reasoned bet rather than a guaranteed seller. Honeycomb and hex desk organizers are a recurring niche, and the design has no licensing risk.

## Geometry (verified)
- Footprint 110.9 × 112 × 100 mm, which fits the Snapmaker U1 270 × 270 × 270 mm volume.
- Wall thickness 1.6 mm, which is exactly four 0.4 mm perimeters. Shared walls between cups are 3.2 mm.
- Floor 2 mm (10 layers at 0.2 mm). All heights (2, 55, 75, 100) are multiples of 0.2 mm.
- Flat base, vertical walls and open tops: no overhangs, so no supports.
- Volume 82.9 cm³, about 103 g of PLA if the walls print fully solid (1.24 g/cm³).
- The 3MF mesh was checked: watertight, 0 non-manifold edges, volume matches the CAD solid.

## Recommended slicer settings (Snapmaker U1, 0.4 mm nozzle)
- Material: PLA (PETG also works). Open-frame U1 is fine for these; no enclosure is needed.
- Layer height 0.2 mm, 4 walls with Arachne wall generator, 2 bottom layers, no top layers (open top).
- Infill is irrelevant: the walls are about 100% perimeters. Use 10-15% so floors fill.
- Supports: off. Brim: optional, the footprint is large and stable. Confirm the brim value in Snapmaker Orca's U1 profile.
- Elephant foot compensation about 0.1 mm if the first-layer edge flares. A chamfer was tried in CAD but corrupted the solid, so it is left to the slicer.
- Orientation: as exported, flat on the bed. Do not rotate.

## Draft Etsy listing (NOT published)
Title: Honeycomb Desk Organizer, Hexagon Pen Holder, Geometric 3D Printed Desk Storage
Tags: desk organizer, pen holder, hexagon organizer, honeycomb decor, desk accessories, office gift, geometric decor, 3d printed, makeup brush holder, home office
Description: Modern honeycomb desk organizer in three heights for pens, brushes, scissors and tools. 3D printed in PLA. Choose your colour. Dimensions about 11 × 11 × 10 cm.
Suggested variations: colour, plus a mini (about 60%) size if you want a second SKU.
Not yet done: price, photos, shipping profile. Awaiting your approval before anything is listed.
