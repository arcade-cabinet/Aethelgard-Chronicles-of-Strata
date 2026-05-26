---
title: Biome thumbnail prompts — per-tile hex art
updated: 2026-05-25
status: current
domain: creative
---

# Biome Thumbnail Prompts

Square 1:1 image prompts (target 512×512 or 1024×1024) for the 13
in-game biomes. Use for:

- DiscoveriesPanel / NewGameModal MapPreview supplementary cards
- Steam store assets, Itch.io thumbnails, social-share OG images
- Wiki / docs imagery to accompany the biome lore in `docs/lore/biomes.md`

**Style anchor across all 13 prompts:** faceted hand-modeled low-poly
hex-tile, painted-tile palette, single hex centered with adjacent
hex edges visible at the corners, low-orbit 3/4 view, soft ambient
occlusion at the seams.

**Palette repeated verbatim every prompt:** `#090d16` obsidian,
`#d4af37` antique gold, `#b45309` ember, `#38bdf8` harbour-blue,
`#fef3c7` parchment. Per-biome accent colour is called out per row.

**Engine target:** Midjourney v7 `--ar 1:1 --s 200 --v 7` works well
for all 13. SDXL / FLUX produce passable variants with the negative
prompt `photo, photoreal, smooth shading, rounded geometry, modern
UI, text, watermark`.

---

## GRASS (verdant green accent)

```
faceted low-poly hex-tile, single verdant grass hex centered at 3/4 low-orbit view, adjacent hex edges visible at corners, soft ambient occlusion at seams, painterly painted-tile palette, scattered low-poly grass tufts + a single wildflower cluster, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + verdant accent #4ade80, warm afternoon rim, no HUD --ar 1:1 --s 200 --v 7
```

## FOREST (deep verdant)

```
faceted low-poly hex-tile, single forested hex centered, taller pine + oak clusters in faceted geometry, single bioluminescent moth in flight near the canopy, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + deep verdant #166534, dappled sun through canopy, no HUD --ar 1:1 --s 200 --v 7
```

## HIGHLAND (Verdant–Ember seam, warm green-stone)

```
faceted low-poly hex-tile, single highland hex centered, faceted green grass over warm bronze-stone ledges, a sharp contour where the treeline fails, a single Ember vein visible in the exposed stone, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + sage #84cc16 + warm bronze #92400e, late-afternoon rim, no HUD --ar 1:1 --s 200 --v 7
```

## MOUNTAIN (Ember-breached cone)

```
faceted low-poly hex-tile, single mountain hex centered, snow-tipped faceted cone with bare Ember veins glowing through cracks, watchtower silhouette at the foot of the peak, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + cold stone #94a3b8 + ember glow #ea580c, cool blue cast on snow, no HUD --ar 1:1 --s 200 --v 7
```

## MOUNTAIN_PASS (surveyed cut between two cones)

```
faceted low-poly hex-tile, single mountain-pass hex centered, two faceted peaks flanking a surveyed cut through the stone, a charter-marked stone obelisk at the pass entrance, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + stone #94a3b8 + gold leaf #d4af37 on the obelisk, dawn rim, no HUD --ar 1:1 --s 200 --v 7
```

## BEACH (Glacial fringe + luminescent sea)

```
faceted low-poly hex-tile, single beach hex centered, pale warm sand band against luminescent shallow harbour-blue water, faint Glacial sea-strata visible through the water at the edge, a single washed-up charter scroll, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + warm sand #fbbf24, gentle morning light, no HUD --ar 1:1 --s 200 --v 7
```

## OCEAN (luminescent sea)

```
faceted low-poly hex-tile, single ocean hex centered, faceted harbour-blue water surface with internal Glacial-Stratum glow refracting upward from below the sea floor, single bioluminescent ripple at the centre, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7, twilight overhead, no HUD --ar 1:1 --s 200 --v 7
```

## DESERT (Glacial pulling heat upward)

```
faceted low-poly hex-tile, single desert hex centered, ochre-and-rust faceted sand dunes with heat-shimmer haze rising from the surface, faint cold-blue under-tone at the base where the Glacial Stratum pulls heat upward, single sun-bleached bone in the foreground, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + ochre #c2410c, harsh noon light, no HUD --ar 1:1 --s 200 --v 7
```

## SWAMP (Verdant decay + Glacial chill)

```
faceted low-poly hex-tile, single swamp hex centered, faceted murky water with faceted cypress stumps and bioluminescent marsh-lights drifting above, faint Mythic-Stratum violet bleed at the centre, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + bog green #166534 + marsh violet #a855f7, low fog, no HUD --ar 1:1 --s 200 --v 7
```

## RUINS (forgotten Wonder, Mythic memory)

```
faceted low-poly hex-tile, single ruins hex centered, faceted collapsed Wonder masonry with gold-leaf charter inscriptions still legible on a tilted column, soft Mythic-Stratum violet glow seeping from cracks, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + violet #a855f7 + faded gold #b45309, melancholy overcast, no HUD --ar 1:1 --s 200 --v 7
```

## VOLCANO (live Ember vent)

```
faceted low-poly hex-tile, single volcano hex centered, faceted cone with a glowing Ember-orange caldera, low smoke wisps, faceted lava channels descending the cone, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + lava #ea580c + ash #57534e, dusk with orange under-light, no HUD --ar 1:1 --s 200 --v 7
```

## LAVA (mid-eruption tile)

```
faceted low-poly hex-tile, single lava-flooded hex centered, faceted molten Ember-orange surface with darker cooling crust patches, embers rising in convective updrafts, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + lava #ea580c + crust #44403c, intense bottom-up glow, no HUD --ar 1:1 --s 200 --v 7
```

## QUICKSAND (Glacial slump trap)

```
faceted low-poly hex-tile, single quicksand hex centered, faceted warm ochre sand with a subtle concave depression in the centre, fine flowing-particle texture, a single half-buried bronze helm in the depression, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + ochre #c2410c + warm sand #fbbf24, harsh afternoon light, no HUD --ar 1:1 --s 200 --v 7
```
