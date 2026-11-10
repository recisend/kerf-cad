# Frost Snowflake Ornament

Original design (no real-world product, brand, character or logo). Built in Kerf CAD; source in `frost-snowflake-ornament.kerf.json`.

**Print file:** `frost-snowflake-ornament.3mf` (2 parts, millimetres, Z-up, flat on the bed)

| Part | Colour | Size | Volume |
|---|---|---|---|
| Snowflake Body | ice white `#e8f1fa` | 76.7 x 95.5 x 3.0 mm | 6.36 cm3 (~7.9 g PLA) |
| Accent Disc | gold `#d4a62a` | 12 x 12 x 1.0 mm, sits on the hub at Z 3-4 | 0.11 cm3 (~0.14 g) |

Both meshes were checked: watertight, consistently oriented, positive volume, no degenerate triangles.

## Snapmaker U1 / 0.4 mm nozzle optimisation
- Fits the 270 x 270 x 270 mm bed with huge margin; about 6 pieces fit per plate (3 x 2 grid with ~10 mm gaps) for batch selling. Verify the bed size against your machine's spec.
- Prints flat, **no supports, no brim needed**; every overhang is zero (pure 2.5D extrusion).
- Smallest feature is 3.6 mm (branches) / 4.0 mm (arms) = 9+ perimeters of a 0.4 mm line; ring wall 2.5 mm. Nothing thinner than 3 perimeters.
- Thickness 3.0 mm = 15 layers at 0.2 mm; accent disc 1.0 mm = 5 layers at 0.2 mm.
- All edges are straight lines or 90 degree tips (no tiny arcs that slice badly).
- Multi-colour: the accent disc is a separate part, so assign it to a second U1 toolhead (single colour change at layer 16; minimal purge).

Suggested slicer profile: 0.4 mm nozzle, 0.20 mm layer, 3 walls, 100% top/bottom (part is only 3 mm), 15-20% infill (effectively solid), PLA ~220 C / bed 60 C.
Print time estimate: about 35-45 min per piece.

## Hanging
5 mm hole in the loop at the top of the +Y arm; fits thin ribbon or twine.

## Trend rationale (research on 2026-11-10)
- Christmas is the biggest 3D-print gifting window and it is mid-November now, so listings need to be live now.
- Sources agree on: originality (Etsy requires your own design for 3D printed items), personalization, and giftable/holiday items.
- Caveat: most trend data comes from seller-tool blogs, not Etsy's own data. Check Etsy search autocomplete / eRank before pricing.
- Personalization idea for a v2 listing: a custom name tag variant (needs a text feature, not available in Kerf yet).

## Draft Etsy listing (NOT published)
Title: Geometric Snowflake Christmas Ornament, 3D Printed Modern Tree Decoration, Minimalist Winter Holiday Gift, Gold Accent
Tags: snowflake ornament, 3d printed ornament, christmas tree decor, modern ornament, minimalist christmas, geometric decor, winter gift, stocking stuffer, holiday decoration, hostess gift
Price idea: 6-9 USD each, set of 3 for 16 USD, set of 6 for 28 USD.
