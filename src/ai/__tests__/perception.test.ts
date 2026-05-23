/**
 * AI perception layer regression (M_AUDIT2.ARCH.49).
 *
 * Pins selectNearestTarget + buildEntityIndex + isTargetAlive + the
 * MAX_RETARGETS_PER_TICK cap (consumed by ai-director).
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  buildEntityIndex,
  gatherPlayerTargets,
  isTargetAlive,
  MAX_RETARGETS_PER_TICK,
  selectNearestTarget,
} from '@/ai/perception';
import {
  type Faction,
  FactionTrait,
  Health,
  HexPosition,
} from '@/ecs/components';

function spawn(world: ReturnType<typeof createWorld>, faction: Faction, q: number, r: number, hp = 100) {
  return world.spawn(
    HexPosition({ q, r, level: 0 }),
    FactionTrait({ faction }),
    Health({ current: hp, max: hp }),
  );
}

describe('AI perception (M_AUDIT2.ARCH.49)', () => {
  it('MAX_RETARGETS_PER_TICK is a positive integer cap', () => {
    expect(MAX_RETARGETS_PER_TICK).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_RETARGETS_PER_TICK)).toBe(true);
  });

  it('selectNearestTarget returns null when candidates list is empty', () => {
    const result = selectNearestTarget([], 0, 0);
    expect(result.target).toBeNull();
    expect(result.distance).toBe(0);
  });

  it('selectNearestTarget picks the closest target', () => {
    const world = createWorld();
    const far = spawn(world, 'player', 5, 0);
    const near = spawn(world, 'player', 1, 0);
    const result = selectNearestTarget([far, near], 0, 0);
    expect(result.target).toBe(near);
    expect(result.distance).toBe(1);
  });

  it('selectNearestTarget filters out beyond AGGRO_RADIUS (10 default)', () => {
    const world = createWorld();
    const veryFar = spawn(world, 'player', 50, 0);
    const result = selectNearestTarget([veryFar], 0, 0);
    expect(result.target).toBeNull();
  });

  it('gatherPlayerTargets returns only player faction units with HP > 0', () => {
    const world = createWorld();
    spawn(world, 'player', 1, 0, 100);
    spawn(world, 'enemy', 2, 0, 100);
    spawn(world, 'player', 3, 0, 0); // dead, excluded
    const targets = gatherPlayerTargets(world);
    expect(targets.length).toBe(1);
  });

  it('isTargetAlive correctly reports HP > 0 vs dead', () => {
    const world = createWorld();
    const alive = spawn(world, 'player', 0, 0, 50);
    const dead = spawn(world, 'enemy', 0, 0, 0);
    const byId = buildEntityIndex(world);
    expect(isTargetAlive(byId, Number(alive))).toBe(true);
    expect(isTargetAlive(byId, Number(dead))).toBe(false);
    expect(isTargetAlive(byId, 999)).toBe(false); // unknown id
  });
});
