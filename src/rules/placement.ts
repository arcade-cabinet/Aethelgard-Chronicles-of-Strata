import { ECONOMY } from '@/config/economy';
import type { BoardData } from '@/core/board';
import type { BuildingType } from '@/ecs/components';
import { canAfford, type GameEconomy, type ResourceCost } from '@/game/economy';
import { BUILDING_PROFILES } from './building-profiles';

/**
 * Resource cost per buildable building type. `Palace` is excluded — it is a
 * generation-time attractor, never built mid-game (spec 102).
 *
 * M_REGISTRY.5 — derived from the unified registry. Buildable rows
 * MUST declare a `cost`; a missing cost is a registry bug (caught at
 * module load), not a silent zero-cost build.
 */
function deriveBuildingCosts(): Record<Exclude<BuildingType, 'Palace'>, ResourceCost> {
  const out: Partial<Record<Exclude<BuildingType, 'Palace'>, ResourceCost>> = {};
  for (const key of Object.keys(BUILDING_PROFILES) as BuildingType[]) {
    if (key === 'Palace') continue;
    const cost = BUILDING_PROFILES[key].cost;
    if (cost === undefined) {
      // Code-reviewer Finding 1 (latent trap): a buildable BuildingType
      // without a cost field would silently `canAfford → true`, making
      // its placement free. Fail at module load so a registry edit that
      // forgets the cost surfaces in a developer test run, not after
      // ship.
      throw new Error(
        `placement: BUILDING_PROFILES[${key}] is buildable (not Palace) but has no cost. Add a cost row in src/rules/building-profiles.ts.`,
      );
    }
    out[key as Exclude<BuildingType, 'Palace'>] = cost;
  }
  return out as Record<Exclude<BuildingType, 'Palace'>, ResourceCost>;
}

export const BUILDING_COSTS: Record<Exclude<BuildingType, 'Palace'>, ResourceCost> = Object.freeze(
  deriveBuildingCosts(),
) as Record<Exclude<BuildingType, 'Palace'>, ResourceCost>;

/**
 * Supply each building contributes once complete. M_REGISTRY.5 — derived
 * from the unified registry. `supply` is required on every profile (the
 * type system enforces this) so no exhaustiveness check is needed.
 */
function deriveBuildingSupply(): Record<BuildingType, number> {
  const out: Partial<Record<BuildingType, number>> = {};
  for (const key of Object.keys(BUILDING_PROFILES) as BuildingType[]) {
    out[key] = BUILDING_PROFILES[key].supply;
  }
  return out as Record<BuildingType, number>;
}

export const BUILDING_SUPPLY: Record<BuildingType, number> = Object.freeze(
  deriveBuildingSupply(),
) as Record<BuildingType, number>;

/** Biomes any building may be placed on. */
const BUILDABLE_BIOMES = new Set(ECONOMY.buildableBiomes);

/** The result of a placement-validity check. */
export interface PlacementCheck {
  /** Whether placement is allowed. */
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  reason: string;
}

/**
 * Whether a building of `type` may be placed on `tileKey` by a faction with
 * `economy`. The tile must be a buildable biome, unoccupied, and the faction
 * must afford the cost. Faction-agnostic — the human UI and the AI player both
 * consult this (spec 101).
 */
export function canBuild(
  board: BoardData,
  occupied: ReadonlySet<string>,
  tileKey: string,
  type: Exclude<BuildingType, 'Palace'>,
  economy: GameEconomy,
): PlacementCheck {
  const tile = board.tiles.get(tileKey);
  if (!tile) return { ok: false, reason: 'No such tile' };
  if (!BUILDABLE_BIOMES.has(tile.type)) {
    return { ok: false, reason: 'Must build on grass, highland, or beach' };
  }
  if (occupied.has(tileKey)) return { ok: false, reason: 'Tile is occupied' };
  if (!canAfford(economy, BUILDING_COSTS[type])) {
    return { ok: false, reason: 'Not enough resources' };
  }
  return { ok: true, reason: '' };
}
