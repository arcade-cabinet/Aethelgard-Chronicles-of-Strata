import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey, hexNeighbors } from '@/core/hex';
import { type NavGraph, findPath } from '@/core/pathfinding';
import {
  AssignedJob,
  Carrier,
  type Faction,
  FactionTrait,
  HexPosition,
  PathQueue,
  ResourceTrait,
  Unit,
} from '@/ecs/components';
import { type PeonView, type ResourceSite, nextPeonAction } from '@/rules';
import { type ZoneState, claimTile } from '@/game/zone';

/** Encode a path of tile keys into "q,r,level" steps using board elevation. */
function leveledSteps(board: BoardData, path: string[]): string[] {
  return path.map((key) => `${key},${board.tiles.get(key)?.level ?? 0}`);
}

/**
 * Find a path ending on a walkable tile adjacent to `targetKey` — a peon stands
 * *next to* a resource or base, never on it. Returns null if none is reachable.
 */
function pathToAdjacent(graph: NavGraph, startKey: string, targetKey: string): string[] | null {
  const [tq, tr] = targetKey.split(',').map(Number);
  let best: string[] | null = null;
  for (const adj of hexNeighbors(tq ?? 0, tr ?? 0)) {
    if (!graph.has(adj)) continue;
    if (adj === startKey) return [];
    const route = findPath(graph, startKey, adj);
    if (route && (best === null || route.length < best.length)) best = route.slice(1);
  }
  return best;
}

/** Per-faction inputs the peon routing needs. */
export interface PeonRoutingContext {
  world: World;
  board: BoardData;
  graph: NavGraph;
  /** Each faction's base tile key — the deposit anchor. */
  baseKeys: Record<Faction, string>;
  /** Each faction's zone — claimed tiles grow as peons exploit resources. */
  zones: Record<Faction, ZoneState>;
}

/**
 * Route every peon's autonomous job (spec 101). Peons are mindless brutes on
 * BOTH factions: each peon's next action is decided by `rules.nextPeonAction`
 * from the faction's own view of the world, and applied here. When a peon
 * harvests a tile, that tile is **claimed** for its faction's zone of control
 * (spec 102) — peon exploitation is how territory grows.
 */
export function jobRoutingSystem(ctx: PeonRoutingContext): void {
  const { world, board, graph, baseKeys, zones } = ctx;

  // index live resource sites (amount > 0) once
  const allResources: ResourceSite[] = [];
  for (const node of world.query(ResourceTrait, HexPosition)) {
    const res = node.get(ResourceTrait);
    const hex = node.get(HexPosition);
    if (res && hex && res.amount > 0) {
      allResources.push({ key: getHexKey(hex.q, hex.r), q: hex.q, r: hex.r });
    }
  }

  world
    .query(Unit, AssignedJob, HexPosition, PathQueue, Carrier, FactionTrait)
    .updateEach(([unit, job, hex, path, carrier], e) => {
      if (unit.unitType !== 'Peon') return;
      const faction = e.get(FactionTrait)?.faction;
      if (!faction) return;

      const peonKey = getHexKey(hex.q, hex.r);
      const view: PeonView = {
        state: job.state,
        q: hex.q,
        r: hex.r,
        targetKey: job.targetKey,
        carrying: carrier.carryType !== 'none',
      };
      const action = nextPeonAction(view, {
        resources: allResources,
        baseKey: baseKeys[faction],
        // pulsing tiles on the faction's own zone are under encroachment —
        // peons flee them (spec 102, wired by the encroachmentSystem)
        threatenedTiles: new Set(zones[faction].pulsing.keys()),
      });

      switch (action.kind) {
        case 'seek': {
          job.state = 'SEEKING';
          job.targetKey = action.targetKey;
          if (path.steps.length === 0) {
            const route = pathToAdjacent(graph, peonKey, action.targetKey);
            if (route) path.steps = leveledSteps(board, route);
            else {
              job.state = 'IDLE';
              job.targetKey = '';
            }
          }
          break;
        }
        case 'harvest': {
          job.state = 'HARVESTING';
          path.steps = [];
          // exploiting a tile claims it for this faction's zone of control
          claimTile(zones[faction], job.targetKey);
          break;
        }
        case 'carry-home': {
          job.state = 'CARRYING';
          if (path.steps.length === 0) {
            const route = pathToAdjacent(graph, peonKey, baseKeys[faction]);
            if (route) path.steps = leveledSteps(board, route);
          }
          break;
        }
        case 'deposit':
          job.state = 'CARRYING'; // depositSystem completes the deposit when adjacent
          break;
        case 'flee': {
          // nonviolent peon abandons a contested tile — head home. Clear the
          // stale path FIRST so any in-flight movement is dropped before the
          // new home route replaces it.
          job.state = 'SEEKING';
          job.targetKey = '';
          path.steps = [];
          const route = pathToAdjacent(graph, peonKey, baseKeys[faction]);
          if (route) path.steps = leveledSteps(board, route);
          break;
        }
        case 'idle':
          job.state = 'IDLE';
          job.targetKey = '';
          // clear any stale path — an idle peon must not keep walking
          path.steps = [];
          break;
      }
    });
}
