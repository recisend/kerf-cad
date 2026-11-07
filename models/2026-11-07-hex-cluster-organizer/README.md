# Hex Cluster Desk Organizer (2026-11-07)

Original, abstract geometric design. It is not modelled on any real product, brand, character or licensed item.

## Files
- `hex-cluster-organizer.3mf` is the print file, in millimetres, with 2 colour parts (body and base).
- `hex-cluster-organizer.kerf.json` is the editable Kerf source. Change the cell sizes in the sketches and re-export.
- `preview-iso.png` and `preview-top.png` are renders.

## Why this design (trend research, 2026-11-07)
- Desk and drawer organizers, plus home-office accessories, are the most consistent 3D-print sellers on Etsy.
- Etsy buyers pay a premium for personalised items. A name or initial plate would be a good listing variant, and Kerf has no text tool, so add that in the slicer.
- Etsy requires original designs, and branded or replica items risk takedowns. This design is fully original.
- Q4 gift season: Etsy's Cyber Sales Event starts mid-November, and peak gift sales run through mid-December.
- Caveat: most trend sources are marketing blogs, so treat the ranking as directional, not audited sales data.

## Snapmaker U1 optimisation (0.4 mm nozzle)
- The footprint is 92 x 84 mm and 95 mm tall, which fits the 270 x 270 x 270 mm bed with room for 2 per plate.
- Every wall is 1.6 mm, which is 4 x the 0.4 mm line width. Cell walls are exact multiples of the extrusion width, so there are no gap-fill artefacts.
- The base plate is 2.4 mm thick, which is 12 layers at 0.2 mm. The colour change lands exactly on a layer boundary.
- All walls are vertical, so it needs no supports and has no overhangs. It prints flat on the base.
- It uses 2 colours (dark body on an amber base) via the U1's toolheads. The base is a separate part. To make it single-colour, assign both parts to the same filament.
- Estimated filament: about 72 g (body about 58 g, base about 14 g).

Suggested slicer profile (Snapmaker Orca):
- Layer height 0.2 mm and first layer 0.2 mm.
- Walls: 4 loops. Top and bottom: 5 layers.
- Infill: 10% (the walls are nearly all perimeter).
- Supports: off. Brim: off, or 3 mm if the bed adhesion is marginal because of the tall, narrow shape.
- Check that the PLA profile matches the filament you use.

## Not published
Nothing is listed or published anywhere. Listing copy still needs your approval.
