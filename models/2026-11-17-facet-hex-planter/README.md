# Faceted Hex Planter + Saucer (2026-11-17)

Original geometric design (not a replica of any real product, brand or character).
Trend basis: planters/vases and desk-decor are repeatedly listed among top Etsy 3D-print categories
(vendor blog roundups, not hard sales data - treat as a hint, not a guarantee).

## Parts (both in `facet-hex-planter.3mf`, mm)
- Pot: hex taper 68 mm -> 88 mm across corners, 70 mm tall, 2.0 mm walls/floor, 8 mm drain hole. Bbox 76 x 88 x 70.
- Saucer: hex 80 mm across corners, 8 mm tall, 2.0 mm walls/floor. Fits the pot base with ~3 mm clearance.
- Footprint of both on one plate: ~135 x 88 mm - well inside the Snapmaker U1's 270 x 270 x 270 mm volume.

## Snapmaker U1 / 0.4 mm nozzle optimization
- Wall thickness 2.0 mm = 5 x 0.4 mm lines (no thin-wall gap fill artifacts).
- Side taper is ~8 deg from vertical: prints with **no supports**. Both parts sit flat on the plate.
- Floor 2.0 mm = 10 layers at 0.2 mm. Drain hole 8 mm bridges nothing (printed in the floor from the bed).
- Suggested slicer settings (Snapmaker Orca, U1 0.4 profile, textured PEI): 0.2 mm layers, 4-5 walls,
  Arachne wall generator, 10-15% infill, 3 top/bottom layers, no supports, no brim needed. Vase-mode is not used.
- The 3MF holds geometry only (Kerf exports no slicer profile); pick the U1 0.4 mm profile when opening.
- Multi-colour idea for U1: print pot and saucer in different colours (they are separate parts).

## Status
NOT published anywhere. Etsy listing is only to be made after the owner's approval.
