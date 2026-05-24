---
title: PRD — Aethelgard v0.4 "Make it FUN"
updated: 2026-05-24
status: current
domain: product
owner: Jon Bogaty
---

# PRD: Aethelgard v0.4 — "Make it FUN"

> "we have the GAME. now we need to make it FUN."
> — user, 2026-05-24

## 1. Context

v0.3.0 shipped a functionally complete game: 6 modes, 6 buildings,
7 unit types, AI, combat, economy, persistence, deployed to
GitHub Pages + signed Android APK. See `docs/MILESTONES.md` for
the historical record.

The game **works**. The game is **not fun**. v0.4 closes that gap.

## 2. Problem statement

Players who load the deployed Pages today see:

- **Repetitive maps.** Every match looks like the last: a hex
  island with a centre-stamped mountain blob, two mirror-symmetric
  bases, deterministic resource scatter.
- **Single-axis combat.** Push military, kill base. No counter
  mechanics, no compositions, no surprises.
- **Static terrain.** Mountains are walls; forests are decoration;
  swamps don't exist; ranged units don't care about elevation.
- **AI without character.** Enemy plays the same script every
  time. Nothing to remember.
- **Modes don't differentiate.** The 6 game modes feel like the
  same game with different timers; no per-mode mechanical
  identity (the user can name them but can't say WHY they're
  different to play).

The game produces matches but not stories. Replay value comes
from generating variety, not from random seeds rolling the same
shape.

## 3. Goals (v0.4)

1. **Per-mode mechanical identity.** Each of the 6 modes plays
   differently because the underlying mechanics differ, not
   because a timer is shorter. Border-clash IS choke-and-funnel;
   frontier-raid IS asymmetric harassment; long-reign IS
   attrition; strata-wars IS layered control; age-of-strata IS
   exploration; coexistence IS sandbox.
2. **Terrain that decides.** Every biome is a meaningful player
   decision: mountain passes (fortifiable choke), swamps (need a
   Healer to cross), forests (line-of-sight blocker), elevation
   (ranged advantage). Choosing where to fight matters more than
   who has more units.
3. **Composition pressure.** Some chokes demand specific unit
   types (Healer to clear swamp disease, Trebuchet to break Wall).
   A 1-unit-type army loses.
4. **AI personalities.** Each enemy is a named opponent with a
   biased strategy (Builder, Raider, Hoarder, Diplomat, Mad King)
   and an exploitable flaw. Players learn the matchup.
5. **Narrative texture.** Matches end with a generated highlight
   reel + an auto-named "story of the match" the player remembers.
6. **Visual coverage.** Every new feature ships with an isolated
   visual harness test the agent reviews before commit.
7. **Config-driven scaling.** Adding a new biome / mapType /
   mode = 1 config row + 1 harness test. No new if/then ladders.

## 4. Non-goals (v0.4)

- Multiplayer / netcode.
- 3+ faction modes.
- Steam release.
- Asset overhaul.

These are v1.0+ topics; v0.4 is single-player polish + texture.

## 5. Success criteria

A player who has finished one match wants to play another because
they want to:

- See what the map gen produces (genuine variety, not seed
  reshuffle)
- Try a different opponent personality
- Try a different mode and feel a different game
- Reach a mechanic they haven't unlocked yet (Wonder paths,
  Sacred Grove discovery, ancient ruins)
- See another generated highlight reel

Operational metrics:

- Default match watched by the agent in chrome-devtools-mcp surfaces
  a screen-readable mechanic decision every 30 sec (build choice,
  composition pivot, choke commitment) instead of long stretches of
  "wait for resources".
- The agent can review the deployed game and articulate the
  HEADLINE mechanic of each of the 6 modes in one sentence.
- A single seed at `?ai-vs-ai=1&seed=X` plays to a deterministic
  finish AND produces a generated story-card.

## 6. Architecture prerequisites

Two structural shifts MUST land before per-mechanic work, or the
mechanic work won't scale. These are M_FUN.ARCH in the directive.

### 6.1 Config-driven biome + mapgen rules (M_FUN.ARCH.CONFIG)

Every per-mode and per-biome generation value moves to
`src/config/mapgen.json`, Zod-validated. Generator reads the
config + iterates rows. Adding a new mapType or biome = 1 config
row, 0 code.

Schema sketch:

```jsonc
{
  "mapTypes": {
    "balanced": {
      "passes": ["beachRing", "mountainMassif", "inlandLake", "isthmusDetect"],
      "mountainIntensity": 0.55,
      "centerBias": 0.3,
      // ...
    }
  },
  "biomes": {
    "MOUNTAIN_PASS": {
      "elevation": 3,
      "walkable": true,
      "buildable": true,
      "moveCost": 1.7,
      "appliesAttribute": "fatigue",
      "attributeStrength": 0.5
    },
    "SWAMP": {
      "elevation": 1,
      "walkable": true,
      "buildable": false,
      "moveCost": 1.8,
      "appliesAttribute": "disease",
      "attributeStrength": 1.0
    }
  }
}
```

### 6.2 Per-feature visual harness (M_FUN.ARCH.HARNESS)

Pattern: `tests/harness/<feature>.browser.test.tsx` mounts the
feature in isolation, screenshots via vitest browser, locks
baseline. EVERY M_FUN.* milestone PR adds at least one harness
test for the feature it ships. The agent reads the PNG before
commit; this is the visual-ownership gate the user has flagged
repeatedly as non-negotiable.

Start: each biome rendered in isolation (one harness per biome).
Then: each HUD pill, each modal, each particle archetype.

## 7. Cycle plan

v0.4 ships as multiple PR-sized milestones. Each ships ONE
headline mechanic + the M_FUN.ARCH foundation work it needs +
the harness test(s) covering it.

### v0.4.1 — Foundation

- M_FUN.ARCH.CONFIG schema + load + migration (existing constants
  → mapgen.json rows).
- M_FUN.ARCH.HARNESS framework + first 9 biome harness tests
  (one per biome including new SWAMP + MOUNTAIN_PASS).

### v0.4.2 — Mountain passes (already partial)

- MOUNTAIN_PASS biome generation (isthmus detection refactored
  to config-driven).
- Fatigue attribute on traversal.
- Wall/Watchtower on MOUNTAIN_PASS reduces fatigue for owning
  faction's units.

### v0.4.3 — Swamps + Healer

- SWAMP biome generation (config-driven, per-mode prevalence).
- Disease attribute + tick.
- Healer unit (50% Wizard cost, 4-hex heal aura, no offensive).
- Composition harness test: 5 Footmen vs swamp = die; 4 Footmen
  + 1 Healer = cross.

### v0.4.4 — Forest ambush + elevation

- FOREST blocks ranged LoS.
- HIGHLAND grants +1 range to ranged units standing on it.
- Defender ambush bonus (+20% dmg when initiating from FOREST).

### v0.4.5 — Per-mode generator strategies

- Each mode gets a named generator strategy in config.
- Border-clash: 1 central choke + 2 flank routes.
- Frontier-raid: 3-4 small chokes + scattered raid resources.
- Long-reign: 2-3 redundant chokes + many peripheral resources.
- Strata-wars: layered chokes around central contested zone.
- Age-of-strata: open early-game, mid-game chokes emerge.
- Coexistence: no chokes, abundant resources.

### v0.4.6 — Named AI personalities

- 5-8 named opponents (Builder, Raider, Hoarder, Diplomat, Mad
  King) — bias parameters in config, not code.
- NewGameModal opponent picker.
- Aria-live taunts on goal change.
- Exploitable flaw per personality.

### v0.4.7 — Match narrative

- Highlight detection on AI-vs-AI transcript (longest engagement,
  biggest comeback, lopsided kill).
- Post-match summary card.
- Procedural match nickname ("The Burning of Eastwall").
- Persistent faction lorebook across saves.

### v0.4.8 — Dynamic terrain

- Wildfire propagation (fire-source destruction ignites FOREST,
  spreads until rain or water adjacency).
- Earthquake event (random pass topology shifts).
- Volcanic eruption (LAVA tiles for 30s, then fertile).

### v0.4.9 — Polish

- Per-biome ambient audio layer swaps.
- Combat-intensity music layer when combat within 8 hex of camera.
- Haptic feedback on Android for combat/build-complete/era.
- Phone pinch-to-zoom-INTO-unit gesture.

## 8. Out of scope for v0.4 (parking lot)

These are v0.5+ topics, kept in the directive under WAIT-DEPS:

- Civilian layer (citizens, refugees, trade routes)
- Mythology mechanics (Aether nodes, ancient ruins, divine
  intervention, Sacred Grove, Living Monuments)
- Diplomacy + reputation system
- Replay loading + spectator skip-to-interesting
- Daily challenge / puzzle scenarios / modifier dial
- Procedural unit names + building inscriptions + map names

## 9. Release definition

v0.4.0 ships when:

- All v0.4.1–v0.4.9 cycles merged.
- Deployed Pages shows the FUN — agent can name + observe each
  per-mode mechanical identity.
- 9 biome harness tests + per-feature harness tests for every
  mechanic shipped.
- 6 named AI opponents selectable.
- Match summary card + nickname render at game-over.
- 665+ unit tests still green.

Then release-please cuts 0.4.0; cd.yml deploys. v0.5 cycle opens.

## 10. Tracking

This PRD is the SPEC. Execution progress is tracked in
`.agent-state/directive.md` under M_FUN.* and M_FUN.ARCH.* item
flips. The directive is the QUEUE, not the spec — when a queue
item closes, the user reads THIS doc to understand what shipped,
not the directive's audit trail.

`docs/MILESTONES.md` is the post-ship archive (v0.3 + earlier).
