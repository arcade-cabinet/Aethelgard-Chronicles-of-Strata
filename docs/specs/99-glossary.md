---
title: Glossary
updated: 2026-05-22
status: current
domain: technical
---

# 99 — Glossary

The canonical term list for Aethelgard. When a spec or test names a concept,
this is what it means.

## Game concepts

- **Faction** — `'player' | 'enemy'`. The two sides of every match; the
  architecture is faction-symmetric (spec 100).
- **Faction Base** — the home anchor of a faction (Palace for the
  player, the graveyard for the enemy). Tracked by the `FactionBase` ECS
  trait; losing it ends the match (`evaluateWinLoss`).
- **Zone of Control** — the *territory* a faction holds. The set of tiles
  it controls, claimed by peon exploitation, drawn as an encirclement
  border (spec 102). Independent of the **Observed Battlefield**.
- **Observed Battlefield** — the tiles a faction currently sees through
  unit vision cones + base circles. Recomputed every tick.
- **Encroachment** — an enemy military unit on a controlled tile. The
  tile pulses for `N` seconds (difficulty-scaled); if undefended, it
  flips to the encroacher.
- **Attractor / Offensive / Defensive / Mover / Consumer** — the five
  composable archetype traits (spec 102). Every building / unit / resource
  is one or more of these.
- **Peon** — a faction's autonomous worker. Mindless and nonviolent (spec
  101): it harvests the nearest resource in its zone and never accepts
  commands. Exploiting a tile claims it for its faction.
- **Military Unit** — Footman / Goblin / Orc / Vampire / Witch / Black
  Knight. Has the `Military` semantic role (peons are excluded).
- **Commander Verb** — one of the three actions a human OR AI player can
  issue through `commands.ts`: **build**, **train** (M9 forward), or
  **move-military**. The single action channel (spec 100).
- **Crossing** — a placed traversal over a one-level cliff (spec 99).
  Connectivity-first, biome-styled (rockfall, stone stairs, grassy hill,
  plank ramp, etc).

## Architecture terms

- **`src/rules/`** — the faction-agnostic rules engine. No yuka, no koota,
  no three. Both the human-UI driver and the AI player consult it.
- **`src/ai/`** — the yuka-backed AI subpackage. `AiPlayer` extends
  `GameEntity`, owns an `AiBrain` (Think) with `GoalEvaluator`s for the
  commander verbs.
- **Magnetic Field** — the bi-signed force model (spec 102) that drives
  placement snapping, pathfinding cost, and AI targeting from one
  underlying field summed from all archetype emitters.
- **Damage Type × Armor** — the cause-and-effect table (spec 102):
  Offender declares `damageType` (`normal`|`siege`|`magic`|`pierce`);
  Defender declares `armorVs[damageType]`. Damage = `base * armor`.

## Stack terms

- **koota** — the ECS library (`src/ecs/`). The single source of truth for
  simulation state. r3f reads from it.
- **yuka** — the AI library (`src/ai/`). Provides `GameEntity` / `Think` /
  `GoalEvaluator` / `Goal` / steering.
- **r3f / drei** — react-three-fiber + drei. `<Canvas>` mounted under the
  gameplay shell; hooks may only be called inside it.
- **Capacitor** — wraps the web build into the Android APK. `pnpm cap:sync`
  after `capacitor.config.ts` or `android/` change.

## File / path terms

- **logical asset id** — a stable string like `structures.palace`. Code
  resolves it via `assets.url(...)`, never raw paths.
- **`.agent-state/`** — the per-repo working memory the agent uses
  (directive, decisions, digest, cursor).
- **`references/`** — git-ignored source bundle (Kenney/KayKit kits, audio
  packs, etc). Curated via `pnpm assets:ingest` into `public/assets/`.
