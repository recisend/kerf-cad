# Hive Desk Organizer (2026-11-15)

Original design, not based on any real product, brand or character: a seven-cell honeycomb pen and desk-supplies cup with a stepped skyline (center cell tallest, six ring cells rising in a spiral).

| File | What |
|---|---|
| `hive-desk-organizer.3mf` | Print file, exported from Kerf CAD (mm, one part) |
| `hive-desk-organizer.kerf.json` | Editable Kerf source (open in the web app or via MCP) |
| `preview.png` | Render |

## Size
100.7 x 97.2 x 100 mm. Fits the Snapmaker U1 (270 x 270 x 270 mm) with a lot of room. Part volume is about 80.9 cm3, roughly 100 g of PLA. It is almost all walls, so infill barely matters; keep it at 5-10%.

## Optimized for Snapmaker U1, 0.4 mm nozzle
- Wall thickness is 1.6 mm = 4 perimeters at a 0.4 mm line width. Floor is 1.6 mm = 8 layers at 0.2 mm. No thin walls, no gap-fill needed.
- Every wall is vertical, the base is flat, nothing overhangs: **no supports, no brim needed.**
- Print upright, as exported (flat face on the bed, Z up).
- Suggested: 0.2 mm layer height, 4 walls, 3-4 top/bottom layers, 5-10% infill, PLA. Single color works; if you want the "skyline" look, you can use a different filament per print (U1 tool changer), or a multi-color PLA.
- The cavities are deep (up to 98 mm), so keep part cooling on and let the printer run the default speed profile, tall thin walls wobble if pushed too fast.

## Verification done here
- Geometry checked in Kerf: volume 80,901 mm3, bbox 100.7 x 97.2 x 100 mm.
- 3MF mesh re-read independently: 874 triangles, signed volume 80,901.4 mm3 (matches the CAD volume), no degenerate triangles.
- **Not verified:** the mesh has 9 unpaired edge records, all on zero-area sliver triangles along two vertical edges and one base edge (kernel tessellation seams). Geometry is closed, but a slicer may print a "repaired open edges" notice. **Not sliced on a real Snapmaker U1 here**, so check the first layers and the slicer preview before listing it for sale, and print a test piece.

## Why this design (trend research, honestly)
Seller-guide sites (not hard Etsy sales data) keep naming the same categories: desk organizers, geometric home/desk decor, personalized gifts, fidgets. This design targets desk organizer + geometric decor. Rankings were directional only, so confirm search demand in Etsy's own tools before committing to a batch. Avoid licensed characters and brands (Etsy rules and copyright).

## Draft Etsy listing (NOT published)
**Title:** Honeycomb Desk Organizer, Hexagon Pen Holder, Modern Geometric Desk Decor, 3D Printed Office Gift

**Tags (13):** desk organizer, pen holder, hexagon organizer, honeycomb decor, geometric decor, office desk gift, pencil cup, makeup brush holder, 3d printed, modern desk decor, teacher gift, desk accessories, minimalist decor

**Description:** A seven-cell honeycomb organizer with a stepped skyline for pens, pencils, brushes, scissors and rulers. Printed in sturdy PLA with thick 1.6 mm walls. Approx. 10 x 9.7 x 10 cm. Choose your color. Made to order.
