/**
 * Stance behavior system (M_POLISH2.RTS.16).
 *
 * Runs after `aiSystem` (enemy targeting) and before `pathFollowSystem`.
 * Handles target selection and movement intent for PLAYER military units
 * based on their current stance mode.
 *
 * Four stances:
 *
 *   aggressive   — chases any visible enemy within AGGRESSIVE_CHASE_RADIUS
 *                  hexes of the unit's commanded tile. Acquires the nearest
 *                  target in that radius and paths toward it.
 *
 *   defensive    — DEFAULT. Engages enemies within attackRange. After an
 *                  enemy dies (EnemyTarget becomes -1) and no adjacent enemy
 *                  exists, clears the PathQueue and returns to the commanded
 *                  tile (paths back home).
 *
 *   hold-position — Never moves. Only acquires a target if an enemy is
 *                  within attackRange (≤ 1 hex). PathQueue is never touched.
 *
 *   stand-ground — Attacks enemies within attackRange but never moves toward
 *                  a target. PathQueue is cleared if a path was queued by
 *                  an external order; targets in range are locked in.
 *
 * This system READS EnemyTarget and WRITES it (target acquisition for player
 * units). The combatSystem continues to drain attacks; pathFollowSystem
 * continues to move units along PathQueue.
 *
 * The system only processes PLAYER-faction units with the Stance trait. Enemy
 * units are handled by the yuka AiDirector (src/ai/).
 */

import type { World } from 'koota';
import { hexDistance } from '@/core/hex';
import { findPath, type NavGraph } from '@/core/pathfinding';
import {
  Combatant,
  CommandedTile,
  EnemyTarget,
  FactionTrait,
  Health,
  HexPosition,
  PathQueue,
  Stance,
  Unit,
} from '@/ecs/components';
import { MILITARY_ROLES } from '@/rules/unit-profiles';

/** How many hexes from the commanded tile an aggressive unit will chase. */
const AGGRESSIVE_CHASE_RADIUS = 8;

/** How many hexes from the commanded tile a defensive unit will engage. */
const DEFENSIVE_ENGAGE_RADIUS = 4;

/**
 * Run stance-driven target selection and movement for all player military units.
 *
 * @param world  - The koota ECS world.
 * @param graph  - Pre-built A* navigation graph (for return-to-home pathing).
 */
export function stanceBehaviorSystem(
  world: World,
  graph: NavGraph,
  /**
   * M_POLISH2.RTS.24a — optional per-tile move cost. When provided,
   * A* picks the cheapest route (FOREST/HIGHLAND-aware) instead of
   * the shortest-by-distance route.
   */
  costOf?: (key: string) => number,
): void {
  // Build an id → entity index for enemy health checks (identical pattern to
  // combatSystem). Rebuilt each tick so dead entities don't linger.
  const byId = new Map<number, ReturnType<World['query']>[number]>();
  for (const e of world.query(Health)) byId.set(Number(e), e);

  // Collect all living enemy entities for target scanning.
  const enemies = world.query(FactionTrait, HexPosition, Health, Unit).filter((e) => {
    const faction = e.get(FactionTrait)?.faction;
    const hp = e.get(Health)?.current ?? 0;
    const role = e.get(Unit)?.unitType;
    return faction === 'enemy' && hp > 0 && role && MILITARY_ROLES.has(role);
  });

  // Process every player military unit with a Stance trait.
  for (const e of world.query(Stance, FactionTrait, HexPosition, EnemyTarget, Combatant)) {
    const faction = e.get(FactionTrait)?.faction;
    if (faction !== 'player') continue;

    const unitType = e.get(Unit)?.unitType;
    if (!unitType || !MILITARY_ROLES.has(unitType)) continue;

    const stanceTrait = e.get(Stance);
    const hex = e.get(HexPosition);
    const targetComp = e.get(EnemyTarget);
    const combatant = e.get(Combatant);
    const commandedTile = e.get(CommandedTile);

    if (!stanceTrait || !hex || !targetComp || !combatant) continue;

    const mode = stanceTrait.mode;
    const attackRange = combatant.attackRange;

    // Check whether the current target is still alive.
    const currentTargetAlive =
      targetComp.targetId !== -1 && (byId.get(targetComp.targetId)?.get(Health)?.current ?? 0) > 0;

    if (mode === 'hold-position') {
      // Never moves. Only acquire a target that is already within attackRange.
      if (!currentTargetAlive) {
        // Scan for an adjacent enemy (distance <= attackRange).
        const adjacent = enemies.find((enemy) => {
          const eh = enemy.get(HexPosition);
          return eh && hexDistance(hex.q, hex.r, eh.q, eh.r) <= attackRange;
        });
        e.set(EnemyTarget, { targetId: adjacent ? Number(adjacent) : -1 });
      }
      // Never modify PathQueue — hold-position never paths anywhere.
      continue;
    }

    if (mode === 'stand-ground') {
      // Attacks enemies within attackRange but does NOT move toward targets.
      // If already moving (PathQueue non-empty from a player move command),
      // let that resolve — we only prevent autonomous pursuit movement.
      if (!currentTargetAlive) {
        const inRange = enemies.find((enemy) => {
          const eh = enemy.get(HexPosition);
          return eh && hexDistance(hex.q, hex.r, eh.q, eh.r) <= attackRange;
        });
        e.set(EnemyTarget, { targetId: inRange ? Number(inRange) : -1 });
      }
      // Do NOT queue any autonomous movement paths — stand-ground stays put.
      continue;
    }

    if (mode === 'aggressive') {
      // Chase any enemy within AGGRESSIVE_CHASE_RADIUS of the commanded tile.
      const homeQ = commandedTile?.q ?? hex.q;
      const homeR = commandedTile?.r ?? hex.r;

      if (!currentTargetAlive) {
        // Find the nearest enemy within the aggressive chase radius from home.
        let nearest: (typeof enemies)[number] | null = null;
        let nearestDist = Number.MAX_SAFE_INTEGER;
        for (const enemy of enemies) {
          const eh = enemy.get(HexPosition);
          if (!eh) continue;
          const distFromHome = hexDistance(homeQ, homeR, eh.q, eh.r);
          if (distFromHome <= AGGRESSIVE_CHASE_RADIUS) {
            const distFromSelf = hexDistance(hex.q, hex.r, eh.q, eh.r);
            if (distFromSelf < nearestDist) {
              nearestDist = distFromSelf;
              nearest = enemy;
            }
          }
        }
        e.set(EnemyTarget, { targetId: nearest ? Number(nearest) : -1 });

        // Queue a path toward the new target so pathFollowSystem moves the unit.
        if (nearest) {
          const nh = nearest.get(HexPosition);
          if (nh) {
            const startKey = `${hex.q},${hex.r}`;
            const endKey = `${nh.q},${nh.r}`;
            const route = findPath(graph, startKey, endKey, costOf);
            if (route && route.length > 1) {
              // Steps are tile keys; pathFollowSystem handles level look-up.
              e.set(PathQueue, { steps: route.slice(1) });
            }
          }
        }
      }
      continue;
    }

    if (mode === 'defensive') {
      // Engage enemies within DEFENSIVE_ENGAGE_RADIUS of the commanded tile;
      // return to the commanded tile when no enemy is close.
      const homeQ = commandedTile?.q ?? hex.q;
      const homeR = commandedTile?.r ?? hex.r;

      if (!currentTargetAlive) {
        // Find the nearest enemy within the defensive engage radius from home.
        let nearest: (typeof enemies)[number] | null = null;
        let nearestDist = Number.MAX_SAFE_INTEGER;
        for (const enemy of enemies) {
          const eh = enemy.get(HexPosition);
          if (!eh) continue;
          const distFromHome = hexDistance(homeQ, homeR, eh.q, eh.r);
          if (distFromHome <= DEFENSIVE_ENGAGE_RADIUS) {
            const distFromSelf = hexDistance(hex.q, hex.r, eh.q, eh.r);
            if (distFromSelf < nearestDist) {
              nearestDist = distFromSelf;
              nearest = enemy;
            }
          }
        }
        e.set(EnemyTarget, { targetId: nearest ? Number(nearest) : -1 });

        if (nearest) {
          // Path toward the nearby threat.
          const nh = nearest.get(HexPosition);
          if (nh) {
            const startKey = `${hex.q},${hex.r}`;
            const endKey = `${nh.q},${nh.r}`;
            const route = findPath(graph, startKey, endKey, costOf);
            if (route && route.length > 1) {
              e.set(PathQueue, { steps: route.slice(1) });
            }
          }
        } else {
          // No nearby threat — return to the commanded tile if not already there.
          const distFromHome = hexDistance(hex.q, hex.r, homeQ, homeR);
          if (distFromHome > 0) {
            const startKey = `${hex.q},${hex.r}`;
            const homeKey = `${homeQ},${homeR}`;
            const route = findPath(graph, startKey, homeKey, costOf);
            if (route && route.length > 1) {
              e.set(PathQueue, { steps: route.slice(1) });
            }
          }
        }
      }
    }
  }
}
