import { describe, expect, it } from 'vitest';
import { FactionBase, FactionTrait, HexPosition, Transform, Unit } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import {
  type ZoneState,
  claimTile,
  createZoneState,
  isObserved,
  releaseTile,
  tileController,
  updateObserved,
} from '@/game/zone';

/** A small square of tile coords for vision tests. */
function tileGrid(radius: number): Array<{ q: number; r: number }> {
  const out: Array<{ q: number; r: number }> = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) out.push({ q, r });
  }
  return out;
}

describe('zone of control (M8.4z, spec 102)', () => {
  it('a fresh zone controls nothing and observes nothing', () => {
    const zone = createZoneState();
    expect(zone.controlled.size).toBe(0);
    expect(zone.observed.size).toBe(0);
  });

  it('claimTile / releaseTile manage the controlled set', () => {
    const zone = createZoneState();
    claimTile(zone, '2,3');
    expect(zone.controlled.has('2,3')).toBe(true);
    releaseTile(zone, '2,3');
    expect(zone.controlled.has('2,3')).toBe(false);
  });

  it('tileController reports which faction holds a tile', () => {
    const zones: Record<'player' | 'enemy', ZoneState> = {
      player: createZoneState(),
      enemy: createZoneState(),
    };
    claimTile(zones.player, '1,1');
    claimTile(zones.enemy, '9,9');
    expect(tileController(zones, '1,1')).toBe('player');
    expect(tileController(zones, '9,9')).toBe('enemy');
    expect(tileController(zones, '5,5')).toBeNull();
  });

  it('updateObserved fills the observed set from a base vision circle', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'player' }), HexPosition({ q: 0, r: 0, level: 1 }));
    const zone = createZoneState();
    updateObserved(zone, world, 'player', tileGrid(10));
    expect(isObserved(zone, '0,0')).toBe(true);
    expect(isObserved(zone, '1,0')).toBe(true);
    expect(isObserved(zone, '10,0')).toBe(false);
  });

  it('observed is recomputed each tick — not monotonic like fog', () => {
    const world = createEcsWorld();
    const unit = world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    );
    const zone = createZoneState();
    updateObserved(zone, world, 'player', tileGrid(10));
    const before = [...zone.observed];
    expect(before.length).toBeGreaterThan(0);
    // move the unit away — the previously observed tiles are no longer observed
    unit.set(HexPosition, { q: 30, r: 30, level: 1 });
    updateObserved(zone, world, 'player', tileGrid(10));
    for (const key of before) {
      expect(zone.observed.has(key)).toBe(false);
    }
  });

  it('a wider vision radius (higher difficulty) observes more', () => {
    const world = createEcsWorld();
    world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    );
    const narrow = createZoneState();
    updateObserved(narrow, world, 'player', tileGrid(12), 3);
    const wide = createZoneState();
    updateObserved(wide, world, 'player', tileGrid(12), 9);
    expect(wide.observed.size).toBeGreaterThan(narrow.observed.size);
  });

  it('control and observation are independent', () => {
    // a faction can control a tile it does not currently observe
    const zone = createZoneState();
    claimTile(zone, '4,4');
    expect(zone.controlled.has('4,4')).toBe(true);
    expect(isObserved(zone, '4,4')).toBe(false);
  });
});
