---
title: Social-clip prompts — vertical short-form gameplay video
updated: 2026-05-25
status: current
domain: creative
---

# Social-Clip Prompt Library

Vertical 9:16 short-form clip prompts for TikTok / Reels / Shorts.
Recommended duration ranges by platform:

| Platform | Sweet spot | Engine choices |
|---|---|---|
| TikTok | 9–15s | Sora 2 9:16, Kling 2 10s vertical, Hailuo 02 10s vertical |
| Reels  | 6–15s | Veo 3 8s × 2 chained, Sora 2 9:16, Pika 2 8s |
| Shorts | 6–10s | Veo 3 8s, Kling 2 10s, Luma Ray2 9:16 |

Across every platform, **the wordmark or hook beat must land in the
first 3 seconds** — scroll-stop margin is tight. The intro-video
master prompt (`docs/prompts/intro-video.md`) saves the wordmark for
the end; the social variants invert that.

All prompts assume vertical 9:16, 1080×1920. Engine-specific
recommended durations are at the top of each variant.

---

## CLIP A — "Realm reveal hook" (9–10s)

**Beat:** wordmark hits at 0–2s; cinematic dolly across the realm
in the middle; faction-banner crash close-out.

```
[9:16 vertical, 9-10s, AAA strategy-game social clip — Sora 2 / Kling 2 / Hailuo 02]
0-2s: tight close-up of the AETHELGARD wordmark in gold Metamorphous serif, 4-stop cream→gold→ember→ash gradient + bloom halo + drop-shadow, against an obsidian background. Subtitle CHRONICLES OF STRATA in tight letter-spaced accent-blue caps below. Slow pull-back reveals the wordmark is etched into stone above a stronghold gate.
2-6s: continuous pull-back through the stronghold gate and out into a faceted low-poly hex-tile fantasy realm at golden hour — faceted forest, beach, and mountain hexes; luminescent sea-blue strata visible through clear shallow water; gold-banner footmen on the wall.
6-9s: smash cut to a wide aerial pan over a crimson-banner enemy column cresting a far ridge, horns blaring; final freeze on the rivalry.
Palette: obsidian #090d16, antique gold #d4af37, ember #b45309, harbour-blue #38bdf8, parchment #fef3c7. Warm rim + cool fill, volumetric god-rays, 24fps cinematic shutter. No HUD or overlay text except the wordmark beat.
```

## CLIP B — "Strata ignite" (6–8s)

**Beat:** zoom into a single hex; the strata below it light up; the
realm scales out around it; "WHICH STRATA WILL YOU WAKE?" hook.

```
[9:16 vertical, 6-8s — Veo 3 / Sora 2 / Pika 2]
0-2s: extreme close-up of a single faceted grass hex. The land beneath shimmers; we see golden runes ignite under the tile, one stratum at a time, deep to shallow — frost-blue Glacial, verdant green, ember orange, mythic violet.
2-4s: zoom out — the lit hex is one of hundreds across a faceted hex-island archipelago at dawn. The runes glow through the water around the islands.
4-7s: tight on a Chronicler-Kings hand placing a gold banner on the lit hex; cut to wide of a gold-bannered keep against the ember dawn.
7-8s: title card — "WHICH STRATA WILL YOU WAKE?" in gold Metamorphous serif on obsidian, AETHELGARD wordmark below in cream-gold-ember-ash gradient.
Palette: #090d16 #d4af37 #b45309 #38bdf8 #fef3c7. Cool rim + warm fill, 24fps cinematic shutter. No HUD.
```

## CLIP C — "Faction reveal montage" (12s)

**Beat:** four 3-second beats, one per archetype, end on shared
crest. Used for the campaign / new-faction announcement.

```
[9:16 vertical, 12s — Sora 2 / Kling 2 vertical]
0-3s MEDIEVAL: a gold-bannered Charter-Realm keep at golden hour, footmen marching in formation through the gate; gold-on-obsidian "THE CHARTER REALMS" caption flashes briefly.
3-6s ORC: an Ember Highlander forge-hold at dusk, crimson banner with crossed-axe sigil unfurling, raiders sharpening hatchets; "THE EMBER HIGHLANDERS" caption.
6-9s UNDEAD: a Revenant memorial cairn at twilight, frost-pale-blue banner with broken hour-glass sigil, footmen still in oath-formation; "REVENANTS OF THE GLACIAL HALT" caption.
9-12s MYSTIC: a Mystic observatory dome at dawn, violet-cream banner with three-bar-and-dot sigil, scholars at the strata-resonance plate; "SCHOLARS OF THE MYTHIC STRATUM" caption. Final frame: AETHELGARD wordmark over a four-quadrant montage of all four banners.
Palette: #090d16 #d4af37 #b45309 #38bdf8 #fef3c7. Each beat uses the faction's accent colour as the dominant rim light. 24fps cinematic shutter. No HUD.
```

## CLIP D — "MYTH event hook" (6s)

**Beat:** the screen darkens, then explodes with one MYTH event,
ending on the chronicler's voice quote.

```
[9:16 vertical, 6s — Veo 3 / Kling 2 — burst-motion friendly]
0-1s: tight on a faceted hex-tile realm at midday; everything calm.
1-3s: the sky dims (solar-eclipse) — every watchtower's vision halves, gold banners darken. OR (variant) a meteor (Mythic-Stratum debris) plummets and impacts a far tile in a violet shockwave. Pick ONE event for the clip.
3-5s: aftermath — torches flare, peons run, gold and crimson banners draw closer to the impact / shadow.
5-6s: Chronicler's-voice quote on obsidian: "THE 7TH DAY OF THE YEAR WAS GIVEN TO THE GLACIAL." AETHELGARD wordmark below.
Palette: #090d16 #d4af37 #b45309 #38bdf8 #fef3c7. Cool wash during the event, warm recovery rim. 24fps cinematic shutter. No HUD.
```

## CLIP E — "Wonder reveal" (8s)

**Beat:** the realm graduates. A Wonder unlocks. Aspirational.

```
[9:16 vertical, 8s — Sora 2 / Veo 3 / Luma Ray2]
0-2s: a faceted low-poly realm at twilight; a single keep glowing warm gold, peons converging on the central tile.
2-5s: time-lapse — a Wonder rises stone-by-stone (medieval cathedral-keep), every stratum beneath flares in turn, runes igniting up the spire. (Variant: orc forge-vent | undead reseal-cairn | mystic codex-dome.)
5-7s: the Wonder's summit cracks open and emits a mythic-violet pulse outward; the realm pauses to watch.
7-8s: title card on obsidian — "REMEMBER THIS." AETHELGARD wordmark in cream-gold-ember-ash gradient.
Palette: #090d16 #d4af37 #b45309 #38bdf8 #fef3c7 + mythic violet #a855f7 at the pulse beat. Volumetric god-rays at the cracked summit. 24fps cinematic shutter. No HUD.
```

---

## Caption / hook templates (paste with the clip)

- **Drop hook:** "Forge your realm. Wake the strata. _Aethelgard_ — coming to Android & iOS."
- **Mystery hook:** "Beneath every hex, eleven strata. Which one will answer you?"
- **Faction reveal hook:** "Four archetypes. One realm to rule. _Aethelgard: Chronicles of Strata_."
- **MYTH event hook:** "The strata speak. The chronicler records. _Aethelgard_."
- **Wonder hook:** "Build something the strata will remember. _Aethelgard_."

## Cross-engine continuity notes

The intro-video doc's 5 cross-engine notes (seed lock / no-HUD / 24fps
shutter / palette re-mention / no franchise names) apply to social
clips too. **Add a sixth for social:** the **first frame must contain
the wordmark or hero composition** — autoplay-without-sound previews
on mobile feeds judge scroll-stop in 200ms.
