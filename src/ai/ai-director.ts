/**
 * AiDirector — yuka EntityManager lifecycle + per-tick sync.
 *
 * Maintains a mapping from koota entity id → yuka Vehicle. Each tick:
 *
 *  1. SYNC     — copy koota HexPosition into the Vehicle's world-space position.
 *  2. PERCEIVE — run the perception layer (retargeting, path requests via A*).
 *  3. STEP     — EntityManager.update(delta) runs SteeringManager on each Vehicle.
 *  4. WRITE-BACK — copy Vehicle.position back into koota Transform + HexPosition.
 *
 * The HexPosition write-back is a rounded snap: the Vehicle's continuous
 * world-space position is converted back to the nearest hex axial coord and
 * written so that downstream systems (pathFollow, combat) always see a valid
 * hex key. The Transform is updated with the raw world-space position for the
 * renderer.
 *
 * koota remains the single source of truth — the ECS components are always
 * authoritative; yuka only provides the steering force that moves the vehicle
 * between ticks.
 */

import type { World } from 'koota';
import type { ArriveBehavior, FollowPathBehavior, Vehicle } from 'yuka';
import { EntityManager } from 'yuka';
import type { BoardData } from '@/core/board';
import { axialToWorld, getHexKey } from '@/core/hex';
import { findPath, type NavGraph } from '@/core/pathfinding';
import { makeMoveCostFn } from '@/core/terrain-cost';
import { EnemyTarget, FactionTrait, HexPosition, PathQueue, Transform } from '@/ecs/components';
import {
  buildEntityIndex,
  gatherPlayerTargets,
  isTargetAlive,
  MAX_RETARGETS_PER_TICK,
  selectNearestTarget,
} from './perception';
import { setArriveTarget, updatePath } from './steering';
import { createVehicle } from './vehicle-factory';

interface EnemyRecord {
  vehicle: Vehicle;
  entityId: number;
}

/**
 * Singleton director — one per game session. Destroyed and re-created on
 * game restart via `reset()`.
 */
export class AiDirector {
  private readonly em: EntityManager = new EntityManager();
  /** Maps koota entity numeric id → yuka Vehicle record. */
  private readonly vehicles = new Map<number, EnemyRecord>();

  /**
   * Run the full AI tick for all enemy entities in the world.
   *
   * @param world   - The koota ECS world.
   * @param board   - Board data (for level look-up during write-back).
   * @param graph   - Pre-built A* nav graph.
   * @param delta   - Time step in seconds (matches the economy tick delta).
   */
  tick(world: World, board: BoardData, graph: NavGraph, delta: number): void {
    // --- BUILD ENTITY / TARGET INDEX ----------------------------------------
    const byId = buildEntityIndex(world);
    const candidates = gatherPlayerTargets(world);

    // --- GATHER ACTIVE ENEMY ENTITIES ----------------------------------------
    // M_V8.DIFFICULTY-MULTIPLIER.N-PLAYER — include all non-player factions
    // (ai-2, ai-3, barbarian-camp-*, etc.) so N-player AI units get steering.
    const enemies = world.query(FactionTrait, EnemyTarget, HexPosition, PathQueue).filter((e) => {
      return e.get(FactionTrait)?.faction !== 'player';
    });

    // Remove stale Vehicles (enemies that died / were removed from the world).
    // Use the active enemy set (not byId which requires Health) to detect removal.
    const activeEnemyIds = new Set(enemies.map((e) => Number(e)));
    for (const [id, record] of this.vehicles) {
      if (!activeEnemyIds.has(id)) {
        this.em.remove(record.vehicle);
        this.vehicles.delete(id);
      }
    }

    let retargets = 0;

    // --- PER-ENEMY SYNC + PERCEIVE -------------------------------------------
    for (const e of enemies) {
      const id = Number(e);
      const hexComp = e.get(HexPosition);
      const targetComp = e.get(EnemyTarget);
      const pathComp = e.get(PathQueue);
      if (!hexComp || !targetComp || !pathComp) continue;

      // 1. Ensure a Vehicle exists for this enemy.
      if (!this.vehicles.has(id)) {
        const { x, z } = axialToWorld(hexComp.q, hexComp.r);
        const vehicle = createVehicle(x, z);
        this.em.add(vehicle);
        this.vehicles.set(id, { vehicle, entityId: id });
      }

      const record = this.vehicles.get(id);
      if (!record) continue;
      const { vehicle } = record;

      // 2. SYNC — push koota hex position into the yuka Vehicle.
      const { x: wx, z: wz } = axialToWorld(hexComp.q, hexComp.r);
      vehicle.position.set(wx, 0, wz);

      // 3. PERCEIVE — retarget if needed (rate-limited).
      const targetAlive = isTargetAlive(byId, targetComp.targetId);
      if (!targetAlive && retargets < MAX_RETARGETS_PER_TICK) {
        retargets++;
        const { target } = selectNearestTarget(candidates, hexComp.q, hexComp.r);
        // Use e.set() for koota write-back (direct mutation of the get() proxy
        // does not persist in struct-of-arrays storage).
        e.set(EnemyTarget, { targetId: target ? Number(target) : -1 });

        const followPath = vehicle.steering.behaviors[0] as FollowPathBehavior | undefined;
        const arriveBehavior = vehicle.steering.behaviors[1] as ArriveBehavior | undefined;

        if (!target) {
          // No target in aggro range — deactivate both behaviors so the
          // vehicle stays still (avoids squaredDistanceTo on an empty path).
          if (followPath) followPath.active = false;
          if (arriveBehavior) arriveBehavior.active = false;
        } else {
          const th = target.get(HexPosition);
          if (th) {
            // M_POLISH2.RTS.24a — terrain-aware AI movement.
            const route = findPath(
              graph,
              getHexKey(hexComp.q, hexComp.r),
              getHexKey(th.q, th.r),
              makeMoveCostFn(board.tiles),
            );
            if (route && route.length > 1) {
              // Update PathQueue (used by pathFollow system).
              const newSteps = route.slice(1).map((k) => `${k},${board.tiles.get(k)?.level ?? 0}`);
              e.set(PathQueue, { steps: newSteps });

              // Update yuka path (activates FollowPathBehavior).
              if (followPath) updatePath(followPath, route);
            } else if (followPath) {
              // Adjacent or unreachable — deactivate path following, use Arrive only.
              followPath.active = false;
            }
            // Point the ArriveBehavior at the target's hex (activates it).
            if (arriveBehavior) setArriveTarget(arriveBehavior, th.q, th.r);
          }
        }
      }
    }

    // 4. STEP — run yuka steering for all Vehicles.
    this.em.update(delta);

    // 5. WRITE-BACK — copy Vehicle positions back into koota components.
    for (const e of enemies) {
      const id = Number(e);
      const record = this.vehicles.get(id);
      if (!record) continue;

      const hexComp = e.get(HexPosition);
      if (!hexComp) continue;

      const { vehicle } = record;
      const vpos = vehicle.position;

      // Write raw world-space position to Transform so the renderer can
      // interpolate smooth movement between hex snaps.
      // Guard: entity may not have Transform (headless / test worlds).
      if (e.has(Transform)) {
        e.set(Transform, {
          x: vpos.x,
          y: hexComp.level * 0.5, // Y is driven by level; yuka works in XZ
          z: vpos.z,
          rotationY: 0,
        });
      }
      // HexPosition is NOT written back here — the pathFollow system owns
      // the hex-grid position update. yuka steering smooths the Transform
      // only; koota's hex-grid position snaps happen in pathFollowSystem.
    }
  }

  /**
   * Remove all Vehicles and clear state. Call before a game restart.
   */
  reset(): void {
    for (const record of this.vehicles.values()) {
      this.em.remove(record.vehicle);
    }
    this.vehicles.clear();
  }

  /** Expose the vehicle map for testing. */
  get vehicleCount(): number {
    return this.vehicles.size;
  }

  /** Returns the Vehicle for a given koota entity id (for tests). */
  getVehicle(entityId: number): Vehicle | undefined {
    return this.vehicles.get(entityId)?.vehicle;
  }
}
