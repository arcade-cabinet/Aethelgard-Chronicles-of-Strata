/**
 * Zone state regression (M_AUDIT2.ARCH.44).
 *
 * Pins the generation counter (M_MICRO.5.2 — bumps only on actual
 * change), claim/release semantics, isObserved gate, and
 * tileController dispatch.
 */
import { describe, expect, it } from 'vitest';
import { claimTile, createZoneState, isObserved, releaseTile, tileController } from '@/game/zone';

describe('zone state', () => {
  it('createZoneState starts empty with generation=0', () => {
    const z = createZoneState();
    expect(z.controlled.size).toBe(0);
    expect(z.observed.size).toBe(0);
    expect(z.pulsing.size).toBe(0);
    expect(z.generation).toBe(0);
  });

  it('claimTile adds and bumps generation', () => {
    const z = createZoneState();
    claimTile(z, '1,2');
    expect(z.controlled.has('1,2')).toBe(true);
    expect(z.generation).toBe(1);
  });

  it('claimTile is idempotent (no generation bump on duplicate)', () => {
    const z = createZoneState();
    claimTile(z, '1,2');
    claimTile(z, '1,2');
    expect(z.generation).toBe(1);
  });

  it('releaseTile removes and bumps generation', () => {
    const z = createZoneState();
    claimTile(z, '3,4');
    releaseTile(z, '3,4');
    expect(z.controlled.has('3,4')).toBe(false);
    expect(z.generation).toBe(2);
  });

  it('releaseTile is a no-op when tile is not controlled', () => {
    const z = createZoneState();
    releaseTile(z, '5,6');
    expect(z.generation).toBe(0);
  });

  it('isObserved returns true only when key is in observed set', () => {
    const z = createZoneState();
    z.observed.add('1,1');
    expect(isObserved(z, '1,1')).toBe(true);
    expect(isObserved(z, '2,2')).toBe(false);
  });

  it('tileController returns null when neither faction owns the tile', () => {
    const zones = { player: createZoneState(), enemy: createZoneState() };
    expect(tileController(zones, '0,0')).toBe(null);
  });

  it('tileController returns the owning faction', () => {
    const zones = { player: createZoneState(), enemy: createZoneState() };
    claimTile(zones.player, '1,0');
    claimTile(zones.enemy, '0,1');
    expect(tileController(zones, '1,0')).toBe('player');
    expect(tileController(zones, '0,1')).toBe('enemy');
  });
});
