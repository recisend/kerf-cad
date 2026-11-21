# Twist Hex Planter — print notes

Original design (not based on any real product or brand). Twisted hexagonal succulent/desk planter, 87 x 87 x 90 mm, 2.4 mm walls (6 perimeters at 0.4 mm), 8 mm drain hole.

## Why this design (trend research, 2026-11-21)
Etsy best-seller pages and 2026 maker guides consistently rank geometric planters/vases, desk organizers and articulated fidget toys as top 3D-printed categories. Third-party sales figures are SEO estimates, not verified Etsy data, so no sales promise is made. Sources:
- https://www.etsy.com/market/3d_printed_home_decor_best_selling
- https://3dsearch.net/blog/best-selling-3d-printed-items-etsy-2026
- https://hyper3d.ai/blog/best-selling-3d-printed-items

## Snapmaker U1 settings (0.4 mm nozzle)
- Build volume 270 x 270 x 270 mm (plan for ~265): part is 87 x 87 x 90, so 6+ fit on one plate. Source: https://www.snapmaker.com/en/snapmaker-u1/specs
- Slicer: Snapmaker Orca, U1 0.4 mm nozzle preset, 0.20 mm layer height
- PLA, no supports (max overhang ~30 deg from vertical), no brim needed (72 mm hex footprint)
- 3 to 6 walls, 10% infill (irrelevant: walls are the part), 2 to 3 bottom layers
- Optional: "spiral vase" mode will NOT work (it has a floor with a hole) — print normally
- Tip: single-color silk PLA, or use the U1's 4 toolheads for a color gradient by layer height

## Files
- twist-hex-planter.3mf — print file (mm, 1 body, 2109 triangles)
- twist-hex-planter.kerf.json — editable Kerf source
- preview.png / preview-bottom.png

## Etsy listing draft (NOT published — needs owner approval)
Title: Twisted Hexagon Planter, Modern Geometric Succulent Pot, 3D Printed Desk Plant Holder
Tags: geometric planter, succulent pot, desk decor, modern planter, 3d printed, plant lover gift, twisted vase, minimalist decor, cactus pot, office decor
