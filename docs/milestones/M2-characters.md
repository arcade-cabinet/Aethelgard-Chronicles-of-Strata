# M2 — Characters

**Proves:** Real animated KayKit characters move on the hex board. The shared-rig
retargeting approach is verified on evidence before any production character work.
The character factory and ECS unit archetypes are functional.

**Status: COMPLETE.** The six in-scope contracts are satisfied; two contracts
(health billboard, selection ring) were re-scoped to later milestones — see the
note below.

## Contracts

- [x] **Rig compatibility verified — joint names match**
  - Verified with `gltf-transform` against the real `references/` GLBs (the
    M0/M1 toolchain replaced the planned headless-Three approach — `gltf-transform`
    is already a dependency and reads skeletons directly).
  - Result: `Knight`, `Mage`, and both `Rig_Medium` animation libraries share an
    identical 23-bone skeleton (byte-identical bone-name set; only joint array
    order differs). Decision recorded in `60-characters.md §Rig verification`:
    bind clips by bone name. The design §10 rig risk is closed.
  - Ref: `60-characters.md §Shared-Rig Retargeting`.

- [x] **Character factory creates correct ECS archetype**
  [`src/entities/__tests__/character-factory.test.ts`]
  - `createCharacter` builds the archetype trait set (Transform, HexPosition,
    Unit, Faction, Movement, PathQueue, AnimationState, Selectable) with
    role-appropriate stats and faction. Health, Harvester, Carrier, and Combatant
    join the archetype in the milestones that introduce those systems (M3
    economy, M4 combat) — adding them now would be dead components no system
    reads.
  - Ref: `50-ecs-model.md §Entity Archetypes`, `60-characters.md §Character Factory`.

- [x] **AnimationState drives clip crossfade**
  [`src/ecs/systems/__tests__/animation.test.ts`, `tests/browser/animated-character.browser.test.tsx`]
  - `animationSystem` maps Movement → AnimationState (IDLE ↔ MOVING); each state
    maps to its KayKit clip. `AnimatedCharacter` crossfades clips via drei
    `useAnimations` with a 0.25s fade. The browser test confirms a KayKit GLB
    loads and a skinned mesh mounts and animates.
  - Ref: `60-characters.md §AnimationState → Clip Mapping`.

- [x] **Character renders at correct hex world position**
  [`src/entities/__tests__/character-factory.test.ts`]
  - `createCharacter` places `Transform` at `axialToWorld(q, r)` XZ and
    `level * TILE_HEIGHT` Y — asserted by the factory tests.
  - Ref: `60-characters.md §Character Rendering`, `40-hex-world.md §Hex Math`.

- [x] **Movement system moves character along path**
  [`src/ecs/systems/__tests__/path-follow.test.ts`]
  - `pathFollowSystem` walks an entity along its `PathQueue`, including
    cross-elevation (ramp) steps — pinned by the M1 review's added ramp test.
  - Ref: `50-ecs-model.md §System Catalog and Run Order`.

- [x] **Character visible on board** [verified visually]
  - The KayKit Engineer renders fully textured on the board in a correct rest
    pose (shared-rig `Idle_A` binding, no T-pose, no terrain clipping) — confirmed
    by a zoomed dev-server screenshot, no console errors.
  - Ref: `60-characters.md §Character Rendering`.

### Re-scoped contracts (moved, with reason)

- **Health billboard → M4 (combat).** A health bar is meaningful only once units
  take damage; `Health` and damage are M4's `combatSystem`. Building the billboard
  in M2 would mean a `Health` trait no system reads and a billboard nothing
  changes. Moved to `M4-combat.md`.
- **Selection ring → M3 (economy).** The selection ring is HUD feedback for the
  command loop; unit selection becomes meaningful when there are multiple units
  and orders (M3's peon economy). Moved to `M3-economy.md`. The `Selectable`
  trait already exists on every character so M3 only adds the ring renderer.
