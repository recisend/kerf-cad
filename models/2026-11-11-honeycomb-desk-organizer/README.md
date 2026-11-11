# Honeycomb Desk Organizer (2026-11-11)

Original design: seven hexagonal cells in a honeycomb cluster at stepped heights (90 / 72 / 54 mm), used as a pen, brush and tool caddy. It is not based on any real product, brand, character or licensed item.

Files:
- `honeycomb-desk-organizer.3mf`: print file (mm, single watertight mesh)
- `honeycomb-desk-organizer.kerf.json`: parametric Kerf source, openable in the web app
- `preview-iso.png`: render

## Snapmaker U1 / 0.4 mm nozzle optimisation

| Item | Value |
|---|---|
| Footprint and height | 113.6 x 109.9 x 90 mm, well inside the 270 mm cube |
| Walls | Interior 1.6 mm (4 x 0.4 mm lines); outer 2.4 mm (6 lines) |
| Floor | 2.0 mm (10 layers at 0.2 mm) |
| Heights | All multiples of 0.2 mm |
| Orientation | Flat base on the bed, open top |
| Supports | None. Every wall is vertical, so there are no overhangs. |
| Mesh check | Every edge is shared by exactly 2 triangles; mesh volume equals Kerf's volume (105.8 cm3) |

Suggested slicer profile (Snapmaker Orca, U1, 0.4 mm nozzle):
- 0.20 mm layer height
- 4 wall loops
- Infill is irrelevant at these wall thicknesses (the part is walls and floor only); 10-15 % is fine
- Supports off, brim optional
- PLA, about 131 g solid (rough estimate; the slicer figure will be a bit lower)

Per-item ideas for listings: swap the three wall heights, or colour the tall and short rings differently on a multi-material U1.

## Notes
- Nothing has been published or listed. Publishing needs your explicit OK.
- Trend claim: the web research could not verify Etsy sales data. Desk organisers and honeycomb or hex-style desk items showed up repeatedly in seller guides, but those are vendor blogs, not sales figures. Check Etsy search and Bestseller badges before listing.
