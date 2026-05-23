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
import type { BuildingType, Faction } from '@/ecs/components';

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

/**
 * Visual identity for one faction. New slots get added here as each
 * M_REGISTRY.* ticket lands.
 */
export interface Skin {
  /** Per-building-type GLB + scale + yOffset (M_REGISTRY.3). */
  structure: Record<BuildingType, StructureModel>;
  /**
   * Decorative props placed around the faction's base tile
   * (M_REGISTRY.4). Empty for player today; enemy clusters
   * gravestones + fences around the central crypt.
   */
  baseProps: BaseProp[];
}

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
      Granary: { logicalId: 'structures.barracks', scale: 0.55, yOffset: 0 },
      Barracks: { logicalId: 'structures.barracks', scale: 0.9, yOffset: 0 },
      Watchtower: { logicalId: 'structures.town-hall', scale: 0.7, yOffset: 0 },
      Wall: { logicalId: 'structures.portal-fence', scale: 1.1, yOffset: 0 },
      // Wonder (M_FEATURE.4) — visually a scaled Town Hall pending dedicated asset.
      Wonder: { logicalId: 'structures.town-hall', scale: 1.3, yOffset: 0 },
      // Library (M_FEATURE.3) — placeholder uses Granary footprint, scaled smaller.
      Library: { logicalId: 'structures.barracks', scale: 0.6, yOffset: 0 },
    },
    // Player base intentionally has NO decorative props — its identity
    // emerges from the placed-structures loop (Farm, Barracks, House,
    // etc.) the player builds during play. Adding decorative props
    // would clash with player-built structures landing on adjacent
    // tiles.
    baseProps: [],
  },
  enemy: {
    structure: {
      // the enemy hub is the graveyard crypt; support structures reuse the
      // graveyard kit so the enemy base reads as a coherent necropolis.
      TownHall: { logicalId: 'structures.portal-crypt', scale: 1.8, yOffset: 0.15 },
      Farm: { logicalId: 'nature.gravestone.round', scale: 1.0, yOffset: 0 },
      House: { logicalId: 'nature.gravestone.round', scale: 0.8, yOffset: 0 },
      Granary: { logicalId: 'structures.portal-crypt', scale: 0.7, yOffset: 0 },
      Barracks: { logicalId: 'structures.portal-fence', scale: 1.0, yOffset: 0 },
      Watchtower: { logicalId: 'nature.gravestone.cross', scale: 1.2, yOffset: 0 },
      Wall: { logicalId: 'structures.portal-fence', scale: 1.1, yOffset: 0 },
      // Wonder (M_FEATURE.4) — enemy variant; scaled portal-crypt.
      Wonder: { logicalId: 'structures.portal-crypt', scale: 1.6, yOffset: 0 },
      // Library (M_FEATURE.3) — enemy variant; gravestone footprint.
      Library: { logicalId: 'nature.gravestone.cross', scale: 0.9, yOffset: 0 },
    },
    // Necropolis silhouette — gravestones cluster in front of the
    // crypt, iron fences frame the sides + rear. Positions are
    // local-space offsets from the base tile centre (the central
    // crypt mesh in the FactionBase central position is implicit and
    // drawn at scale 1.4 directly by FactionBase).
    baseProps: [
      // Gravestones — clustered in front of the crypt.
      { logicalId: 'nature.gravestone.cross', x: 0.6, y: 0, z: 0.4, scale: 0.9, rotationY: 0.4 },
      { logicalId: 'nature.gravestone.round', x: -0.55, y: 0, z: 0.5, scale: 0.8, rotationY: -0.5 },
      { logicalId: 'nature.gravestone.round', x: 0.25, y: 0, z: 0.7, scale: 0.75, rotationY: 0.1 },
      // Iron fence sections framing the base.
      { logicalId: 'structures.portal-fence', x: 0.9, y: 0, z: -0.1, scale: 0.8, rotationY: Math.PI / 2 },
      { logicalId: 'structures.portal-fence', x: -0.9, y: 0, z: -0.1, scale: 0.8, rotationY: -Math.PI / 2 },
      { logicalId: 'structures.portal-fence', x: 0, y: 0, z: -0.9, scale: 0.8, rotationY: 0 },
    ],
  },
};

/** Resolve the full Skin for a faction. */
export function skinFor(faction: Faction): Skin {
  return SKINS[faction];
}
