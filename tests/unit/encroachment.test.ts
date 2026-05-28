import { describe, expect, it } from 'vitest';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { encroachmentSystem } from '@/ecs/systems/hazards';
import { createEcsWorld } from '@/ecs/world';
import { claimTile, createZoneState } from '@/game/zone';

/** Build the per-faction zones with the player owning `tileKey`. */
function zonesWithPlayerHolding(tileKey: string) {
  const z = { player: createZoneState(), enemy: createZoneState() };
  claimTile(z.player, tileKey);
  return z;
}

describe('encroachment system (M8.6e, spec 102)', () => {
  it('an enemy military unit on a player tile starts a pulse', () => {
    const world = createEcsWorld();
    const zones = zonesWithPlayerHolding('3,0');
    world.spawn(
      Unit({ unitType: 'Goblin' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    encroachmentSystem(world, zones, 1, 'normal');
    expect(zones.player.pulsing.has('3,0')).toBe(true);
    // tile is still controlled — the pulse hasn't expired yet
    expect(zones.player.controlled.has('3,0')).toBe(true);
  });

  it('a player military unit on the same tile cancels the pulse', () => {
    const world = createEcsWorld();
    const zones = zonesWithPlayerHolding('3,0');
    world.spawn(
      Unit({ unitType: 'Goblin' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    // a defending player Footman on the same tile
    world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    encroachmentSystem(world, zones, 1, 'normal');
    expect(zones.player.pulsing.has('3,0')).toBe(false);
    expect(zones.player.controlled.has('3,0')).toBe(true);
  });

  it('an unanswered pulse past the grace window flips the tile', () => {
    const world = createEcsWorld();
    const zones = zonesWithPlayerHolding('3,0');
    world.spawn(
      Unit({ unitType: 'Goblin' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    // hard difficulty: grace = 4s. Tick 5 seconds with no defence.
    encroachmentSystem(world, zones, 5, 'hard');
    expect(zones.player.controlled.has('3,0')).toBe(false);
    expect(zones.enemy.controlled.has('3,0')).toBe(true);
    expect(zones.player.pulsing.has('3,0')).toBe(false);
  });

  it('a peon (nonviolent) on a player tile does NOT encroach', () => {
    const world = createEcsWorld();
    const zones = zonesWithPlayerHolding('3,0');
    world.spawn(
      Unit({ unitType: 'Peon' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    encroachmentSystem(world, zones, 5, 'hard');
    expect(zones.player.pulsing.has('3,0')).toBe(false);
    expect(zones.player.controlled.has('3,0')).toBe(true);
  });

  it('difficulty scales the grace window — easy allows a long pulse', () => {
    const world = createEcsWorld();
    const zones = zonesWithPlayerHolding('3,0');
    world.spawn(
      Unit({ unitType: 'Goblin' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 3, r: 0, level: 1 }),
    );
    // easy: grace = 12s. A 5-second pulse does not flip.
    encroachmentSystem(world, zones, 5, 'easy');
    expect(zones.player.controlled.has('3,0')).toBe(true);
    expect(zones.player.pulsing.get('3,0')).toBe(5);
  });
});
