# Honeycomb Desk Organizer (2026-11-08)

Original design. It is an abstract 7-cell hex organizer that copies no real product, brand or character. Cells step in height from 45 to 90 mm for pens, brushes, tools and scissors.

Files:
- `honeycomb-desk-organizer.3mf`: print file (mm, single part, flat base on Z=0)
- `honeycomb-desk-organizer.kerf.json`: editable Kerf source
- `preview-iso.png`: render

## Geometry (checked in the exported 3MF)
- Size 114.4 x 110.4 x 90.0 mm. Min Z = 0, so it sits flat on the bed.
- 7 hex cells, 36 mm across the flats inside. Shared walls are 1.6 mm (4 perimeters at 0.4 mm). Floor is 2.0 mm (10 layers at 0.2 mm).
- All walls are vertical and the base is flat, so there are no overhangs and **no supports are needed**.
- Approx. 88 cm3 of material, about 110 g of PLA.

## Snapmaker U1 / 0.4 mm nozzle settings (suggested)
- Nozzle 0.4 mm, layer height 0.2 mm, line width ~0.42 mm.
- Walls: 4 (Arachne). Top/bottom layers: 0 top (open), 10 bottom. Infill: any, since the walls are almost all perimeter.
- Supports: off. Brim: optional (a small brim helps tall thin parts stay stuck on the textured PEI plate).
- Material: PLA or PETG, in a single colour. The U1 can multi-colour via its toolheads. To make it multi-colour, split the cells into separate parts in Kerf.
- The 3MF holds geometry and part colour only. It does not embed Snapmaker Orca process or filament presets, so choose the U1 0.4 mm presets when you import.
- I did not verify the U1's build volume from a primary source. The model is under 115 x 111 x 90 mm and should fit comfortably, but check it in your slicer.

## Trend notes (directional, not hard sales data)
Searches this run: original geometric desk organizers, print-in-place fidgets and personalised desk items keep coming up as steady sellers in 2026. Etsy only allows original designs for 3D-printed listings. The sources are SEO and vendor blogs, so confirm against live Etsy search before listing.

## Draft Etsy listing (NOT published, awaiting your approval)
Title: Honeycomb Desk Organizer, Geometric Pen Holder, Stepped Hex Pencil Cup, Modern Desk Decor, 3D Printed
Tags: desk organizer, pen holder, hexagon decor, geometric decor, office gift, 3d printed, desk accessories, honeycomb, pencil cup, workspace decor, teacher gift, craft storage, makeup brush holder
