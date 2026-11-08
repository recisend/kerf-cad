# Hive Desk Organizer (2026-11-08)

Original, parametric honeycomb pen and tool cup: seven hexagonal pockets with staggered rim heights
(45–95 mm). Original geometry only. It is not based on any real product, brand, character or
licensed design.

Files
- `hive-desk-organizer.3mf` is the print file (millimetres, single part, watertight)
- `hive-desk-organizer.kerf.json` is the editable Kerf document
- `preview.png` is a render

## Optimised for: Snapmaker U1, 0.4 mm nozzle

| Property | Value | Why |
|---|---|---|
| Footprint | 132 x 127 mm, 95 mm tall | Fits the U1 build volume (270 x 270 x 270 mm, per Snapmaker's spec - confirm on your unit) |
| Orientation | Open end up, as exported | Flat base, no overhangs, no supports |
| Outer wall | 1.6 mm | 4 perimeters at 0.4 mm line width |
| Shared inner walls | 3.2 mm | 8 perimeters, no thin walls to under-extrude |
| Floor | 1.6 mm | 8 layers at 0.2 mm |
| Layer height | 0.2 mm | Standard for a 0.4 mm nozzle |
| Features | All wall thicknesses are multiples of 0.4 mm | Avoids gap-fill artifacts |
| Volume | about 130 cm3 (about 160 g in PLA) | Walls are almost entirely solid, so infill barely matters (10-15 % is fine) |

Suggested slicer settings (Snapmaker Orca): 0.20 mm layer, 4 walls, 5 top layers, 10 % gyroid infill,
no supports, brim not needed (large flat base). Single colour works as-is. Because the U1 has four toolheads,
you can also print it in a colour gradient by layer height (for example colour change at 45 / 60 / 80 mm), which
suits the stepped rims and photographs well.

Print time and filament use are estimates only. Slice it on your machine for real numbers.

## Mesh note

Kerf's 3MF export left a one-triangle hole in a pocket wall (a kernel tessellation quirk). It was closed
with `tools/repair3mf.py`, which only fills holes bounded by exactly three edges. The repaired file has
zero open edges, and its volume matches an analytic calculation (130,358 mm3).

## Etsy listing draft (NOT published - for your review)

Title: Honeycomb Desk Organizer - Hexagon Pen Holder - Modern Geometric Desk Accessory

Tags: desk organizer, pen holder, honeycomb decor, hexagon organizer, office desk gift, 3d printed,
geometric decor, desk accessories, pencil cup, makeup brush holder, work from home gift, minimalist desk

Description: A 7-cell honeycomb organizer with staggered heights for pens, pencils, brushes, markers and
small tools. Printed in PLA with thick 1.6 mm walls and a flat, stable base. Original design.
Dimensions: 132 x 127 x 95 mm. Colour options available on request.

## Trend research (directional, not verified sales data)

Sources found that desk organizers and other functional items, articulated fidget prints, and personalized
or gift items are consistent Etsy categories, and that decor is less clear-cut. Most sources are vendor blogs
with SEO-driven claims, and no verified Etsy-specific 2026 bestseller list was found. Sources: Snapmaker
blog (most popular 3D printed items), insightagent.app (best-selling 3D printed items on Etsy), Elegoo blog
(best-selling 3D things on Etsy), Zik Analytics. Etsy also removes listings built on files or characters the
seller has no rights to, which is why this design is original.
