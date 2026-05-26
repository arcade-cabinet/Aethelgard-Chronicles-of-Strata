/**
 * M_FUN.MAP.PORTAL — primitive teleport mechanic.
 *
 * When a unit ARRIVES on a tile whose `portalTo` is set, the
 * pathFollowSystem snaps the unit to the destination tile, drops
 * the rest of its queued path, and stops movement. The unit
 * re-paths from the new location on the next AI/command tick.
 *
 * Disabled by default in v0.4 (no generator pass sets portalTo);
 * v0.5 wires the user's "quicksand → quicksand teleport" and
 * "mountain cave → cave network" designs once balance tuning
 * catches up. This test pins the runtime primitive so the v0.5
 * generator work has a stable contract to build on.
 */
import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import {
  Combatant,
  FactionTrait,
  HexPosition,
  Movement,
  PathQueue,
  Transform,
} from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { createEcsWorld } from '@/ecs/world';

function tileAt(q: number, r: number, overrides: Partial<Tile> = {}): Tile {
  return {
    q,
    r,
    type: 'GRASS',
    level: 0,
    moisture: 0.5,
    isCrossingLanding: false,
    walkable: true,
    ...overrides,
  };
}

function makeTiles(...rows: Tile[]): BoardData['tiles'] {
  const m = new Map<string, Tile>();
  for (const t of rows) m.set(`${t.q},${t.r}`, t);
  return m;
}

describe('portal teleport (M_FUN.MAP.PORTAL)', () => {
  it('arrival on a portal tile snaps the unit to portalTo', () => {
    const world = createEcsWorld();
    const portalA = tileAt(1, 0, { portalTo: '5,5', portalGroupId: 'g1' });
    const portalB = tileAt(5, 5, { portalTo: '1,0', portalGroupId: 'g1' });
    const tiles = makeTiles(tileAt(0, 0), portalA, portalB);
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 1, isMoving: false }),
      PathQueue({ steps: ['1,0,0', '2,0,0', '3,0,0'] }),
      Combatant({
        attackDamage: 10,
        attackRange: 1,
        attackCooldown: 1,
        attackTimer: 0,
        fatigue: 0,
        fatigueDecayTimer: 0,
      }),
    );
    // Advance enough for the unit to reach (1,0) — the portal.
    pathFollowSystem(world, 10, 1, tiles);
    const pos = entity.get(HexPosition);
    expect(pos?.q).toBe(5);
    expect(pos?.r).toBe(5);
    // Rest of the queued path is dropped — re-pathing happens next
    // tick from the new location.
    expect(entity.get(PathQueue)?.steps.length).toBe(0);
    expect(entity.get(Movement)?.isMoving).toBe(false);
  });

  it('non-portal arrival is unaffected', () => {
    const world = createEcsWorld();
    const tiles = makeTiles(tileAt(0, 0), tileAt(1, 0), tileAt(2, 0));
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 1, isMoving: false }),
      PathQueue({ steps: ['1,0,0', '2,0,0'] }),
    );
    // pathFollowSystem advances one path step per call (it snaps on
    // arrival but doesn't auto-recurse to the next step). Tick twice.
    pathFollowSystem(world, 10, 1, tiles);
    pathFollowSystem(world, 10, 1, tiles);
    expect(entity.get(HexPosition)?.q).toBe(2);
  });
});

describe('M_V8.PORTAL-STONE.COOLDOWN-HOOK — onPortalStoneArrival callback', () => {
  it('cooldown callback fires when unit teleports through a PORTAL_STONE tile', () => {
    const world = createEcsWorld();
    // PORTAL_STONE arrival tile with a portalTo destination.
    const portalStone = tileAt(1, 0, {
      type: 'PORTAL_STONE',
      portalTo: '5,5',
      portalGroupId: 'ps1',
    });
    const dest = tileAt(5, 5);
    const tiles = makeTiles(tileAt(0, 0), portalStone, dest);

    world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 1, isMoving: false }),
      PathQueue({ steps: ['1,0,0'] }),
      FactionTrait({ faction: 'player' }),
    );

    const calledWith: string[] = [];
    pathFollowSystem(world, 10, 1, tiles, (factionId) => calledWith.push(factionId));

    expect(calledWith).toEqual(['player']);
  });

  it('cooldown callback does NOT fire for non-PORTAL_STONE portal tiles', () => {
    const world = createEcsWorld();
    // A regular (GRASS-typed) portal — quicksand-pair / cave-network style.
    const regularPortal = tileAt(1, 0, {
      type: 'GRASS',
      portalTo: '5,5',
      portalGroupId: 'g2',
    });
    const dest = tileAt(5, 5);
    const tiles = makeTiles(tileAt(0, 0), regularPortal, dest);

    world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 1, isMoving: false }),
      PathQueue({ steps: ['1,0,0'] }),
      FactionTrait({ faction: 'player' }),
    );

    const calledWith: string[] = [];
    pathFollowSystem(world, 10, 1, tiles, (factionId) => calledWith.push(factionId));

    // Teleport happened (GRASS portal is still a valid portal) but no
    // PORTAL_STONE cooldown should fire.
    expect(calledWith).toEqual([]);
  });
});
