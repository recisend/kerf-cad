# Twisted Hex Planter + Saucer (2026-11-11)

Original parametric design built with the Kerf CAD MCP server. It is not a copy of any branded or real-world product or character.

| File | What |
|---|---|
| `twisted-hex-planter.3mf` | Print file: planter and saucer on one plate, millimetres, Z up, both parts flat on Z=0 |
| `twisted-hex-planter.kerf.json` | Editable Kerf source (open in the web app, or with the MCP `open_document` tool) |
| `preview.png` | Render for checking, not a listing photo |

## Geometry
- Planter: 92 x 85 x 100 mm. A hexagon twists 60 degrees over its height and widens from 38 mm to 46 mm radius (five lofted sections).
- Saucer: 92 x 80 x 12 mm hexagonal tray, printed beside the planter.
- Plate footprint: about 202 x 85 mm, so it fits the Snapmaker U1's 270 x 270 x 270 mm bed with room to spare.
- Walls and floor are 1.6 mm, which is 4 perimeters at 0.4 mm line width. The `wall` variable in the Kerf file controls it; keep it a multiple of 0.4 mm.
- 6 mm drain hole in the planter floor.
- Steepest wall slope is about 25 degrees from vertical, so no supports are needed. Both parts have flat bases.

## Checks run on the 3MF
- Unit is `millimeter`. Both meshes are closed with no non-manifold edges.
- Bounding boxes match the design: planter 92 x 85 x 100, saucer 92 x 80 x 12.
- Estimated filament in PLA at 1.24 g/cm3, solid walls only: about 56 g planter and 17 g saucer. This is an estimate from the Kerf volume, not a slicer result.

## Suggested Snapmaker U1 slicer settings (0.4 mm nozzle)
The 3MF carries geometry and colour only. It has no printer profile, so these have to be set in Snapmaker Orca:
- Printer: Snapmaker U1, 0.4 mm nozzle.
- Layer height 0.2 mm (0.12 mm for a smoother twist, but slower).
- Walls: 4 loops, 1.6 mm. Top and bottom layers: 8 at 0.2 mm. Infill does not matter because the walls are solid.
- Supports off. Seam aligned or rear to hide it in a twist corner.
- Any filament works. Matte or silk PLA reads well in photos; the part colour in the file is a placeholder.
- Not yet test-printed. Print one before listing and photograph that print.

## Why this product
Seller-blog sources (not Etsy's own data) list geometric planters and minimalist desk and home decor as steady 3D-printed sellers, and eRank's holiday 2026 guide points at winter-garden themes and pale glacial blues. The placeholder colour is a glacial blue for that reason. None of these sources gave verified sales numbers, so check live demand before listing:
- Search Etsy for "geometric planter 3D printed" and "twisted vase" and look at competitor count, price and reviews.
- Check keyword volume in eRank or similar.

## Listing status
Not published. Nothing has been posted to Etsy or anywhere else, and nothing will be without your permission.
