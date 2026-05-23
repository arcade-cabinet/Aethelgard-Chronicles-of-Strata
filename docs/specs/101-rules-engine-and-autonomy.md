# 101 — The Rules Engine, Peon Autonomy & the Three Layers

> **M_ARCH_UNIFY cross-reference (added 2026-05-23).** Pre-dates the
> unified Thing/Skin registry. The 4-layer model — Archetypes → Things
> → Slots → Skins — is the authoritative architectural shape for every
> visual/data fork in the codebase. See:
>
> - `docs/specs/103-particle-archetype.md` — keystone architectural pass
> - `docs/specs/10-architecture.md` — pillar's full M_ARCH_UNIFY block
> - `src/rules/building-profiles.ts` — Thing registry (M_REGISTRY.5)
> - `src/rules/unit-profiles.ts` — Thing registry (M_REGISTRY.1)
> - `src/rules/skins.ts` — Skin slot (M_REGISTRY.3/4/2)
>
> Per-section notes below mark where THIS pillar's text became
> superseded or extended by the unified-registry doctrine.

A design crystallization that reshapes M8.6. Supersedes the "AI player owns the
harvest goal" assumption.

## The litmus test — mechanical vs. player behavior

> *Would this still happen if no one were playing this faction?*

- **Yes → mechanical (Layer 1).** It is the world's behavior — physics. Runs
  for both factions, always, with no commander.
- **No → player behavior (Layer 2).** A *commander* (human or AI) chose it,
  expressed as a `commands.ts` verb.

## Peons are mindless brutes — both sides, never commanded

The decisive call: **peons are fully autonomous on both factions.** A peon has
one instinct — *"a tree / a rock → harvest it → carry it home → repeat."* The
player never micromanages peons; neither does the AI. Same script, two model
skins (player peon vs. enemy peon).

Peon script (faction-agnostic, in `rules/`):

1. Look for the nearest harvestable resource **within this faction's discovered
   zone**. Harvest it, carry the load to the faction's base, deposit, repeat.
2. When the discovered zone is exhausted, **expand radially outward** — walk to
   the discovery frontier, which reveals new fog, until a new resource appears.
3. Peons never respond to tap/command. "They want no part of that nonsense."

Consequences:
- Peon expansion **is** the fog-reveal engine — each faction's zone grows
  organically; the two frontiers creep toward each other (emergent urgency).
- Resource totals visibly climb as peons return loads — the commander *watches*
  the economy and reacts. That watching is the core mobile-friendly loop: low
  micro, high read-and-decide.
- The old "harvest goal" in the AI player **does not exist** — harvesting was
  never a decision.

## The three layers

### Layer 1 — `src/rules/` — the rules engine (full, faction-agnostic)

Pure TypeScript. No yuka, no koota, no three. The single source of game-rule
*knowledge*, consulted by everything:

- **Peon autonomy** — `nextPeonAction(peon, knownZone, board)` → seek / harvest
  / carry / deposit / expand-frontier.
- **Building behavior** — per-tick progress, what a completed building does.
- **Placement** — `canBuild(faction, type, tile, economy, board)` → valid?
- **Economy** — costs, affordability, the **peon cap** (= houses + granary
  capacity), supply.
- **Training** — `canTrain(faction, unitType, economy)`.
- **Combat targeting** — who a military unit engages.

Barrel export `src/rules/index.ts`. Both drivers and the ECS systems import it.

### Layer 2a — ECS systems — mechanical execution

`src/ecs/systems/` *run* Layer 1: the peon system asks
`rules.nextPeonAction(...)` and applies it; the build system advances progress
per `rules`; combat resolves per `rules`. Systems hold no strategy.

### Layer 2b — `commands.ts` + the two drivers — the commander verbs

After peon autonomy moves to Layer 1, the genuine commander decisions narrow to
**three verbs**:

1. **build** — place a structure (Farm / House / Granary / Barracks / defense).
2. **train** — train a military unit (supply- and peon-cap-gated).
3. **move-military** — send a *military* unit (never a peon) to a tile —
   explore or attack.

`commands.ts` is these three verbs, faction-parameterised. Two thin drivers:
- **Human UI** — taps. Build menu, train buttons, tap-to-move a military unit.
- **AI player** — a yuka `Think` brain whose `GoalEvaluator`s score desires
  from the faction's *known* state and call the *same three verbs*. The AI is
  thin: it scores and calls; all "is it legal / where" knowledge is in `rules/`,
  the same `rules/` the human UI uses to grey out an unaffordable button.

## Why this is right

- Human and AI run on one rules engine — AI-vs-AI is a true interface test.
- The AI shrinks to goal-scoring over three verbs — no duplicated game logic.
- Peon autonomy unifies a large AI surface away entirely and gives the mobile
  game its emergent, low-micro economic loop.

## M8.6 re-decomposition

- **M8.6b — `src/rules/` engine**: extract the full faction-agnostic rules
  (peon autonomy, building, placement, economy/peon-cap, training, targeting)
  into `src/rules/` with a barrel API. ECS systems consult it.
- **M8.6c — peon autonomy**: peons run the `rules.nextPeonAction` script on
  both factions — autonomous harvest + radial frontier expansion. No peon
  command path. Peon cap = houses + granary.
- **M8.6d — yuka AI player**: `AiPlayer extends GameEntity` with a yuka `Think`
  brain; `GoalEvaluator`s (build / train / move-military) score from known
  state and call `commands.ts`. Built entirely on `rules/`. Models on
  pond-warfare's `Governor`.

The peon-cap requires House + Granary structure types — added with M8.6c.
