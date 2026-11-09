# Toadstool Pen Cup (2026-11-09)

Original design (no real-world product, brand or licensed character). Cottagecore / mushroom desk decor, one of the niches that blog roundups list as rising for 3D-printed Etsy goods. Those roundups are vendor and SEO content, not hard Etsy sales data, so treat "trending" as directional and check Etsy search and your own shop stats before listing.

## Files
- `mushroom-pen-cup.3mf` is the print file, millimetres, 3 coloured parts (Cap, Spots, Stem).
- `mushroom-pen-cup.kerf.json` is the parametric Kerf source.

## Size
110 x 110 x 88 mm. Cavity is 53.6 mm across, from z=3 to the top. It fits well inside the Snapmaker U1's 270 mm cube build volume.

## Printability for Snapmaker U1, 0.4 mm nozzle
- Prints upright, flat on the bed. No supports needed: the only overhang is the cap underside at exactly 45 degrees, and the dome narrows as it goes up.
- Stem wall is 3.2 mm (8 x 0.4 mm lines). Cap lip is 3 mm tall.
- Spots are separate parts that fill their pockets exactly (volume matches to 0.001 mm3), so there is no overlapping geometry for a multi-colour slicer to fight over.
- Colours: Cap `#C0392B` red, Spots `#FBFBF5` white, Stem `#EFE2C4` cream. These are the 3MF display colours. In the slicer, map each part to a U1 toolhead.
- Suggested start (verify in Snapmaker Orca): 0.2 mm layers, PLA, 3 walls, about 15% infill. The cap is a large solid (about 198 cm3), so sparse infill matters for filament cost.
- Not slicer-tested: this run had no slicer, so check the Snapmaker Orca preview and the filament estimate before listing.

## Not done on purpose
Nothing was published or listed on Etsy.
