import type { World } from 'koota';
import { type Discovery, discoveryById, scaledCostFor } from '@/rules';
import { canAfford, type GameEconomy, spend } from './economy';

/**
 * Research / Discoveries (M_DATA.7) — the tech-tree archetype, spec 102.
 *
 * The 2-item "research" surface is now a thin compatibility layer over the
 * `DISCOVERIES` registry in `@/rules`. Each Discovery's effect is declared
 * in `discovery-registry.ts`; this module owns the per-game purchased state
 * and the apply/spend lifecycle.
 *
 * Adding a Discovery = a new row in `discovery-registry.ts`. No code branches
 * here. The legacy `ResearchId` union is kept narrow to ease the migration;
 * any string id may pass through `applyResearch` and dispatch to the registry.
 */

/** A research / Discovery id. */
export type ResearchId = 'forgedBlades' | 'steelPlows';

/** Which Discoveries have been purchased this session. */
export interface ResearchState {
  /** Purchased Discovery ids. */
  purchased: Set<ResearchId>;
}

/** Create an empty research state. */
export function createResearch(): ResearchState {
  return { purchased: new Set() };
}

/** Whether a Discovery can be purchased — affordable, owned, and prereqs met. */
export function canResearch(
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  if (research.purchased.has(id)) return false;
  const d = discoveryById(id);
  if (!d) return false;
  if (d.prereqs && !d.prereqs.every((p) => research.purchased.has(p as ResearchId))) return false;
  // M_FEATURE.2 — costs scale with depth in the prereq DAG, not the raw
  // JSON value. depth-0 pays base; deeper rows pay base × log scaling.
  return canAfford(economy, scaledCostFor(id));
}

/**
 * Purchase a Discovery — validate, spend (scaled cost), dispatch its
 * `apply(world)` effect, record it as purchased. Dispatches through the
 * registry; no code branches.
 */
export function applyResearch(
  world: World,
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  const d: Discovery | undefined = discoveryById(id);
  if (!d) return false;
  if (!canResearch(economy, research, id)) return false;
  if (!spend(economy, scaledCostFor(id))) return false;
  research.purchased.add(id);
  d.apply(world);
  return true;
}

/**
 * M_V6.CARRY.CAMP-DISCOVERY — grant a free Discovery from a fixed pool,
 * bypassing cost + prereq checks (a barbarian-camp clearing reward).
 *
 * Picks a random un-purchased Discovery from `pool` using the supplied
 * `prng` (the game's eventRng). Applies its `apply(world)` side-effect
 * immediately. Returns the granted id or null when every pool entry
 * is already purchased (no-op — camp still clears, just no Discovery
 * bonus this time).
 *
 * Pool defaults to ALL known Discovery ids; pass an explicit list to
 * restrict to a "camp-reward" subset.
 *
 * @param world     - ECS world for the apply() effect.
 * @param research  - Shared research state to mark purchase against.
 * @param prng      - Event-stream PRNG (`game.eventRng`).
 * @param pool      - Candidate ids; defaults to v0.6 DEFAULT_DISCOVERY_POOL.
 */
export function grantRandomDiscovery(
  world: World,
  research: ResearchState,
  prng: () => number,
  pool: readonly string[] = DEFAULT_DISCOVERY_POOL,
): string | null {
  // Filter to entries that exist in the registry AND aren't already owned.
  const candidates = pool.filter(
    (id) => discoveryById(id) !== undefined && !research.purchased.has(id as ResearchId),
  );
  if (candidates.length === 0) return null;
  const idx = Math.floor(prng() * candidates.length);
  const pick = candidates[idx] as string;
  const d = discoveryById(pick);
  if (!d) return null;
  research.purchased.add(pick as ResearchId);
  d.apply(world);
  return pick;
}

/**
 * Default Discovery pool drawn from for camp-clearing rewards. The pool
 * grows as new Discoveries land in `src/config/discoveries.json`; the
 * `discoveryById` filter in grantRandomDiscovery silently drops ids
 * not present in the registry so this constant stays a forward-compatible
 * superset.
 */
const DEFAULT_DISCOVERY_POOL: readonly string[] = [
  'forgedBlades',
  'steelPlows',
  // M_V7.DISCOVERY-TREE.V6 — flag-only techs are valid camp-clear
  // rewards too. Gates downstream systems the moment the id lands in
  // research.purchased; no apply effect needed at grant time.
  'trade-route',
  // M_V12.DEPTH.DIPLOMACY-CHAIN — cartography moved to Lore I
  // (added when LORE-CHAIN lands); first-contact is the Diplomacy
  // / Relations I head that fits the camp-reward shape (flag-only).
  'first-contact',
  'iron-tools',
];
