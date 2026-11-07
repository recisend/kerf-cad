# HexNest Desk Organizer (2026-11-07)

Original design: three interlocking hexagonal cells of different heights (95 / 75 / 55 mm) sharing walls, in a honeycomb cluster. Pen cup, brush holder, remote/tool caddy. It is modelled from scratch in Kerf CAD and does not copy any real product, brand or character.

**Status: draft. Nothing has been published or listed anywhere. Publishing needs your explicit OK.**

## Files
| File | What |
|---|---|
| `hexnest-desk-organizer.3mf` | Print file (millimetres, single watertight part) |
| `hexnest-desk-organizer.kerf.json` | Editable Kerf source |
| `preview.png` | Render for checking or listing mock-ups |

## Why this product (trend basis)
Seller guides and keyword tools (2026) repeatedly list desk organizers and desk accessories among consistent Etsy 3D-print sellers, plus gift-oriented items. November is the start of the gift season. These sources are directional only, from vendor blogs, and no live Etsy search-volume data was reachable. Check Etsy's own search suggestions and Marketplace Insights before committing to a large batch.

## Printer fit: Snapmaker U1, 0.4 mm nozzle
- Footprint 118.4 x 119.9 mm, height 95 mm: fits the 270 mm build volume with a lot of room (about 3 per plate if you want batches).
- Walls 1.6 mm (4 perimeters x 0.4 mm). Shared walls between cells are also 1.6 mm. Cell wall thickness is the same everywhere, so no gap-fill or thin-wall surprises.
- Floor 2.4 mm (12 layers at 0.2 mm).
- No overhangs, bridges or supports: all faces are vertical or flat. Print upright, open end up.
- Solid volume 82.6 cm3, about 100 g of PLA at 1.24 g/cm3 (this is the nearly all-wall part, so infill matters little).

### Suggested slicer settings (Snapmaker Orca)
| Setting | Value |
|---|---|
| Layer height | 0.20 mm (0.16 mm for a finer finish) |
| Wall loops | 4 (a 1.6 mm wall is exactly 4 lines of 0.4 mm) |
| Top / bottom layers | 5 bottom, top not needed (open) |
| Infill | 10-15% gyroid (nearly irrelevant) |
| Supports | Off |
| Seam | Aligned or rear, placed on a hex corner |
| Elephant foot compensation | 0.1-0.15 mm |
| Brim | None needed |

Print time estimate is about 8-10 h at default speeds. This is an estimate, so confirm it in the slicer.

## Colour ideas (sell-ability)
Single-colour sells fine. With the U1's multi-tool setup, one cell per colour is an easy variant, but would need splitting the part.

## Known notes
- The kernel leaves a few sub-0.01 mm edge slivers at the cell corners. They are invisible to a slicer; the mesh is watertight (checked: 0 open edges, volume matches Kerf's 82.6 cm3).
- I did not add a bottom chamfer, to keep the mesh clean. Use the slicer's elephant foot setting instead.

## Draft listing ideas (not published)
Title: Honeycomb Desk Organizer, 3 Hex Pen Cups, Modern Office Gift
Tags: desk organizer, pen holder, office gift, honeycomb, makeup brush holder, desk decor, 3D printed, teacher gift, secret santa gift, home office
