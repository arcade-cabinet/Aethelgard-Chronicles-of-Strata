# M2 — Characters

**Proves:** Real animated KayKit characters move on the hex board. The shared-rig
retargeting approach is verified on evidence before any production character work.
The character factory and ECS unit archetypes are functional.

**M2 is complete when all contracts below are checked and CI is green.**

Detailed test files are written as the first act of M2 (milestone-TDD batch).

## Contracts

- [ ] **Rig compatibility verified — joint names match** [`tests/unit/rig-verify.test.ts`]
  - Load `characters/knight.glb` and `characters/rig-medium-anims.glb` in a headless
    Three.js context.
  - Assert that the joint/bone names in the mesh skeleton match those in the animation
    GLB's skeleton.
  - If this test fails, a rig-mismatch decision must be recorded in `.agent-state/`
    and the retargeting approach revised before any other M2 work proceeds.
  - Ref: `60-characters.md §Shared-Rig Retargeting`.

- [ ] **Character factory creates correct ECS archetype** [`tests/unit/character-factory.test.ts`]
  - `createCharacter({ role: "Peon", ... })` creates an entity with all required
    Peon components: Transform, HexPosition, Unit, Faction, Health(50), Movement,
    PathQueue, Harvester, Carrier, AnimationState, Selectable.
  - `createCharacter({ role: "Footman", ... })` creates Footman archetype with
    Combatant(15dmg).
  - `createCharacter({ role: "Goblin", faction: "enemy", ... })` creates Goblin
    archetype without Selectable.
  - Ref: `50-ecs-model.md §Entity Archetypes`, `60-characters.md §Character Factory`.

- [ ] **AnimationState drives clip crossfade** [`tests/browser/animation-state.test.ts`]
  - Knight entity: set AnimationState to IDLE → confirm "Idle" clip playing.
  - Set to MOVING → confirm "Walking" clip crossfades in within 0.2s.
  - Set to ATTACKING → confirm "Attack" clip plays.
  - Ref: `60-characters.md §AnimationState → Clip Mapping`.

- [ ] **Character renders at correct hex world position** [`tests/browser/character-position.test.ts`]
  - Create a Peon at `{ q: 2, r: -1 }`.
  - Assert the Peon's Three.js object position matches `axialToWorld(2, -1)` XZ,
    and Y matches `level * TILE_HEIGHT`.
  - Ref: `60-characters.md §Character Rendering`, `40-hex-world.md §Hex Math`.

- [ ] **Movement system moves character along path** [`tests/unit/movement-system.test.ts`]
  - Create a Footman with a PathQueue of 3 steps.
  - Run `pathFollowSystem` + `movementSystem` for N frames.
  - Assert the entity's HexPosition matches the final path step after sufficient frames.
  - Ref: `50-ecs-model.md §System Catalog and Run Order`.

- [ ] **Health billboard appears on damaged unit** [`tests/visual/health-billboard.spec.ts`]
  - Playwright: reduce a unit's Health to 50%. Assert a health bar element is visible
    above the unit in the rendered scene.
  - Ref: `70-rts-systems.md §Health billboard`.

- [ ] **Character visible on board in e2e** [`tests/visual/character-on-board.spec.ts`]
  - Playwright screenshot after game start shows at least one character mesh visible
    on the hex board (not T-posed, not clipping through terrain).
  - Compare against reference screenshot `tests/visual/refs/character-on-board.png`.
  - Ref: `60-characters.md §Character Rendering`.

- [ ] **Selection ring renders when unit is selected** [`tests/browser/selection.test.ts`]
  - Click a character entity (simulate selection).
  - Assert `Selectable.isSelected = true` on the entity.
  - Assert a selection ring mesh is visible beneath the character in the scene.
  - Ref: `60-characters.md §Character Rendering`.
