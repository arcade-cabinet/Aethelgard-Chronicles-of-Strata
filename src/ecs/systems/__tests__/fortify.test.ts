/**
 * M_FUN.MAP.FORTIFY — same-faction Wall/Watchtower adjacent to a
 * MOUNTAIN_PASS tile suppresses the fatigue debuff for units
 * crossing it. Realises the "fortifiable choke" contract.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import {
  Building,
  Combatant,
  FactionTrait,
  HexPosition,
  Movement,
  PathQueue,
  Transform,
  Unit,
} from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';

// Coderabbit MAJOR PR #10 05:46Z — proper Tile-typed stub so the
// pathFollowSystem call no longer needs `as never`.
function tile(q: number, r: number, type: Tile['type'], level: number): Tile {
  return { q, r, type, walkable: true, level, moisture: 0.5, isCrossingLanding: false };
}
function makeStubBoard(): BoardData['tiles'] {
  const tiles = new Map<string, Tile>();
  tiles.set('0,0', tile(0, 0, 'GRASS', 2));
  tiles.set('1,0', tile(1, 0, 'MOUNTAIN_PASS', 3));
  return tiles;
}

function makeFootman(world: ReturnType<typeof createWorld>, faction: 'player' | 'enemy') {
  return world.spawn(
    HexPosition({ q: 0, r: 0, level: 2 }),
    Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    Unit({ unitType: 'Footman' }),
    FactionTrait({ faction }),
    Movement({ speed: 999, isMoving: true }),
    PathQueue({ steps: ['1,0'] }),
    Combatant({
      attackDamage: 15,
      attackRange: 1,
      attackCooldown: 1,
      attackTimer: 0,
      fatigue: 0,
      fatigueDecayTimer: 0,
    }),
  );
}

describe('M_FUN.MAP.FORTIFY — fatigue suppression near friendly Wall/Watchtower', () => {
  it('a bare PASS crossing accrues fatigue', () => {
    const world = createWorld();
    const tiles = makeStubBoard();
    const f = makeFootman(world, 'player');
    // Drain the move in one big delta so the arrival branch fires.
    pathFollowSystem(world, 10, 1.0, tiles);
    const c = f.get(Combatant);
    expect(c?.fatigue ?? 0).toBeGreaterThan(0);
  });

  it('a same-faction Watchtower adjacent to the PASS suppresses fatigue', () => {
    const world = createWorld();
    const tiles = makeStubBoard();
    // Watchtower at (2, 0) — adjacent to the PASS at (1, 0).
    world.spawn(
      HexPosition({ q: 2, r: 0, level: 3 }),
      Building({ buildingType: 'Watchtower', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'player' }),
    );
    const f = makeFootman(world, 'player');
    pathFollowSystem(world, 10, 1.0, tiles);
    const c = f.get(Combatant);
    expect(c?.fatigue ?? 0).toBe(0);
  });

  it('an ENEMY-faction Wall adjacent to the PASS does NOT suppress player fatigue', () => {
    const world = createWorld();
    const tiles = makeStubBoard();
    world.spawn(
      HexPosition({ q: 2, r: 0, level: 3 }),
      Building({ buildingType: 'Wall', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'enemy' }),
    );
    const f = makeFootman(world, 'player');
    pathFollowSystem(world, 10, 1.0, tiles);
    const c = f.get(Combatant);
    expect(c?.fatigue ?? 0).toBeGreaterThan(0);
  });
});
