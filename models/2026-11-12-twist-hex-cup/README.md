# Twist Hex Cup — 2026-11-12

Original parametric design (no real-world product, brand, character or licensed item). A hexagonal cup whose cross-section twists 60° over its height, so the top and bottom hexagons line up and the sides read as a spiral. Use as a pen / brush / makeup-brush cup, dried-flower vase, or desk organizer.

## Files

| File | What |
|---|---|
| `twist-hex-cup.3mf` | Print file (3MF, millimetres) |
| `twist-hex-cup.kerf.json` | Editable Kerf CAD source (open with the web app's **Open**) |
| `preview.png` | Render for listing photos (replace with real photos of a printed unit) |

## Geometry (checked on the exported 3MF)

- Size: 80.7 × 82.6 × 96 mm, fits the Snapmaker U1's 270 × 270 × 270 mm bed with room to spare
- Volume 53.1 cm³, about 66 g of PLA solid-wall
- Wall and floor: 2.0 mm (`wall` variable in the Kerf file)
- Worst overhang: about 15° from vertical, so no supports
- Flat 80 mm hexagonal base for bed adhesion
- Mesh volume matches the CAD volume (53,113.6 mm³). The export contains 4 zero-area triangles on the top rim. They add no geometry, and I left them in because removing them opens T-junctions.

## Snapmaker U1 print profile (0.4 mm nozzle)

| Setting | Value |
|---|---|
| Slicer | Snapmaker Orca (or OrcaSlicer with the U1 profile) |
| Nozzle | 0.4 mm |
| Layer height | 0.20 mm (0.16 mm for a smoother twist) |
| Line width | 0.42 mm |
| Walls | 5 (about 2.1 mm, fills the 2.0 mm wall with no gaps) |
| Bottom layers | 10 (2.0 mm) |
| Top layers | not applicable, the top is open |
| Infill | 0–5% (the walls are solid) |
| Supports | Off |
| Brim | Off; add a 3 mm brim if your bed adhesion is marginal |
| Orientation | As exported, base on the bed |
| Material | PLA. Silk or matte PLA shows the twist best. Single colour. |
| Seam | Aligned or back, placed in a corner |

Estimated print time is about 4–6 hours. That is an estimate and not from a slicer run. Slice it once and update this line.

## Draft Etsy listing (NOT published, needs your approval)

**Title:** Twisted Hexagon Pen Holder, Geometric Desk Organizer, Modern Vase, 3D Printed Home Office Decor, Gift for Her / Him

**Tags (13):** geometric pen holder, desk organizer, 3d printed vase, twisted vase, hexagon decor, makeup brush holder, home office decor, modern desk decor, dried flower vase, minimalist decor, gift for coworker, 3d printed decor, desk accessory

**Description:**
A twisted hexagon cup, 3D printed in PLA. It holds pens, pencils, makeup brushes or a few dried stems. 80 mm wide, 96 mm tall, 2 mm walls. Printed layer by layer, so you can see fine layer lines in the twist. Not waterproof, so use a liner for fresh flowers. Colour options: pick at checkout.

**Pricing idea:** US$18–24. Material cost is about US$1.50, so the margin is mostly your print time. Check current prices on similar Etsy listings before you set it.

## Why this design (and what is not proven)

- Sources I found: geometric, parametric and twisted-vase decor, plus desk and office organizers, come up repeatedly as consistent Etsy 3D-print categories.
- November and December are the seasonal peak for 3D-printed gifts and decor.
- Most of those sources are seller blogs and printer-maker marketing, not sales data. One keyword tool put generic "desk organizer" listings as very crowded. I could not get Etsy sales figures, so nothing here guarantees sales. The listing title and tags aim at niche phrases to avoid the generic competition.
- Before listing, check live Etsy search results and eRank/Marmalead for the tags above.
