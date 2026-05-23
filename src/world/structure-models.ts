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
 * Faction-symmetric structure models. Structure *types* and their costs/traits
 * are shared between factions (see `docs/specs/100-ai-as-player.md`); only the
 * GLB model diverges — the player builds Castle / Fantasy-Town-kit structures,
 * the enemy builds Graveyard-kit equivalents. `structureModel(faction, type)`
 * resolves the right model for either side.
 *
 * The enemy entries reuse the Graveyard-kit assets already ingested for the
 * enemy base; until the AI player (M8.6) actually constructs them they are
 * unused at runtime, but the table keeps the two factions symmetric by
 * construction.
 */
const STRUCTURE_MODELS: Record<Faction, Record<BuildingType, StructureModel>> = {
  player: {
    TownHall: { logicalId: 'structures.town-hall', scale: 1.0, yOffset: 0 },
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
  enemy: {
    // the enemy hub is the graveyard crypt; its support structures reuse the
    // graveyard kit so the enemy base reads as a coherent necropolis.
    TownHall: { logicalId: 'structures.portal-crypt', scale: 1.4, yOffset: 0 },
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
};

/** Resolve the render model for a faction's structure type. */
export function structureModel(faction: Faction, type: BuildingType): StructureModel {
  return STRUCTURE_MODELS[faction][type];
}
