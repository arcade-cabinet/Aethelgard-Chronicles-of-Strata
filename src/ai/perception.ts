/**
 * Perception layer — target selection for enemy units.
 *
 * Encapsulates the nearest-player scan and the retarget-cap that was
 * previously inlined in ai.ts. The cap (MAX_RETARGETS_PER_TICK) bounds the
 * per-tick cost of the O(enemies × players) scan + A* pair.
 */
import type { Entity, World } from 'koota';
import { COMBAT } from '@/config/combat';
import { hexDistance } from '@/core/hex';
import { FactionTrait, Health, HexPosition } from '@/ecs/components';

/** Max enemies allowed to (re)acquire a target per tick. */
export const MAX_RETARGETS_PER_TICK = 8;

/** Aggro search radius (hex tiles). */
const AGGRO_RADIUS: number = COMBAT.ai.aggroRadius;

export interface PerceptionResult {
  /** The entity chosen as the new target, or null when none found. */
  target: Entity | null;
  /** Straight-line hex distance to the chosen target (0 when null). */
  distance: number;
}

/**
 * Select the nearest living player-faction entity within aggro range from
 * `(eq, er)`. Returns null when no candidate is within range.
 */
export function selectNearestTarget(
  candidates: readonly Entity[],
  eq: number,
  er: number,
): PerceptionResult {
  let nearest: Entity | null = null;
  let nearestDist = AGGRO_RADIUS + 1;

  for (const t of candidates) {
    const th = t.get(HexPosition);
    if (!th) continue;
    const d = hexDistance(eq, er, th.q, th.r);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = t;
    }
  }

  return { target: nearest, distance: nearest ? nearestDist : 0 };
}

/**
 * Collect every living player-faction entity from the world.
 * Cached once per tick by the caller.
 */
export function gatherPlayerTargets(world: World): Entity[] {
  return world.query(FactionTrait, HexPosition, Health).filter((e) => {
    return e.get(FactionTrait)?.faction === 'player' && (e.get(Health)?.current ?? 0) > 0;
  });
}

/**
 * Build a quick id→Entity lookup from all Health-bearing entities.
 * Used to check whether a currently-tracked target is still alive.
 */
export function buildEntityIndex(world: World): Map<number, Entity> {
  const byId = new Map<number, Entity>();
  for (const e of world.query(Health)) byId.set(Number(e), e);
  return byId;
}

/**
 * Returns true when the entity referenced by `targetId` is still alive in
 * the provided index.
 */
export function isTargetAlive(byId: Map<number, Entity>, targetId: number): boolean {
  const e = byId.get(targetId);
  return !!e && (e.get(Health)?.current ?? 0) > 0;
}

/**
 * Run the full retarget pass for one enemy entity.
 *
 * Mutates `enemyTarget.targetId` in place. Returns true when a retarget was
 * performed (so the caller can deduct from the retarget budget). Returns
 * false when no retarget was needed (target still alive) or the budget was
 * exhausted.
 *
 * The `onNewTarget` callback receives the chosen Entity (or null) and should
 * set the yuka Vehicle's path accordingly.
 */
export function runPerception(opts: {
  byId: Map<number, Entity>;
  candidates: readonly Entity[];
  targetComp: { targetId: number };
  hexComp: { q: number; r: number };
  retargetsUsed: number;
  onNewTarget: (target: Entity | null, dist: number) => void;
}): boolean {
  const { byId, candidates, targetComp, hexComp, retargetsUsed, onNewTarget } = opts;

  // Target still alive — no retarget needed.
  if (isTargetAlive(byId, targetComp.targetId)) return false;

  // Budget exhausted — defer to next tick.
  if (retargetsUsed >= MAX_RETARGETS_PER_TICK) return false;

  const { target, distance } = selectNearestTarget(candidates, hexComp.q, hexComp.r);
  targetComp.targetId = target ? Number(target) : -1;
  onNewTarget(target, distance);
  return true;
}
