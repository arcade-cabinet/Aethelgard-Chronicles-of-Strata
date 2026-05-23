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

/** How one structure model renders — its GLB logical id, scale, and Y offset. */
export interface StructureModel {
  /** Logical asset id resolved via the typed manifest accessor. */
  logicalId: string;
  /** Uniform scale factor — kit models are tuned to the hex grid. */
  scale: number;
  /** Vertical offset so the model base seats on the tile top. */
  yOffset: number;
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
  // Settler (M_MODES.6) — civilian appearance; reuse the engineer mesh.
  Settler: { tier: 'medium', meshLogicalId: 'characters.heroes.engineer' },
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
      // M_MAPGEN.2 — TownHall stands distinctly larger than any other player
      // building; sits slightly above tile level to "anchor" the map.
      TownHall: { logicalId: 'structures.town-hall', scale: 1.5, yOffset: 0.15 },
      Farm: { logicalId: 'structures.farm', scale: 0.65, yOffset: 0 },
      House: { logicalId: 'structures.farm', scale: 0.5, yOffset: 0 },
      // M_EXPANSION.A.8 — Granary uses Fantasy Town Kit `windmill.glb`.
      // Real mill silhouette beats the down-scaled barracks placeholder.
      Granary: { logicalId: 'structures.granary', scale: 0.7, yOffset: 0 },
      Barracks: { logicalId: 'structures.barracks', scale: 0.9, yOffset: 0 },
      // M_EXPANSION.A.1 — dedicated Castle Kit watchtower mesh; was a
      // downscaled town-hall placeholder. Real tower silhouette.
      Watchtower: { logicalId: 'structures.watchtower-stone', scale: 0.7, yOffset: 0 },
      // M_EXPANSION.A.2 — Wall now uses Castle Kit `wall-narrow.glb`
      // (stone slab) instead of the portal-fence picket placeholder.
      Wall: { logicalId: 'structures.wall-stone', scale: 1.1, yOffset: 0 },
      // M_EXPANSION.A.5 — Wonder mounts a Castle Kit keep silhouette
      // (was the literal town-hall scaled up). Distinct + imposing.
      Wonder: { logicalId: 'structures.wonder-keep', scale: 1.2, yOffset: 0 },
      // M_EXPANSION.A.7 — Library uses Fantasy Town Kit `watermill.glb`.
      // Distinct silhouette from Granary so the player can tell research
      // buildings from food buildings at a glance.
      Library: { logicalId: 'structures.library', scale: 0.7, yOffset: 0 },
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
    baseAccretion: {
      propPool: ['nature.tree.pine-a', 'nature.rock.large-a'],
      radius: 2,
      density: 0.45,
      scaleRange: [0.5, 0.8],
      seedTag: 'player-accretion',
    },
  },
  enemy: {
    structure: {
      // the enemy hub is the graveyard crypt; support structures reuse the
      // graveyard kit so the enemy base reads as a coherent necropolis.
      // M_EXPANSION.A.13 — enemy TownHall now uses the Graveyard Kit
      // `crypt.glb` (more imposing than the small portal-crypt).
      TownHall: { logicalId: 'structures.crypt', scale: 1.5, yOffset: 0.15 },
      Farm: { logicalId: 'nature.gravestone.round', scale: 1.0, yOffset: 0 },
      House: { logicalId: 'nature.gravestone.round', scale: 0.8, yOffset: 0 },
      Granary: { logicalId: 'structures.portal-crypt', scale: 0.7, yOffset: 0 },
      Barracks: { logicalId: 'structures.iron-fence', scale: 1.0, yOffset: 0 },
      Watchtower: { logicalId: 'nature.gravestone.cross', scale: 1.2, yOffset: 0 },
      Wall: { logicalId: 'structures.iron-fence', scale: 1.1, yOffset: 0 },
      // M_EXPANSION.A.20 — Wonder now mounts the Tower Defense cannon
      // (literal siege-piece silhouette signals 'final game-changer
      // building' way better than another reskinned crypt).
      Wonder: { logicalId: 'structures.wonder-cannon', scale: 1.1, yOffset: 0 },
      // Library (M_FEATURE.3) — enemy variant; gravestone footprint.
      Library: { logicalId: 'nature.gravestone.cross', scale: 0.9, yOffset: 0 },
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
    baseAccretion: {
      propPool: ['nature.gravestone.round', 'nature.gravestone.cross'],
      radius: 2,
      density: 0.55,
      scaleRange: [0.8, 1.1],
      seedTag: 'graveyard',
    },
  },
};

/** Resolve the full Skin for a faction. */
export function skinFor(faction: Faction): Skin {
  return SKINS[faction];
}
