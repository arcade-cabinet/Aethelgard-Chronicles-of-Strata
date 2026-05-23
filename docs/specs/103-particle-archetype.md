---
title: Particle Archetype (M_REGISTRY.6)
updated: 2026-05-23
status: draft
domain: technical
---

# Particle Archetype — the 8th archetype slot

Spec for the unified particle system that supersedes the 7 sibling FX
components (RainParticles, SawdustFX, BuildCompleteFX, VictoryConfetti,
CombatText, ResourceText, TrackingRings, FootstepEmitter). Builds on
spec 102 (Zone of Control composition algebra) — `ParticleArchetype` is
the 8th archetype slot in the M_ARCH_UNIFY stack, peer of OffensiveBehavior /
DefensiveBehavior / AttractorBehavior / Movable / Animated / Costable /
HasHP / AccretesProps.

Per the user's framing: **"snow, sawdust, rain, all that shit are all
particles … particles are another archetype slot — biome-localized,
unit-localized particle archetype effects with assigned scatter."**

---

## Step 1 — use-case enumeration (8 emitters, 4 distinct shapes)

Before designing one ParticleArchetype to cover all 8, enumerate the
shape of each. Different shapes warrant different mechanics; collapsing
them prematurely is exactly the "you skipped step 1" failure mode.

| # | Emitter | Location | Trigger | Lifetime | Geometry | Drift |
|---|---------|----------|---------|----------|----------|-------|
| 1 | RainParticles | Biome-wide | Weather state = rain | Continuous while raining | Point cloud (line segments) | Gravity + wind |
| 2 | SawdustFX | Per build-site entity | Per-frame while building | Continuous bursts | Point cloud (sprites) | Gravity + radial spread |
| 3 | BuildCompleteFX | Per build-site entity | Building completion event | One-shot, 1–2s | Point cloud (sprites) | Radial burst + decay |
| 4 | VictoryConfetti | Full-screen | Victory state entered | One-shot, 5–10s | Point cloud (sprites) | Gravity + spin + drift |
| 5 | CombatText | Per damage event | Hit landed | One-shot, 1s | Text label | Vertical float + fade |
| 6 | ResourceText | Per harvest event | Resource gained | One-shot, 1s | Text label | Vertical float + fade |
| 7 | TrackingRings | Per selected entity | Selection state = true | Continuous while selected | Ring mesh | Pulse + rotate |
| 8 | FootstepEmitter | Per unit entity | Per-step animation event | Periodic | Sprite (point) | Static, fade |

**The shapes group into 4 archetypes**, not 1:

- **Particle.GeometryCloud** — 1, 2, 3, 4 — point-cloud rendered as
  `<points>`, drift function controls each particle, lifetime + spawn
  rate set per archetype.
- **Particle.FloatingText** — 5, 6 — DOM/HTML `<div>` over Three.js
  scene, lifetime + float vector set per archetype.
- **Particle.MeshOverlay** — 7 — Three.js mesh attached to entity world
  position, animated by uniform-time shader or react-three-fiber
  per-frame mutation.
- **Particle.Decal** — 8 — fade-only sprite at fixed world position;
  no motion.

Forcing all 8 into one `<points>` cloud breaks CombatText (text needs
DOM for crisp typography), TrackingRings (needs proper geometry for
shader effect), FootstepEmitter (needs decal positioning at exact step
locations).

## Step 2 — first slice (geometry-cloud archetype only)

Per the meta-rule "only build what step 1 needs; let work surface step
2": M_REGISTRY.6 ships the **geometry-cloud archetype** first, covering
4 of 8 emitters (Rain, Sawdust, BuildComplete, VictoryConfetti). The
remaining 4 (CombatText, ResourceText, TrackingRings, FootstepEmitter)
keep their existing components until subsequent slices add
FloatingText, MeshOverlay, and Decal archetypes.

### GeometryCloud schema

```ts
interface GeometryCloudArchetype {
  /** How many particles emit per second when active. */
  emitRate: number;
  /** Max simultaneous particles in the system. */
  maxParticles: number;
  /** Per-particle lifetime in seconds. */
  lifetime: number;
  /** Initial velocity vector + spread (radians). */
  initialVelocity: { speed: number; spread: number; direction: [number, number, number] };
  /** Acceleration applied each tick (gravity + wind). */
  acceleration: [number, number, number];
  /** Particle visual — points (small, fast) or sprites (larger, textured). */
  geometry: { kind: 'points'; size: number; color: string } | { kind: 'sprite'; textureId: string; size: number };
  /** Trigger shape — what causes the emitter to be active. */
  trigger:
    | { kind: 'biome-weather'; weatherState: 'rain' | 'fog' | 'sunny' }
    | { kind: 'entity-trait'; traitName: 'Building'; activeWhen: 'incomplete' }
    | { kind: 'entity-event'; eventName: 'building-complete'; pulseDurationMs: number }
    | { kind: 'game-state'; stateName: 'victory'; pulseDurationMs: number };
  /** Source — where the emitter origin lives. */
  source:
    | { kind: 'world-wide'; bounds: 'board-aabb' }
    | { kind: 'entity-position' }
    | { kind: 'screen-overlay' };
}
```

### Two-pass rendering

- **Gen-time pass (none for particles)** — particles are runtime-only.
  Unlike AccretesProps (props placed during board gen) particles emit
  during play.
- **Runtime pass — `ParticleSystem`** — a single r3f component that
  iterates every active `ParticleArchetype` and renders ONE
  `<points>` per archetype (instanced buffer geometry). The system is
  driven by:
  1. The biome layer (RainParticles equivalent — board-wide trigger).
  2. The ECS query layer (Sawdust/BuildComplete — entity-trait or
     event triggers).
  3. The game-state layer (VictoryConfetti — game.outcome === 'win'
     trigger).

### Concrete archetype registry (Step 2 scope)

`src/rules/particle-archetypes.ts`:

```ts
export const PARTICLE_ARCHETYPES = {
  rain: { /* GeometryCloud, biome-weather=rain, world-wide */ },
  sawdust: { /* GeometryCloud, entity-trait=Building.incomplete, entity-position */ },
  buildComplete: { /* GeometryCloud, entity-event=building-complete, entity-position */ },
  victoryConfetti: { /* GeometryCloud, game-state=victory, screen-overlay */ },
};
```

The 4 sibling components delete; `<ParticleSystem game={game} />`
replaces all 4 mount sites in `GameCanvas.tsx`. Determinism is
preserved by routing all per-particle random draws through
`createMapPrng(seedPhrase + ':' + archetypeName)` (same fix as the
M_QUALITY sawdust/confetti commit).

## Future steps (not in scope for M_REGISTRY.6 this commit)

- **Step 3 — FloatingText archetype** (CombatText + ResourceText).
  HTML overlay component reading damage/harvest events from a queue.
- **Step 4 — MeshOverlay archetype** (TrackingRings). Per-entity mesh
  attached via r3f ref, shader-time-driven.
- **Step 5 — Decal archetype** (FootstepEmitter). Sprite-on-ground
  with timed fade.
- **Step N — per-Skin particle override.** Different tribes get
  different particle colors / sprites (necropolis emits ash-grey
  sawdust, etc.). Drops in as `SKINS[faction].particleOverrides` —
  ONE Skin row, no archetype code change.

Each future step gets its own commit with its own architectural pass.
Do not pre-design FloatingText / MeshOverlay / Decal as part of this
slice; the GeometryCloud implementation should NOT bake their concerns
into its schema.
