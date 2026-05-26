/**
 * M_REGISTRY.3 + M_ARCH_UNIFY.7 — the Skin registry.
 *
 * Skins are the top-level visual overlay (layer 4 of the M_ARCH_UNIFY
 * stack — Archetypes → Things → Slots → Skins). A faction is no longer
 * a key in a per-table mesh dictionary; it carries ONE `Skin` object
 * that bundles every visual decision the renderer needs.
 *
 * Before this file, `STRUCTURE_MODELS` in `src/world/structure-models.ts`
 * was a parallel `Record<Faction, Record<BuildingType, StructureModel>>`
 * table — every visual fork between player and enemy lived in its own
 * top-level table, indexed twice (once by faction, once by Thing type).
 * Adding a third tribe meant editing every per-faction table across the
 * codebase. With Skins, a new tribe is ONE new `SKINS[tribe] = {...}`
 * row in this file — the structure-models accessor reads
 * `SKINS[faction].structure[type]` instead of a top-level table.
 *
 * The `StructureModel` type lives here too so this file is the source
 * of truth — the world-level accessor (`src/world/structure-models.ts`)
 * imports it back when consumers need it. The Skin currently exposes
 * only the `structure` slot (M_REGISTRY.3 scope); future slots will
 * include `rig` (per-faction character mesh + tier — M_REGISTRY.2),
 * `audio` (faction-specific SFX overrides), and `accretionPool`
 * (per-faction decoration choices). Each slot lands on its own commit.
 */
import type { BuildingType, Faction, UnitType } from '@/ecs/components';
import { BUILDING_COMPONENTS } from '@/world/procedural/buildings';
import {
  DEFAULT_MATERIALS,
  type PrimitiveFamily,
  type PrimitiveMaterial,
} from '@/world/procedural/primitives';
import { measuredScale, measuredYOffset } from './asset-scale';

/**
 * M_V11.PROCMESH.MATERIALS — per-faction primitive material overrides.
 * Buildings compose tier-1 primitives (Log, StonePlinth, Banner, etc.)
 * and read the materials by family. SKINS supplies a Record per faction;
 * any family omitted falls back to DEFAULT_MATERIALS.
 *
 * The buildings/* compositions resolve their materials from this slot
 * via the FactionMaterialsContext provider — primitive call sites in
 * a building stay clean (no per-primitive lookup), and a third tribe
 * gets a new colour palette by editing ONE row in SKINS.
 */
export type FactionMaterials = Partial<Record<PrimitiveFamily, PrimitiveMaterial>>;

/** Merge a faction's partial overrides on top of the default set so
 *  consumers always get a complete map. */
export function resolveFactionMaterials(
  faction: Faction,
): Record<PrimitiveFamily, PrimitiveMaterial> {
  const overrides = SKINS[faction].factionMaterials ?? {};
  return {
    ...DEFAULT_MATERIALS,
    ...overrides,
  };
}

/**
 * M_GAME.SCALE.GLB-MEASURE.1 — DRY helper. Builds a StructureModel
 * by reading the measured scale + yOffset from glb-metadata.json
 * for the given logical id. Re-running `pnpm assets:measure` after
 * a new asset lands re-tunes every entry automatically — no manual
 * scale-tweak commits.
 *
 * Post M_V11.PROCMESH.SKINS-PIVOT, the player/AI building set uses
 * `procedural(...)` instead. `measured` is retained for non-building
 * Skin slots that still load GLBs (baseProps, future graveyard-kit
 * camp entries). Exported so callers outside this file can use it.
 */
export function measured(logicalId: string, yOffsetOverride?: number): StructureModel {
  return {
    logicalId,
    scale: measuredScale(logicalId),
    yOffset: yOffsetOverride ?? measuredYOffset(logicalId),
  };
}

/**
 * M_V11.PROCMESH.SKINS-PIVOT — DRY helper for procedural building
 * entries. logicalId is a stable sentinel ('procedural:<type>') so
 * accidental GLB lookups error loudly; scale/yOffset default to
 * 1.0 / 0.0 since procedural compositions already place themselves
 * on the tile.
 */
function procedural(
  component: NonNullable<StructureModel['proceduralComponent']>,
  scale = 1.0,
  yOffset = 0.0,
): StructureModel {
  return {
    logicalId: 'procedural',
    scale,
    yOffset,
    proceduralComponent: component,
  };
}

/** How one structure model renders.
 *
 * **GLB path** (default — still used for horde-camp / Graveyard Kit
 * entries): logicalId references a GLB asset; scale + yOffset come
 * from `pnpm assets:measure`.
 *
 * **Procedural path** (M_V11.PROCMESH.SKINS-PIVOT): when
 * `proceduralComponent` is set, the renderer mounts that React
 * component instead of loading a GLB. logicalId may be left blank
 * (set to '' or a stable sentinel like 'procedural') for entries
 * with no asset backing. Scale + yOffset are applied around the
 * rendered procedural composition just like the GLB path.
 */
export interface StructureModel {
  /** Logical asset id resolved via the typed manifest accessor.
   *  Required for the GLB path; ignored when proceduralComponent is set. */
  logicalId: string;
  /** Uniform scale factor — kit models / procedural compositions are
   *  tuned to the hex grid. */
  scale: number;
  /** Vertical offset so the model base seats on the tile top. */
  yOffset: number;
  /** M_V11.PROCMESH.SKINS-PIVOT — when set, render this component
   *  instead of loading a GLB. The component receives a position
   *  prop already adjusted for yOffset; scale is applied via a
   *  parent group transform. Wrap in FactionMaterialsProvider at
   *  the call site so primitives pick up the faction palette. */
  proceduralComponent?: (props: { position?: [number, number, number] }) => import('react').ReactElement;
}

/**
 * One decorative prop placed at a fixed local-space offset around the
 * faction's base tile (M_REGISTRY.4). Player base today has no props
 * (the central TownHall mesh + the placed structures around it provide
 * the visual identity); enemy base clusters gravestones + fences
 * around the central crypt for the necropolis silhouette.
 */
export interface BaseProp {
  /** Logical asset id (resolved via the typed manifest). */
  logicalId: string;
  /** Local-space X offset from the base tile centre. */
  x: number;
  /** Local-space Y offset from the base tile centre. */
  y: number;
  /** Local-space Z offset from the base tile centre. */
  z: number;
  /** Uniform scale factor. */
  scale: number;
  /** Y-axis rotation in radians. */
  rotationY: number;
}

/** The two KayKit skeleton tiers. Characters share a rig within a tier. */
export type RigTier = 'medium' | 'large';

/**
 * Per-unit-role rig + mesh — the third Skin slot (M_REGISTRY.2). Drives
 * which KayKit character GLB AnimatedCharacter loads for the role on
 * THIS faction, and which animation library (Rig_Medium / Rig_Large)
 * the retarget loader pairs it with. A future tribe with different
 * meshes (e.g. Necromancer's "Peon equivalent" = a skeletal serf) just
 * sets `SKINS.necromancer.rig.Peon = { tier: 'medium', meshLogicalId:
 * 'characters.necromancer.serf' }` without any code edit.
 */
export interface UnitRig {
  /** Which skeleton tier this role uses — selects the animation library. */
  tier: RigTier;
  /** Logical id of the role's character mesh GLB. */
  meshLogicalId: string;
}

/**
 * Minimap visual identity per faction (M_REGISTRY.27) — was a hand-
 * written ternary `faction === 'enemy' ? '#ef4444' : '#22c55e'` in
 * Minimap.tsx:118 plus a literal tuple of (townHallEntity, '#38bdf8') /
 * (enemyBaseEntity, '#a855f7') for base markers. After M_REGISTRY.27,
 * these are Skin slot reads.
 */
export interface MinimapSkin {
  /** Color of unit dots on the minimap. */
  unitColor: string;
  /** Color of the faction's base marker on the minimap. */
  baseColor: string;
}

/**
 * Per-faction base-accretion config (M_REGISTRY.7). The cluster of
 * decorative props scattered around the faction's base tile (the
 * necropolis gravestones for the enemy; the small-trees + rocks for
 * the player). Was hand-rolled BASE_ACCRETION in Decoration.tsx;
 * lifted onto the Skin slot so a third tribe drops its accretion
 * pool in as ONE row.
 */
export interface BaseAccretionSkin {
  /** Logical asset ids the scatter draws from. */
  propPool: readonly string[];
  /** Radius in hex tiles around the base tile. */
  radius: number;
  /** Spawn-chance per eligible tile (0–1). */
  density: number;
  /** Random scale range per prop. */
  scaleRange: readonly [number, number];
  /** PRNG seed tag (deterministic per faction). */
  seedTag: string;
}

/**
 * Visual identity for one faction. New slots get added here as each
 * M_REGISTRY.* ticket lands.
 */
export interface Skin {
  /** Per-building-type GLB + scale + yOffset (M_REGISTRY.3). */
  structure: Record<BuildingType, StructureModel>;
  /** Minimap unit + base colors (M_REGISTRY.27). */
  minimap: MinimapSkin;
  /**
   * Zone-of-control border color (M_AUDIT2.ARCH.3). Was a separate
   * ZONE_COLOR table in ZoneBorder.tsx; lifted onto Skin so a new
   * tribe declares its territory shade in ONE place.
   */
  zoneBorderColor: string;
  /** Decorative cluster around the faction's base tile (M_REGISTRY.7). */
  baseAccretion: BaseAccretionSkin;
  /**
   * Decorative props placed around the faction's base tile
   * (M_REGISTRY.4). Empty for player today; enemy clusters
   * gravestones + fences around the central crypt.
   */
  baseProps: BaseProp[];
  /**
   * Per-unit-role rig + mesh (M_REGISTRY.2). Today both factions hold
   * identical rows because the existing roster is faction-agnostic
   * (Peon goes to player, Goblin goes to enemy — the role implies the
   * faction). The duplication is deliberate: a third tribe will need
   * its OWN UnitType-keyed rig map, and the per-faction shape is
   * already correct for that future.
   */
  rig: Record<UnitType, UnitRig>;
  /**
   * M_EXPANSION.A.29 — cosmetic faction-wide tint multiplied into
   * every character mesh material at render time. Lets the player
   * eyeball whose unit it is without reading a HUD label. Null leaves
   * the GLB's native palette unchanged.
   */
  characterTint?: string | null;
  /**
   * M_EXPANSION.S.51 (closes M_REGISTRY.20) — per-faction audio
   * overrides. When set, an event listed here plays this asset id
   * instead of the global SOUND_FOR_EVENT entry. Lets player vs
   * enemy footsteps / death-thuds sound distinct without forking
   * the entire sound-map. Empty by default — both factions fall
   * through to the global mapping today.
   */
  audio?: Partial<Record<string, string>>;
  /**
   * M_EXPANSION.S.53 (closes M_REGISTRY.18 future-steps) — per-faction
   * brain bias overrides. Today's Evaluators (Build/Military/Train/
   * Resign) read these multipliers when scoring desirability; future
   * brains add their own slots.
   * - aggressiveness: scales MilitaryEvaluator desirability
   *   (1.0 default; 1.5 = berserker, 0.7 = turtle)
   * - economyFocus: scales BuildEvaluator desirability
   *   (1.0 default; 1.4 = builder-focus, 0.8 = stripped-down)
   */
  brain?: {
    aggressiveness?: number;
    economyFocus?: number;
  };
  /**
   * M_V11.PROCMESH.MATERIALS — per-primitive-family material overrides
   * for procedural building compositions. Any family omitted falls
   * back to DEFAULT_MATERIALS (see `resolveFactionMaterials`).
   *
   * Player today: warm stone + warm wood + red banner + gold trim.
   * Enemy today: cold blue-grey stone + dark wood + violet banner +
   * silver trim. Adding a third tribe = ONE new entry here.
   */
  factionMaterials?: FactionMaterials;
}

/**
 * The current 2-tribe roster shares one rig map (Peon → engineer hero
 * mesh, Goblin → rogue hero mesh tinted, etc.). Both factions get this
 * literal today; a future Necromancer or Wood-Elf tribe defines its own
 * rig map and slots it under `SKINS.necromancer.rig`. The per-faction
 * shape is the right shape; the duplication is acknowledged.
 */
const SHARED_RIG_TODAY: Record<UnitType, UnitRig> = {
  Peon: { tier: 'medium', meshLogicalId: 'characters.heroes.engineer' },
  Footman: { tier: 'medium', meshLogicalId: 'characters.heroes.knight' },
  // Trebuchet: placeholder — reuse knight scaled to feel siege-y. The
  // siege identity comes from damageType + range; mesh is a stand-in
  // until a dedicated KayKit siege model lands.
  Trebuchet: { tier: 'medium', meshLogicalId: 'characters.heroes.knight' },
  // M_EXPANSION.A.26 — Wizard uses the KayKit Mage mesh.
  Wizard: { tier: 'medium', meshLogicalId: 'characters.heroes.mage' },
  // M_FUN.UNIT.HEAL — Healer reuses the Mage mesh until a dedicated
  // Cleric/Priest GLB lands. Distinguished visually by faction-tint
  // (Healer = white/gold) when the tint pass lands.
  Healer: { tier: 'medium', meshLogicalId: 'characters.heroes.mage' },
  // M_FUN.MAP.UTILISATION.FERRYMAN — aquatic civilian. Reuses
  // the rogue mesh until a dedicated boat/raft asset lands.
  Ferryman: { tier: 'medium', meshLogicalId: 'characters.heroes.rogue' },
  // M_EXPANSION.A.27 — Scout uses the KayKit Rogue mesh.
  Scout: { tier: 'medium', meshLogicalId: 'characters.heroes.rogue' },
  // Settler (M_MODES.6) — civilian appearance; reuse the engineer mesh.
  Settler: { tier: 'medium', meshLogicalId: 'characters.heroes.engineer' },
  // M_EXPANSION.F.96 — Hero uses the Knight mesh (premium melee tell).
  // Larger selectionRadius (0.95) in UNIT_PROFILES helps the player
  // pick the Hero out of a melee scrum.
  Hero: { tier: 'medium', meshLogicalId: 'characters.heroes.knight' },
  // Goblin: no dedicated KayKit goblin; the hooded Rogue is the closest
  // small humanoid. Tinted/scaled distinctly at render time.
  Goblin: { tier: 'medium', meshLogicalId: 'characters.heroes.rogue' },
  Orc: { tier: 'large', meshLogicalId: 'characters.enemies.orc' },
  Vampire: { tier: 'medium', meshLogicalId: 'characters.enemies.vampire' },
  BlackKnight: { tier: 'large', meshLogicalId: 'characters.enemies.black-knight' },
  Witch: { tier: 'medium', meshLogicalId: 'characters.enemies.witch' },
};

/**
 * SKINS — the master Skin registry, keyed by faction. A future Necromancer
 * or Wood-Elf tribe drops in by adding a `necromancer: { structure: {...} }`
 * row here AND extending the Faction union — no per-table edits across
 * the codebase.
 */
export const SKINS: Record<Faction, Skin> = {
  player: {
    structure: {
      // M_V11.PROCMESH.SKINS-PIVOT — all player buildings are
      // procedural compositions (src/world/procedural/buildings/*).
      // FactionMaterialsProvider at the FactionBase level pipes the
      // player palette (warm stone, crimson banner, gold trim) into
      // every primitive. Was: GLB pipeline via measured(...).
      // Removed GLBs: structures.rts.town-center/barracks/tower-house/
      // wall (M_V11.PROCMESH.GLB-CLEANUP).
      TownHall: procedural(BUILDING_COMPONENTS.TownHall),
      Farm: procedural(BUILDING_COMPONENTS.Farm),
      House: procedural(BUILDING_COMPONENTS.House),
      Granary: procedural(BUILDING_COMPONENTS.Granary),
      Barracks: procedural(BUILDING_COMPONENTS.Barracks),
      Watchtower: procedural(BUILDING_COMPONENTS.Watchtower),
      Wall: procedural(BUILDING_COMPONENTS.Wall),
      Wonder: procedural(BUILDING_COMPONENTS.Wonder, 1.0),
      Library: procedural(BUILDING_COMPONENTS.Library),
    },
    // M_EXPANSION.A.4 + A.10 — faction banner behind Town Hall + a
    // small fountain to the side. The fountain anchors the base as a
    // CIVIC space; the banner gives it identity. Both stay close enough
    // to the central tile that player-built structures landing on
    // adjacent tiles won't clip.
    baseProps: [
      { logicalId: 'structures.banner-faction', x: 0, y: 0, z: -1.2, scale: 0.8, rotationY: 0 },
      { logicalId: 'structures.fountain', x: 1.3, y: 0, z: -0.5, scale: 0.45, rotationY: 0.3 },
    ],
    rig: SHARED_RIG_TODAY,
    minimap: { unitColor: '#22c55e', baseColor: '#38bdf8' },
    zoneBorderColor: '#38bdf8',
    // M_EXPANSION.A.29 — null = leave native KayKit colors. Player
    // faction reads cleanly without tinting (the warm-armor heroes
    // already pop against grass/desert biomes).
    characterTint: null,
    // M_EXPANSION.S.51 — empty audio overrides; player falls through
    // to SOUND_FOR_EVENT. A future audio pass can crisp-up player
    // footsteps/death here without touching the global sound-map.
    audio: {},
    // M_EXPANSION.S.53 — neutral brain bias for the player faction
    // (only meaningful if a 'player' AI brain is ever instantiated for
    // a tutorial drone; today the player is human-driven).
    brain: { aggressiveness: 1.0, economyFocus: 1.0 },
    baseAccretion: {
      propPool: ['nature.tree.pine-a', 'nature.rock.large-a'],
      radius: 2,
      density: 0.45,
      scaleRange: [0.5, 0.8],
      seedTag: 'player-accretion',
    },
    // M_V11.PROCMESH.MATERIALS — warm-stone + warm-wood + crimson
    // banner + gold trim. Reads as 'classical kingdom'.
    factionMaterials: {
      stone: { color: '#c7b9a3', roughness: 0.9, metalness: 0.04 },
      wood: { color: '#8a4a1c', roughness: 0.88, metalness: 0 },
      roof: { color: '#7a2e1e', roughness: 0.82, metalness: 0 },
      banner: { color: '#dc2626', roughness: 0.55, metalness: 0 },
      trim: { color: '#facc15', roughness: 0.28, metalness: 0.82 },
      accent: { color: '#e2e8f0', roughness: 0.4, metalness: 0.6 },
      glass: { color: '#fde68a', emissive: '#fbbf24', emissiveIntensity: 0.7, roughness: 0.18 },
      metal: { color: '#d6d3d1', roughness: 0.34, metalness: 0.85 },
      dark: { color: '#27272a', roughness: 0.95, metalness: 0.05 },
    },
  },
  enemy: {
    structure: {
      // M_V11.PROCMESH.SKINS-PIVOT — enemy is an AI player; like the
      // human player, its buildings are procedural compositions.
      // factionMaterials drives the necropolis read: cold blue-grey
      // stone + violet banner + dark wood — same building shapes,
      // different palette. The graveyard-kit baseProps (gravestones,
      // fences) stay GLB so the necropolis biome ambient is preserved.
      // Barbarian camps (separate from this faction) still use the
      // Graveyard Kit GLBs (crypt, portal-crypt, gravestones).
      TownHall: procedural(BUILDING_COMPONENTS.TownHall),
      Farm: procedural(BUILDING_COMPONENTS.Farm),
      House: procedural(BUILDING_COMPONENTS.House),
      Granary: procedural(BUILDING_COMPONENTS.Granary),
      Barracks: procedural(BUILDING_COMPONENTS.Barracks),
      Watchtower: procedural(BUILDING_COMPONENTS.Watchtower),
      Wall: procedural(BUILDING_COMPONENTS.Wall),
      Wonder: procedural(BUILDING_COMPONENTS.Wonder, 1.0),
      Library: procedural(BUILDING_COMPONENTS.Library),
    },
    rig: SHARED_RIG_TODAY,
    // Necropolis silhouette — gravestones cluster in front of the
    // crypt, iron fences frame the sides + rear. Positions are
    // local-space offsets from the base tile centre (the central
    // crypt mesh in the FactionBase central position is implicit and
    // drawn at scale 1.4 directly by FactionBase).
    baseProps: [
      // Gravestones — clustered in front of the crypt.
      // M_EXPANSION.A.16 + .A.15 — added a tall cross-large at the
      // back-centre + a crooked pine behind the crypt so the
      // necropolis silhouette reads tall+ominous from the default
      // camera framing.
      { logicalId: 'nature.gravestone-cross-large', x: 0, y: 0, z: -1.4, scale: 0.8, rotationY: 0 },
      { logicalId: 'nature.pine-crooked', x: -1.5, y: 0, z: -1.0, scale: 0.7, rotationY: 0.6 },
      { logicalId: 'nature.gravestone.cross', x: 0.6, y: 0, z: 0.4, scale: 0.9, rotationY: 0.4 },
      { logicalId: 'nature.gravestone.round', x: -0.55, y: 0, z: 0.5, scale: 0.8, rotationY: -0.5 },
      { logicalId: 'nature.gravestone.round', x: 0.25, y: 0, z: 0.7, scale: 0.75, rotationY: 0.1 },
      // Iron fence sections framing the base.
      {
        logicalId: 'structures.iron-fence',
        x: 0.9,
        y: 0,
        z: -0.1,
        scale: 0.8,
        rotationY: Math.PI / 2,
      },
      {
        logicalId: 'structures.iron-fence',
        x: -0.9,
        y: 0,
        z: -0.1,
        scale: 0.8,
        rotationY: -Math.PI / 2,
      },
      { logicalId: 'structures.iron-fence', x: 0, y: 0, z: -0.9, scale: 0.8, rotationY: 0 },
    ],
    minimap: { unitColor: '#ef4444', baseColor: '#a855f7' },
    zoneBorderColor: '#f43f5e',
    // M_EXPANSION.A.29 — enemy units get a cool desaturating tint so
    // the same KayKit Rogue mesh reads as 'enemy goblin' (gray/blue)
    // not 'just another rogue'. Multiplies into the base color so
    // the silhouette still varies via the texture.
    characterTint: '#7da3c8',
    // M_EXPANSION.S.51 — empty audio overrides; enemy falls through
    // to SOUND_FOR_EVENT. Future hook: bone-howl death sample for
    // necropolis faction.
    audio: {},
    // M_EXPANSION.S.53 — necropolis enemy biases toward raids over
    // economy: military 1.2× more attractive, building 0.85× less.
    brain: { aggressiveness: 1.2, economyFocus: 0.85 },
    baseAccretion: {
      // M_EXPANSION.A.23 — mossy rocks added to the necropolis biome
      // accretion pool for visual variety beyond the all-gravestone
      // baseline.
      propPool: ['nature.gravestone.round', 'nature.gravestone.cross', 'nature.rocks-mossy'],
      radius: 2,
      density: 0.55,
      scaleRange: [0.8, 1.1],
      seedTag: 'graveyard',
    },
    // M_V11.PROCMESH.MATERIALS — cold blue-grey stone + dark wood +
    // violet banner + silver trim. Reads as 'necropolis'.
    factionMaterials: {
      stone: { color: '#6b7280', roughness: 0.92, metalness: 0.08 },
      wood: { color: '#3f2a1a', roughness: 0.9, metalness: 0 },
      roof: { color: '#3b0764', roughness: 0.85, metalness: 0.05 },
      banner: { color: '#7e22ce', roughness: 0.55, metalness: 0 },
      trim: { color: '#cbd5e1', roughness: 0.32, metalness: 0.78 },
      accent: { color: '#a78bfa', roughness: 0.4, metalness: 0.55 },
      glass: { color: '#a5f3fc', emissive: '#22d3ee', emissiveIntensity: 0.85, roughness: 0.2 },
      metal: { color: '#94a3b8', roughness: 0.32, metalness: 0.88 },
      dark: { color: '#0f172a', roughness: 0.96, metalness: 0.05 },
    },
  },
};

/** Resolve the full Skin for a faction. */
export function skinFor(faction: Faction): Skin {
  return SKINS[faction];
}
