---
title: Key art — still-image generation prompts
updated: 2026-05-25
status: current
domain: creative
---

# Key Art Prompt Library

For still-image generators. Each prompt is engine-aware (recommended
ratio, dimensions, prompt-vocab quirks) as of 2026-05-25. Use the
master at the top as the canonical brief; the engine variants are
tuned re-phrasings.

Consistency rules across every key-art prompt:

1. **Palette verbatim** — every prompt repeats the 5 anchor hexes
   (`#090d16 #d4af37 #b45309 #38bdf8 #fef3c7`).
2. **No franchise names** in the prompt (no Civ / CK3 / Old World).
3. **"Aethelgard" wordmark** — only spell it out if the brief calls
   for it; otherwise describe a generic "gold-leaf gothic serif
   wordmark" so the engine doesn't hallucinate the wrong title.
4. **Faceted low-poly** is the silhouette language — say it twice if
   needed; engines drift toward photoreal otherwise.

---

## MASTER PROMPT — hero key art (3:2)

A cinematic key-art still for an AAA strategy game called Aethelgard:
Chronicles of Strata. Faceted hand-modeled low-poly fantasy aesthetic,
painted-tile palette, gold-leaf UI ornaments. A vast hexagonal island
archipelago seen from a low-orbit angle at golden hour: faceted forest
hexes, beach hexes with luminescent sea-blue strata visible beneath
clear water, mountain hexes capped in snow, a stronghold mid-frame
with gold banners snapping in the wind. Foreground tile: a single
peon at work; mid-ground: a column of gold-banner footmen; far
background: crimson enemy banners cresting a ridge. Above the realm,
the **AETHELGARD** wordmark in gold Metamorphous serif with a
4-stop gradient (cream → antique gold → ember → ash), bloom halo,
drop-shadow. Subtitle CHRONICLES OF STRATA in tight letter-spaced
accent-blue caps below. Palette: obsidian indigo `#090d16`, antique
gold `#d4af37`, ember `#b45309`, accent harbour-blue `#38bdf8`,
parchment cream `#fef3c7`. Warm rim + cool fill, volumetric god-rays
through pine peaks, gold leaf catching the sun. No HUD, no overlay
text except the wordmark.

---

## ENGINE VARIANTS

### Midjourney v7 — `--ar 3:2 --s 250 --c 25 --v 7`

```
cinematic key art for a low-poly hex-tile fantasy strategy game called "Aethelgard: Chronicles of Strata", faceted hand-modeled lowpoly aesthetic with painted-tile palette and gold-leaf UI ornaments, vast hex-island archipelago seen low-orbit at golden hour, faceted forest + beach + mountain hexes, luminescent sea-blue strata visible beneath clear water, mid-frame stronghold with gold banners snapping, foreground peon at work, mid-ground column of gold-banner footmen, far-background crimson enemy banners cresting a ridge, above the realm the AETHELGARD wordmark in gold Metamorphous serif with 4-stop cream→gold→ember→ash gradient + bloom halo + drop-shadow, subtitle CHRONICLES OF STRATA in tight accent-blue caps, palette #090d16 / #d4af37 / #b45309 / #38bdf8 / #fef3c7, warm rim + cool fill, volumetric god-rays, no HUD --ar 3:2 --s 250 --c 25 --v 7
```

### SDXL / FLUX.1 dev — 1536×1024

Use clip-guided sampling. Negative prompt is crucial.

```
POSITIVE: cinematic key art, faceted low-poly hex-tile fantasy strategy game "Aethelgard: Chronicles of Strata", aerial low-orbit view of a hex-island archipelago at golden hour, faceted forest beach mountain hexes, luminescent sea-blue strata visible through clear water, gold-bannered stronghold mid-frame, foreground peon, mid-ground footmen column, far ridge crimson enemy banners, AETHELGARD wordmark in gold Metamorphous serif with cream-gold-ember-ash 4-stop gradient and bloom halo, subtitle CHRONICLES OF STRATA in tight accent-blue caps, palette obsidian #090d16 antique gold #d4af37 ember #b45309 harbour-blue #38bdf8 parchment #fef3c7, warm rim and cool fill, volumetric god-rays, painterly faceted geometry, AAA strategy-game cinematic, 1536x1024.

NEGATIVE: photo, photoreal, smooth shading, rounded geometry, modern UI, HUD, overlay text, watermark, text artifacts, blurry, low-resolution, cartoon mascot, anime.
```

### Imagen 3 / Imagen 4 (Google) — square or 16:9

Imagen 4 responds well to *narrative* prompts. Lead with what's
happening, then the look.

```
A cinematic AAA strategy game key art. A hex-tile fantasy realm called Aethelgard is seen from low orbit at golden hour. The land is broken into perfect hexagons — forests, beaches, mountains, each one faceted like hand-carved low-poly geometry. Beneath the clear water of the archipelago, luminescent sea-blue strata are visible. A mid-frame stronghold flies gold banners. A peon works in the foreground; a column of gold-banner footmen march in the mid-ground; crimson enemy banners crest a far ridge. The AETHELGARD wordmark hangs above the realm in gold Metamorphous serif with a four-stop gradient (cream, gold, ember, ash), a bloom halo, and a drop-shadow. Subtitle CHRONICLES OF STRATA in tight letter-spaced accent-blue caps below. Palette: obsidian indigo #090d16, antique gold #d4af37, ember #b45309, harbour-blue #38bdf8, parchment cream #fef3c7. Warm rim with cool fill, volumetric god-rays through pine peaks, painterly faceted geometry. No HUD, no UI overlay, no overlay text except the wordmark.
```

### Adobe Firefly 3 / Recraft v3 — content-aware brand-safe

Use these for marketing copy that must be brand-safe + commercially
clean. They underperform on the cinematic feel but produce
licensable output.

```
[Style: digital illustration, AAA strategy game key art, faceted low-poly fantasy, painterly] Aerial low-orbit view at golden hour of a hex-tile fantasy island archipelago called Aethelgard. Faceted forest, beach, and mountain hexes; luminescent sea-blue strata visible beneath clear shallow water; a stronghold mid-frame with gold banners; a peon in the foreground; a column of gold-banner footmen mid-ground; crimson enemy banners on a far ridge. Above the realm: the AETHELGARD wordmark in gold Metamorphous serif with a cream-to-gold-to-ember-to-ash gradient and a bloom halo; subtitle CHRONICLES OF STRATA in tight accent-blue caps. Palette: #090d16, #d4af37, #b45309, #38bdf8, #fef3c7. Warm rim, cool fill, volumetric god-rays. No HUD, no overlay text except the wordmark.
```

---

## Per-Faction Banner Stills (square 1:1)

Use for individual faction reveal cards on social, OG-image
thumbnails, splash screens. Each prompt yields a banner-and-keep
hero shot.

### Medieval — gold banner

```
cinematic faceted low-poly fantasy key art — a medieval Charter-Realm keep at golden hour, gold banner unfurling on the central spire, faceted stone walls, oath-brazier glowing in the courtyard, footmen marching in formation, hex-tile grass field beneath, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7, warm rim + cool fill, volumetric god-rays --ar 1:1 --s 250 --v 7
```

### Orc — crimson banner

```
cinematic faceted low-poly fantasy key art — an Ember Highlander forge-hold at dusk, crimson banner with crossed-axe sigil, Ember vent glowing through cracked highland stone, raiders sharpening hatchets, faceted mountain backdrop, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7, warm orange rim + violet cool fill, volcanic glow --ar 1:1 --s 250 --v 7
```

### Undead — frost-pale-blue banner

```
cinematic faceted low-poly fantasy key art — a Revenant memorial cairn at twilight, frost-pale-blue banner with broken hour-glass sigil, footmen still in oath-formation (eight centuries late), Glacial-Stratum frost crawling up the walls, faceted glacier hex behind, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7, cool blue rim + obsidian fill --ar 1:1 --s 250 --v 7
```

### Mystic — violet-cream banner

```
cinematic faceted low-poly fantasy key art — a Mystic observatory dome at dawn, violet-on-cream banner with three vertical bars + a high dot sigil, scholars in robes reading a strata-resonance plate at the centre, sanctuary hex glowing softly around the dome, palette #090d16 #d4af37 #b45309 #38bdf8 #fef3c7, soft violet rim + cream fill --ar 1:1 --s 250 --v 7
```
