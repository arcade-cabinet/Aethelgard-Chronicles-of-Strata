---
title: Aethelgard intro video — master prompt + per-engine variants
updated: 2026-05-25
status: current
domain: creative
---

# Intro / Launch Trailer Prompt — Aethelgard: Chronicles of Strata

The master prompt below is engine-agnostic. Each section after is a
re-phrased / re-padded variant tuned for the recommended length, ratio,
duration, and prompt-token sweet spot of a specific generator as of
2026-05-25. Paste the variant matching your target engine; the master
serves as the canonical creative brief for editorial alignment.

When iterating, lock the **seed** + the **camera schedule** before
tweaking the lighting or palette — those two drive the strongest
shot-to-shot continuity across re-rolls.

---

## MASTER PROMPT (~1480 characters, engine-agnostic)

A cinematic 16-second intro trailer for **Aethelgard: Chronicles of Strata**, a low-poly hex-tile fantasy RTS. Style: AAA strategy-game cinematic — Civilization VI opening, Crusader Kings III intro, Old World establishing sequence. AESTHETIC: faceted hand-modeled lowpoly geometry, painted-tile palette, gold-leaf accents on UI ornaments, deep obsidian sky with starlight motes drifting. PALETTE: obsidian indigo `#090d16` base, antique gold `#d4af37` highlights, ember orange `#b45309` warmth, accent harbour-blue `#38bdf8` magic glow, parchment cream `#fef3c7` for highlights.

ACT I (0-4s): wide aerial dolly over a vast hexagonal island archipelago at dawn, sea-blue strata visible beneath crystal-clear water, fog wisps drifting through forested hex peaks; the camera glides past a snow-tipped massif. Hex tiles are clearly faceted — beach hex, forest hex, mountain hex — each distinct.

ACT II (4-10s): camera descends to ground level near a player's stronghold; gold-banner footmen marching in formation, peons chopping wood, a watchtower's torch flickering at sunset; soft particle embers float up. A distant horn sounds. Enemy crimson banners crest the ridge. Camera arcs around the keep; the strata under the land begin to GLOW with golden runes.

ACT III (10-16s): wide reveal — the entire realm flares with rune-light from below as the **AETHELGARD** wordmark rises in golden Metamorphous serif, four-stop gradient (cream → antique gold → ember → ash), backdrop-blurred bloom, drop-shadow halo. Subtitle "CHRONICLES OF STRATA" in tight letter-spaced accent-blue caps below the wordmark. Final beat: a single banner unfurling, fade to obsidian, gold ember sparks lingering.

MOTION: slow cinematographic dollies and orbits — never handheld jitter. Lighting: warm rim with cool fill, volumetric god-rays through fog. No HUD. No text overlays except the final wordmark. 24fps cinematic feel, slight shutter motion blur on camera moves, none on figures.

---

## ENGINE VARIANTS

### Sora 2 (OpenAI) — 16s clip @ 16:9

**Recommended:** 16s / 1080p / 16:9 / dense single-paragraph prompt, motion verbs explicit. Use Sora's `--seed <N>` to lock the camera path for re-rolls. Max prompt length ~1500 chars works well.

```
Cinematic 16-second AAA strategy-game intro trailer for "Aethelgard: Chronicles of Strata", a low-poly hex-tile fantasy RTS. Aesthetic: faceted low-poly geometry, painted-tile palette, gold-leaf UI ornaments. Palette: obsidian indigo #090d16, antique gold #d4af37, ember #b45309, accent harbour-blue #38bdf8, parchment #fef3c7. SHOT 1 (0-4s): aerial dolly over a hex-island archipelago at dawn, faceted forest+beach+mountain hexes, sea strata visible through clear water, fog through pine peaks, smooth camera glide. SHOT 2 (4-10s): descend to a stronghold at sunset — gold-banner footmen marching, peons chopping wood, torchlit watchtower, ember particles rising, distant horn, crimson enemy banners cresting ridge, camera orbits the keep, golden runes ignite beneath the land. SHOT 3 (10-16s): wide reveal as runes flare; AETHELGARD wordmark rises in gold Metamorphous serif with 4-stop gradient (cream-gold-ember-ash) and bloom halo, subtitle CHRONICLES OF STRATA in accent-blue tight caps below, banner unfurls, fade to obsidian with lingering gold sparks. Motion: slow cinematographic dollies and orbits, no handheld jitter, 24fps cinematic shutter, warm rim + cool fill, volumetric god-rays. No HUD, no overlay text except the final wordmark.
```

### Veo 3 / Gemini (Google) — 8s × 2 chained clips @ 16:9

**Recommended:** 8s per clip / 1080p / 16:9 / narrative-arc prompt with per-second beats. Chain two clips back-to-back for a 16s total; Veo handles continuity if you reuse the same character/location nouns.

```
Clip A (8s, 16:9, 1080p) — Aerial cinematic over a low-poly fantasy hex-tile archipelago at dawn. 0-2s: high wide shot, faceted forest hexes + beach hexes + visible sea strata. 2-5s: smooth dolly past a snow-tipped massif, fog wisps drift between pine peaks. 5-8s: camera descends toward a stronghold with gold banners, footmen marching in formation, peons chopping wood, torchlit watchtower flickering, ember particles rising. Palette: obsidian #090d16, antique gold #d4af37, ember #b45309, harbour-blue #38bdf8. AAA strategy-game cinematic, Civilization VI feel, 24fps shutter, warm rim + cool fill, volumetric god-rays. No HUD, no overlay text.

Clip B (8s, 16:9, 1080p) — Continuing from the stronghold descent. 0-3s: distant horn sounds; crimson enemy banners crest a far ridge; camera orbits the keep. 3-6s: golden runes ignite beneath the land — the strata flare bright. 6-8s: wide reveal — AETHELGARD wordmark rises in gold Metamorphous serif, 4-stop gradient (cream → gold → ember → ash), bloom halo, drop-shadow; subtitle CHRONICLES OF STRATA in tight letter-spaced accent-blue caps below; a single banner unfurls; fade to obsidian with lingering gold sparks. Same palette, motion, and lighting as Clip A.
```

### Kling 2.x (Kuaishou) — 10s @ 16:9 with cinematographic camera schedule

**Recommended:** 10s / 1080p / 16:9 / cinematographic camera-move syntax (Kling responds strongly to explicit camera language). Add `--cw 0.5` for high motion intensity.

```
[10s, 16:9, 1080p, cinematic 24fps] Low-poly hex-tile fantasy strategy game intro trailer "Aethelgard". Camera schedule: SHOT 1 (0-3s) aerial DOLLY-IN over a hex-island archipelago at dawn, faceted forest+beach+mountain hexes, sea strata under clear water, fog through pine peaks. SHOT 2 (3-6s) ARC LEFT around a torchlit stronghold at sunset, gold-banner footmen marching, peons chopping wood, ember particles rising, horn echoes, crimson enemy banners cresting a far ridge. SHOT 3 (6-10s) CRANE UP + PULL OUT to a wide reveal as golden runes ignite beneath the land, AETHELGARD wordmark rises in gold Metamorphous serif with cream-gold-ember-ash gradient + bloom halo, CHRONICLES OF STRATA subtitle in tight accent-blue caps, banner unfurls, fade to obsidian with gold sparks. Palette: obsidian #090d16, antique gold #d4af37, ember #b45309, harbour-blue #38bdf8, parchment #fef3c7. Warm rim + cool fill, volumetric god-rays. No HUD, no overlay text except the wordmark.
```

### Seedance 1.0 Pro (ByteDance) — 10s @ 16:9 with character-consistency

**Recommended:** 10s / 1080p / 16:9 / start-frame keyframe + dense scene prompt + character-token reuse for continuity.

```
[10s, 16:9, 1080p, cinematic AAA strategy-game intro] Title: AETHELGARD: CHRONICLES OF STRATA. Style: faceted low-poly hex-tile fantasy, painted-tile palette, gold-leaf UI accents. Palette: #090d16 obsidian, #d4af37 antique gold, #b45309 ember, #38bdf8 harbour-blue, #fef3c7 parchment. 0-3s aerial dolly over a hex-island archipelago at dawn — faceted forest, beach, mountain hexes; sea strata visible through clear water; fog through pine peaks. 3-7s descent to a torchlit stronghold at sunset — gold-banner footmen (recurring character token: GOLD_KING) march in formation, peons chop wood, watchtower torch flickers, ember particles rise; crimson banners (RED_HOST) crest a far ridge; camera orbits the keep. 7-10s wide reveal — golden runes flare beneath the land; AETHELGARD wordmark rises in gold Metamorphous serif with 4-stop cream-gold-ember-ash gradient + bloom halo; subtitle CHRONICLES OF STRATA in tight accent-blue caps below; single banner unfurls; fade to obsidian with lingering gold sparks. 24fps cinematic shutter, warm rim + cool fill, volumetric god-rays, no HUD or overlay text.
```

### Runway Gen-4 — 10s @ 16:9 with sequential-scene chaining

**Recommended:** 10s per clip / 1080p / 16:9 / Use Gen-4's image-to-video with a reference still keyframe of the stronghold for shot 2 consistency.

```
[Runway Gen-4 — 10s, 16:9, 1080p, AAA strategy-game cinematic] Aethelgard intro: low-poly hex-tile fantasy RTS launch trailer. 0-3s aerial dolly over a hex-island archipelago at dawn, faceted forest+beach+mountain hexes, sea strata visible, fog through pine peaks. 3-7s descend to a torchlit gold-banner stronghold at sunset, footmen marching, peons chopping wood, ember particles, distant horn, crimson enemy banners cresting a far ridge, camera orbits keep. 7-10s golden runes ignite beneath the land; AETHELGARD wordmark rises in gold Metamorphous serif with cream-gold-ember-ash gradient + bloom; CHRONICLES OF STRATA subtitle in tight accent-blue caps; banner unfurls; fade to obsidian with gold sparks. Palette: #090d16/#d4af37/#b45309/#38bdf8/#fef3c7. Warm rim + cool fill, volumetric god-rays, slow cinematographic camera moves, 24fps cinematic shutter, no HUD or overlay text.
```

### Pika 2.x — 12s @ 16:9 with text + reference-image fusion

**Recommended:** 12s / 1080p / 16:9 / ingredient mode (text + reference image of TitleScreen wordmark). Set `--motion 3` for active camera, `--ar 16:9`.

```
[Pika 2 — 12s, 16:9, 1080p, --motion 3] Cinematic AAA strategy-game intro for "Aethelgard: Chronicles of Strata", low-poly hex-tile fantasy RTS. Beats: aerial dolly over a hex-island archipelago at dawn (faceted forest+beach+mountain hexes, sea strata, fog wisps) → descend to a torchlit gold-banner stronghold at sunset (footmen marching, peons chopping wood, ember particles, distant horn, crimson enemy banners cresting ridge, camera orbits) → golden runes flare beneath the land → AETHELGARD wordmark rises in gold Metamorphous serif with cream-gold-ember-ash gradient + bloom halo → CHRONICLES OF STRATA subtitle in accent-blue caps → banner unfurl → fade to obsidian with gold sparks. Palette: #090d16/#d4af37/#b45309/#38bdf8/#fef3c7. Warm rim + cool fill, volumetric god-rays, 24fps cinematic shutter, no HUD or overlay text. (Attach ref image: Aethelgard TitleScreen wordmark for ingredient fusion.)
```

### Luma Dream Machine (Ray2) — 10s @ 16:9 photoreal-leaning

**Recommended:** 10s / 1080p / 16:9 / photoreal-friendly prompt with explicit lighting + atmospheric depth cues.

```
[Luma Ray2 — 10s, 16:9, 1080p, cinematic] Low-poly hex-tile fantasy RTS launch trailer "Aethelgard: Chronicles of Strata". SHOT 1 (0-3s): aerial dolly over a hex-island archipelago at dawn, faceted forest/beach/mountain hexes, sea strata visible through clear shallow water, atmospheric haze with volumetric god-rays through pine peaks, warm sunrise rim light. SHOT 2 (3-7s): descend to a torchlit gold-banner stronghold at sunset, gold-banner footmen marching in formation, peons chopping wood, watchtower torch flickering, ember particles rising in convective updrafts, distant horn, crimson enemy banners cresting a far ridge, camera orbits the keep, warm rim + cool fill. SHOT 3 (7-10s): golden runes ignite beneath the land, AETHELGARD wordmark rises in gold Metamorphous serif with cream→gold→ember→ash 4-stop gradient + bloom halo + drop-shadow, CHRONICLES OF STRATA subtitle in tight letter-spaced accent-blue caps, single banner unfurls, fade to obsidian with lingering gold sparks. Palette: obsidian #090d16, antique gold #d4af37, ember #b45309, harbour-blue #38bdf8, parchment #fef3c7. 24fps cinematic shutter, no HUD or overlay text.
```

### Hailuo 02 (MiniMax) — 10s @ 16:9 with explicit camera moves

**Recommended:** 10s / 1080p / 16:9 / each scene tagged with an explicit camera verb (DOLLY, ARC, CRANE, ZOOM, PAN). Hailuo's camera adherence is unusually strong.

```
[Hailuo 02 — 10s, 16:9, 1080p] AAA cinematic intro for "Aethelgard: Chronicles of Strata", low-poly hex-tile fantasy RTS. SHOT 1 (0-3s) DOLLY IN over hex-island archipelago at dawn — faceted forest/beach/mountain hexes, sea strata, fog wisps. SHOT 2 (3-7s) ARC LEFT around torchlit gold-banner stronghold at sunset — footmen march, peons chop wood, ember particles rise, distant horn, crimson enemy banners crest far ridge. SHOT 3 (7-10s) CRANE UP + PULL OUT — golden runes ignite beneath the land, AETHELGARD wordmark rises in gold Metamorphous serif with cream→gold→ember→ash gradient + bloom, CHRONICLES OF STRATA subtitle in accent-blue caps, banner unfurl, fade to obsidian with gold sparks. Palette: #090d16/#d4af37/#b45309/#38bdf8/#fef3c7. Warm rim + cool fill, volumetric god-rays, 24fps cinematic shutter, no HUD or overlay text.
```

### Vidu Q1 — 8s @ 16:9 with start+end frame conditioning

**Recommended:** 8s / 1080p / 16:9 / pass start frame (aerial archipelago) + end frame (wordmark reveal) for guaranteed beat alignment.

```
[Vidu Q1 — 8s, 16:9, 1080p, start+end keyframe] Cinematic intro trailer for "Aethelgard: Chronicles of Strata". Start frame: aerial wide shot of a hex-island archipelago at dawn, faceted forest+beach+mountain hexes, sea strata, fog wisps. End frame: AETHELGARD wordmark in gold Metamorphous serif with cream→gold→ember→ash gradient + bloom halo over an obsidian background with lingering gold sparks. Camera arc through the middle: descend to a torchlit gold-banner stronghold at sunset (footmen marching, peons chopping wood, ember particles, distant horn, crimson banners crest a ridge, camera orbits the keep, golden runes ignite beneath the land). Palette: #090d16/#d4af37/#b45309/#38bdf8/#fef3c7. Warm rim + cool fill, volumetric god-rays, 24fps cinematic shutter, no HUD or overlay text.
```

---

## Vertical / short-form (9:16) supplement

For TikTok / Reels / Shorts cuts, re-render the same beats in `9:16` and trim Act II to 4s — the wordmark reveal should land by 12s for max scroll-stop value. Replace the final beat with a tight zoom on the wordmark + a single ember-particle pulse so the loop feels punchy on autoplay-without-sound.

---

## Continuity notes (apply to every engine)

1. **Lock the seed** before tweaking the prompt. Sora/Veo/Kling/Seedance all let you fix the seed; re-rolls that change palette + cadence are almost always seed-drift.
2. **Don't ask for HUD or overlay text** — every engine hallucinates faux-game UI badly. Wordmark only.
3. **Specify 24fps cinematic shutter** explicitly — defaults vary (Veo sometimes ships 30fps; Kling 24fps; Sora 24fps; Hailuo 30fps). The shutter is what makes camera moves feel filmic.
4. **Palette must be repeated verbatim** in every paragraph the engine reads sequentially — engines weight earlier tokens more, but a re-mention at the wordmark beat catches drift.
5. **Avoid named real-world franchises** in the prompt itself ("Civilization VI" / "Crusader Kings III") — they pull in IP-trained motifs. Use them in editorial briefs only.
