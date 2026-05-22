# Characters

## KayKit Roster

All characters come from the KayKit Dungeon Pack / Characters pack, licensed CC BY 4.0.
Attribution required — see `30-asset-pipeline.md`.

### Player Heroes (selectable units)

| Role | GLB file | Rig | Notes |
|---|---|---|---|
| Knight | `characters/knight.glb` | Rig_Medium | Default frontline fighter |
| Mage | `characters/mage.glb` | Rig_Medium | Ranged caster (M5) |
| Barbarian | `characters/barbarian.glb` | Rig_Medium | High damage melee |
| Rogue | `characters/rogue.glb` | Rig_Medium | Fast, low health |
| Ranger | `characters/ranger.glb` | Rig_Medium | Ranged physical |
| Druid | `characters/druid.glb` | Rig_Medium | Healer support (M5) |
| Engineer | `characters/engineer.glb` | Rig_Medium | Builder specialist |
| Paladin | `characters/paladin.glb` | Rig_Medium | Tank with aura |

For M2-M3: Knight is the primary implemented hero. Others are loaded but not assigned
combat roles until M4-M5.

### Peon

The peon uses the `characters/peon.glb` (Rig_Medium). It is the player's primary
worker unit — it harvests resources and constructs buildings.

### Enemies

| Role | GLB file | Rig | Notes |
|---|---|---|---|
| Goblin | `characters/goblin.glb` | Rig_Medium | Basic enemy, spawns from portal |
| Orc | `characters/orc.glb` | Rig_Large | Heavy enemy, slow but powerful |
| Werewolf | `characters/werewolf.glb` | Rig_Large | Fast heavy enemy (M5 raid) |
| Frost Golem | `characters/frost-golem.glb` | Rig_Large | Boss-tier enemy |
| Skeleton | `characters/skeleton.glb` | Rig_Medium | Undead variant |
| Zombie | `characters/zombie.glb` | Rig_Medium | Undead variant |
| Witch | `characters/witch.glb` | Rig_Medium | Caster enemy (M5) |

## Shared-Rig Retargeting

KayKit provides four animation source GLBs (two per rig tier):
- `characters/rig-medium-movement.glb` — 11 movement clips for medium-rig characters
  (`Walking_A/B/C`, `Running_A/B`, `Jump_*`, `T-Pose`).
- `characters/rig-medium-general.glb` — 15 general clips for medium-rig characters
  (`Idle_A/B`, `Hit_A/B`, `Death_A/B`, `Interact`, `PickUp`, `Throw`, `Use_Item`,
  `Spawn_Air`, `Spawn_Ground`, `T-Pose`).
- `characters/rig-large-movement.glb` / `characters/rig-large-general.glb` — the
  same clip sets for large-rig characters.

Every character shares the skeleton of its rig tier. The character's mesh GLB
contains only geometry and materials — **no embedded animation data** (verified:
`Knight.glb` and `Mage.glb` report 0 animations). At runtime, `useAnimations` from
`@react-three/drei` is given the animation GLBs' clips and the character's
`SkinnedMesh`; the clips drive the character's skeleton.

### Rig verification — RESULT (M2 task 1, completed)

Verified with `gltf-transform` against the real `references/` GLBs:

- `Knight`, `Mage`, `Rig_Medium_MovementBasic`, `Rig_Medium_General` **all have a
  23-bone skin** with the **identical bone-name set**: `root, hips, spine, chest,
  upperarm.l/r, lowerarm.l/r, wrist.l/r, hand.l/r, handslot.l/r, head,
  upperleg.l/r, lowerleg.l/r, foot.l/r, toes.l/r`.
- The joint **array order differs** between a character GLB and a rig GLB (Knight
  lists arms before legs; the Rig lists legs before arms). The bone *sets* are
  byte-identical.

**Decision — bind animation clips by bone NAME, not joint index.** Three.js
`AnimationClip` tracks target nodes by name (`<boneName>.<property>`), and
`useAnimations` resolves tracks against the mounted object graph by name. Because
the bone names match exactly, a Rig clip plays correctly on any character of that
rig tier regardless of joint-array order. No index remapping is needed. This is the
KayKit-intended pipeline and it is confirmed sound — the design §10 risk is closed.

The total GLB payload stays small: N character meshes + 4 animation GLBs, rather
than N character GLBs each carrying full animation data.

## Character Factory

`src/entities/characterFactory.ts` exports a single function:

```typescript
function createCharacter(params: {
  role: UnitType;
  faction: "player" | "enemy";
  hexPosition: { q: number; r: number };
  world: KootaWorld;
  assets: AssetAccessor;
}): Entity;
```

It creates the appropriate ECS entity archetype (see `50-ecs-model.md`), attaches
the correct component values for the role, and returns the entity ID. The r3f component
in `src/entities/CharacterMesh.tsx` reads the entity's components and renders the
correct mesh.

The factory is the single place where character role maps to component values. No
other code hardcodes character stats.

## AnimationState → Clip Mapping

The `animationSystem` reads each entity's `AnimationState.state` and drives
`useAnimations` to play the matching clip. Clip names are the KayKit standard names
as they appear in the animation GLBs.

| AnimState | Clip name in animation GLB |
|---|---|
| `IDLE` | `"Idle"` |
| `MOVING` | `"Walking"` (or `"Running"` if speed > threshold) |
| `HARVESTING` | `"Attack"` (peon swings axe at resource) |
| `ATTACKING` | `"Attack"` |
| `BUILDING` | `"Attack"` (peon hammering) |
| `DYING` | `"Death"` |

Clip transitions use crossfade with a 0.2s blend duration to avoid snapping. The
`animationSystem` tracks the last played clip per entity and only triggers a new
crossfade when the state changes.

## Building Characters

Buildings (TownHall, Farm, Barracks, GoblinPortal) use KayKit building GLBs from the
Dungeon Pack. They are not animated and do not use the shared-rig pattern. They are
instantiated by `src/entities/buildingFactory.ts`, which follows the same parameter
pattern as `createCharacter` but without animation setup.

## Character Rendering

Each character entity in the ECS has a corresponding `<CharacterMesh>` r3f component
rendered inside the scene. The component:

1. Reads `HexPosition` to compute world XZ via `axialToWorld`.
2. Reads `Transform.position.y` (set by `movementSystem` for smooth interpolation).
3. Reads `AnimationState` to drive the animation clip.
4. Reads `Health` to drive the health billboard (a floating `<Html>` overlay or
   a procedural bar mesh above the character).
5. Reads `Selectable.isSelected` to show a selection ring beneath the character.
