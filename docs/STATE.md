---
title: Current State
updated: 2026-05-22
status: current
domain: context
---

# Current State

Snapshot of what is **done**, what is **next**, and active plans. The
authoritative running queue is `.agent-state/directive.md`; this file is the
human-readable summary.

## Done

- **M0–M5** — foundation, hex board, characters, economy, combat, RTS systems.
- **M6 — Polish & Ship** — branded HUD, audio, save/load (SQLite + Preferences),
  viewport, mountains, ramps, two-PRNG (map + event), per-difficulty scaling.
- **M7 — yuka AI subpackage + asset expansion** — `src/ai/` (steering),
  Castle/Town buildings, graveyard enemy base, monster variety (Vampire / Witch
  / Black Knight), audio + decoration expansion.
- **M8 — AI-as-Player + Zone of Control** (all sub-items shipped):
  - M8.0 contextual crossings (spec 99)
  - M8.1 faction-base model (`FactionBase`, `EnemySpawner`)
  - M8.2 render decomposition (`HomeBase` / `EnemyBase` / `structure-models`)
  - M8.3 faction-aware command API
  - M8.4z + M8.5z zone-of-control replaces fog (spec 102)
  - M8.6a symmetric per-faction economy
  - M8.6b `src/rules/` engine
  - M8.6c peon autonomy + 4 new building types (House, Granary, Watchtower,
    Wall)
  - M8.6d yuka Think-brain AI player
  - M8.6e behavior-archetype local ZoC + encroachment + attractor map-gen
  - M8.7 AI-vs-AI golden-path E2E
- **M9.1a/b/c** — build menu / zone legend / first-run onboarding overlay.

## Next (in `.agent-state/directive.md`)

- **M8.6f** — behavior-system polish (event-PRNG arrow volleys, multi-target,
  siege-responsive defenders, projectile animation).
- **M8.6g** — full archetype-algebra unification: add MoverBehavior +
  ConsumerBehavior, the magnetic force-field (`rules/force-field.ts`),
  damage-type × armor table, unify units onto the same archetype traits.
- **M9.1d** — docs completeness (this file + `10-player-journey.md` +
  `99-glossary.md` — all created).
- **M9.2** — visual + audio polish (dedicated GLBs for the new buildings
  from the KayKit Ultimate Fantasy RTS pack; zone-border tuning; new audio
  cues).
- **M9.3** — full test pyramid (e2e player-journey suite, locked visual
  baselines).
- **M9.4** — mobile/Capacitor APK + release hygiene + squash-merge.
- **M9.5** — RELEASE.

## Architecture spec arc

The design crystallised across specs 99–102:

| Spec | Concept |
|---|---|
| 96 | Two-PRNG model (map + event) |
| 97 | yuka AI subpackage + M7 asset expansion |
| 98 | Viewport + config |
| 99 | Contextual crossings (passability + slopes) |
| 100 | AI-as-Player (five pillars: faction symmetry, command-API channel, perception, yuka, AI-vs-AI E2E) |
| 101 | Rules engine + peon autonomy + three-layer model |
| **102** | **Zone of Control + magnetic emitters + archetype composition algebra** — the unified theory: 5 archetype traits (Attractor / Offensive / Defensive / Mover / Consumer), bi-signed magnetic force field, pairwise composition table, damage-type × armor matrix. Units and buildings share the same archetype universe. |

## Branch

`feat/aethelgard-initial-release` — PR #1, open. Status flips to `RELEASED`
after M9.5 squash-merges to main and the deploy completes.
