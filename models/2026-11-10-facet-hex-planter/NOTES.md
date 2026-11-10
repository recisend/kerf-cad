# Facet Hex Planter + Saucer (2026-11-10)

Original, generic design (no real-world brands, characters or products). **Not published** — listing is up to you.

## Why this design
Home/desk decor (planters, organizers) is a consistently recurring Etsy 3D-print category in 2026 seller guides, and gifting demand rises in Q4. Caveat: the sources are seller/vendor blogs, not Etsy's own sales data, so treat "trending" as directional. Verify with eRank/Marmalead before listing.

## Geometry
- Planter: hexagonal, flared 80 mm tall, 80 mm base (vertex-to-vertex) -> 100 mm rim. 2.0 mm walls (5 x 0.4 mm lines), 2.4 mm floor (12 layers @ 0.2 mm), 8 mm centre drain hole. Solid volume 50.9 cm3 (about 63 g in PLA at 100%; the CAD mass figure uses an aluminum placeholder and should be ignored).
- Saucer: 112 mm tray, 10 mm tall, 2 mm floor/wall, sits beside the planter on the same plate.
- Fits Snapmaker U1 (270 x 270 x 270 mm) in one plate: footprint ~97 x 171 mm, no supports needed (max wall lean ~7 deg from vertical).

## Snapmaker U1 / 0.4 mm nozzle slicing suggestions (Orca / Snapmaker Orca)
- Layer 0.20 mm (0.16 for smoother facets), line width 0.42, 3 walls min, top/bottom 4-5 layers.
- Supports: off. Brim: not needed (large flat footprint). Orient as exported (flat bottom).
- Wall thickness 2.0 mm = 4-5 perimeters; planter is effectively solid walls — infill barely matters.
- Colours: parts are named/coloured (Planter sage green, Saucer sand) so each can be assigned a U1 toolhead filament.
- Printed walls are not guaranteed watertight: for wet use print in PETG, or advise buyers to use a nursery liner pot for live plants.

## Files
- `facet-hex-planter.3mf` — export (mm, 2 parts)
- `facet-hex-planter.kerf.json` — editable parametric source
- `preview.png`
