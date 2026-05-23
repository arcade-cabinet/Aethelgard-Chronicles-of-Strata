---
title: Brain Archetype (M_REGISTRY.18)
updated: 2026-05-23
status: draft
domain: technical
---

# 105 — Brain Archetype: unifying the AI layer

Spec for the architectural pass that collapses the 6 sibling AI files
(`ai-director.ts`, `ai-player.ts`, `perception.ts`, `steering.ts`,
`vehicle-factory.ts`, `ecs/systems/ai.ts` — 847 LOC) into ONE
`BrainArchetype` slot consumed by ONE per-tick AI system.

Builds on spec 104 (M_ARCH_UNIFY): the AI layer is the LAST hidden
parallel hierarchy — every other Thing has a Profile slot now; the
brain is the gap.

## Step 1 — use-case enumeration

Before designing the slot, enumerate every brain shape we have today
+ every shape we know we'll need:

| # | Brain | What it decides | Cadence | Inputs |
|---|-------|----------------|---------|--------|
| 1 | AiPlayer (yuka GoalEvaluator) | Build / train / military / resign | per-second | economy + game state |
| 2 | ai-director (per-unit target picker) | Which enemy unit to attack | per-tick | unit position + enemies in range |
| 3 | perception (vision + threat sense) | Visible tile set + threat queue | per-tick | unit position + cone |
| 4 | steering (yuka Vehicle integration) | Move vector per unit | per-tick | unit path + obstacles |
| 5 | vehicle-factory (yuka init) | yuka Vehicle handle per koota entity | on spawn | unit role |
| 6 | ecs/systems/ai (per-tick driver) | Glue: query units → set targets | per-tick | full world |

The 6 are NOT redundant — they're 4 distinct concerns:

- **Strategic decision** (1 — AiPlayer): what to build, when to attack
- **Tactical decision** (2 — ai-director per-unit targeting): who to shoot
- **Perception** (3): what does the unit know?
- **Locomotion** (4, 5): how does the unit move?

The "6 files" surface count overstates the work. The right shape is
ONE `BrainArchetype` interface with FOUR slot kinds:

```ts
interface BrainArchetype {
  strategic?: StrategicBrain;   // per-faction global planner (AiPlayer)
  tactical?: TacticalBrain;     // per-unit target picker
  perception?: PerceptionBrain; // per-unit visibility + threat sense
  locomotion?: LocomotionBrain; // per-unit move resolver
}
```

Per the meta-rule: don't pre-design step N. **Step 2 of this
implementation should ship ONE brain slot at a time**, starting with
the highest-value one.

## Step 2 — first slice (LocomotionBrain only)

Locomotion is the slot with the clearest contract:
- input: unit's current position + Movement trait + PathQueue trait
- output: updated Transform (per-frame position)

Every unit needs it; the yuka Vehicle wrapping is identical per role.
Lift `steering.ts` + `vehicle-factory.ts` into a `LocomotionBrain`
that UNIT_PROFILES can carry, then collapse the per-tick driver.

After step 2 ships, step 3 takes PerceptionBrain (vision cone is
per-unit and currently lives across perception.ts + zone.ts), then
TacticalBrain (the per-unit target picker), then StrategicBrain (the
per-faction AiPlayer wrapper).

Each step is its own commit with its own architectural pass +
reviewer trio. The 847-LOC collapse happens incrementally, not in
one big-bang rewrite.

## Future steps (out of scope for M_REGISTRY.18 now)

- Per-Skin brain overrides — a Necromancer might have a different
  tactical bias (prefer-ranged over prefer-melee). Drops onto
  `SKINS[faction].brain` overrides as the slot data realises.
- BrainArchetype.composeTraits — once the 4 slots exist, the
  Vehicle/Goal/Evaluator instantiation collapses into one factory
  driven by the slot tuple.

## Operational note

This spec doc is the M_REGISTRY.18 deliverable for the directive's
"queue is gated" condition. The implementation steps are 4 distinct
work-units (LocomotionBrain → PerceptionBrain → TacticalBrain →
StrategicBrain) each with its own ticket. The directive ticket
M_REGISTRY.18 closes when this spec lands; the implementation work
re-opens under per-slot tickets (M_REGISTRY.18a/b/c/d) when the
respective slice begins.
