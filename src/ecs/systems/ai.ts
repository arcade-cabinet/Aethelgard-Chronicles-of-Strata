import type { Entity, World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { type NavGraph, findPath } from '@/core/pathfinding';
import { EnemyTarget, FactionTrait, Health, HexPosition, PathQueue } from '@/ecs/components';

/** Search radius (hex tiles) within which an enemy will pick a target. */
const AGGRO_RADIUS = 10;

/**
 * Enemy AI. Each enemy with no live target finds the nearest player-faction
 * entity within `AGGRO_RADIUS`, records it as its EnemyTarget, and is given an
 * A* path toward it. An enemy whose target died (or has none) retargets.
 */
export function aiSystem(world: World, board: BoardData, graph: NavGraph): void {
  const byId = new Map<number, Entity>();
  for (const e of world.query(Health)) byId.set(Number(e), e);

  // all living player-faction entities are candidate targets
  const targets = world.query(FactionTrait, HexPosition, Health).filter((e) => {
    return e.get(FactionTrait)?.faction === 'player' && (e.get(Health)?.current ?? 0) > 0;
  });

  world.query(FactionTrait, EnemyTarget, HexPosition, PathQueue).updateEach(([faction, target, hex, path]) => {
    if (faction.faction !== 'enemy') return;

    const current = byId.get(target.targetId);
    const currentAlive = current && (current.get(Health)?.current ?? 0) > 0;
    if (currentAlive) return; // keep hunting the live target

    // (re)select the nearest player entity within aggro range
    let nearest: Entity | null = null;
    let nearestDist = AGGRO_RADIUS + 1;
    for (const t of targets) {
      const th = t.get(HexPosition);
      if (!th) continue;
      const d = hexDistance(hex.q, hex.r, th.q, th.r);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }
    if (!nearest) {
      target.targetId = -1;
      return;
    }
    target.targetId = Number(nearest);
    const th = nearest.get(HexPosition);
    if (th) {
      const route = findPath(graph, getHexKey(hex.q, hex.r), getHexKey(th.q, th.r));
      if (route && route.length > 1) {
        path.steps = route.slice(1).map((k) => `${k},${board.tiles.get(k)?.level ?? 0}`);
      }
    }
  });
}
