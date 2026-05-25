/**
 * M_V7.MYTH.EFFECTS — per-dispatcher effect tests.
 *
 * Resolves MED-5 from docs/reviews/v0.7-cycle-opening.md. v0.6 left
 * the runtime with only `applyHarvestFestival` of the 5 declared
 * events; meteor / eclipse / migration / oracle had JSON config but
 * no dispatcher. v0.7 adds them — pure helpers callable from
 * tickClockPhase when game.mythEvents.active matches.
 *
 * Also pins LOW-3: fireMythEvent rejects unknown event ids instead
 * of throwing.
 */
import { describe, expect, it } from 'vitest';
import {
  applyMeteorStrike,
  applyMigrationReward,
  createMythEventsState,
  eclipseVisionMultiplier,
  fireMythEvent,
  pickMigrationTile,
  pickOracleVision,
} from '@/game/myth-events';
import { createEconomy } from '@/game/economy';

describe('fireMythEvent — unknown id guard (LOW-3)', () => {
  it('returns null on unknown id without throwing', () => {
    const state = createMythEventsState();
    expect(fireMythEvent(state, 'totally-fake-event', 100)).toBeNull();
    expect(state.lastFireSeconds).toBe(-1); // unchanged
    expect(state.active).toBeNull();
  });
});

describe('applyMeteorStrike', () => {
  it('mutates wildfires + damages every entity at the tile by 30 HP', () => {
    const wildfires = new Map<string, { burnTicksRemaining: number; secondsSinceTick: number }>();
    const h1 = { current: 50, max: 50 };
    const h2 = { current: 20, max: 50 };
    applyMeteorStrike({
      q: 3,
      r: -2,
      damagedEntityHealth: [h1, h2],
      wildfires,
      burnTicks: 10,
    });
    expect(wildfires.get('3,-2')?.burnTicksRemaining).toBe(10);
    expect(h1.current).toBe(20); // 50 - 30
    expect(h2.current).toBe(0); // 20 - 30 clamped
  });

  it('overwrites an existing wildfire entry at the same tile', () => {
    const wildfires = new Map<string, { burnTicksRemaining: number; secondsSinceTick: number }>();
    wildfires.set('0,0', { burnTicksRemaining: 5, secondsSinceTick: 2 });
    applyMeteorStrike({
      q: 0,
      r: 0,
      damagedEntityHealth: [],
      wildfires,
      burnTicks: 15,
    });
    expect(wildfires.get('0,0')?.burnTicksRemaining).toBe(15);
    expect(wildfires.get('0,0')?.secondsSinceTick).toBe(0);
  });
});

describe('eclipseVisionMultiplier', () => {
  it('returns 1.0 when no event active', () => {
    expect(eclipseVisionMultiplier(createMythEventsState(), 100)).toBe(1.0);
  });
  it('returns 0.5 during an active solar-eclipse', () => {
    const state = createMythEventsState();
    fireMythEvent(state, 'solar-eclipse', 100);
    expect(eclipseVisionMultiplier(state, 130)).toBe(0.5); // 30s in, eclipse runs 60s
  });
  it('returns 1.0 when active event is not the eclipse', () => {
    const state = createMythEventsState();
    fireMythEvent(state, 'wildlife-migration', 100);
    expect(eclipseVisionMultiplier(state, 130)).toBe(1.0);
  });
  it('returns 1.0 after the eclipse expires', () => {
    const state = createMythEventsState();
    fireMythEvent(state, 'solar-eclipse', 100); // expires at 160
    expect(eclipseVisionMultiplier(state, 200)).toBe(1.0);
  });
});

describe('applyMigrationReward', () => {
  it('+20 food on a clearing faction economy', () => {
    const eco = createEconomy();
    eco.food = 5;
    applyMigrationReward(eco);
    expect(eco.food).toBe(25);
  });
});

describe('pickMigrationTile', () => {
  it('returns null on empty walkable list', () => {
    expect(pickMigrationTile([], () => 0.5)).toBeNull();
  });
  it('picks deterministically given a fixed prng', () => {
    const tiles = [
      { q: 0, r: 0, level: 0 },
      { q: 1, r: 0, level: 0 },
      { q: 2, r: 0, level: 0 },
    ];
    expect(pickMigrationTile(tiles, () => 0)).toEqual({ q: 0, r: 0, level: 0 });
    expect(pickMigrationTile(tiles, () => 0.99)).toEqual({ q: 2, r: 0, level: 0 });
  });
});

describe('pickOracleVision', () => {
  it('returns null with fewer than 2 factions', () => {
    expect(
      pickOracleVision(
        [],
        () => '0,0',
        () => 0.5,
      ),
    ).toBeNull();
    expect(
      pickOracleVision(
        ['player'],
        () => '0,0',
        () => 0.5,
      ),
    ).toBeNull();
  });
  it('returns (blessed, revealedTile) for ≥ 2 factions', () => {
    const baseKeyOf = (id: string) => (id === 'enemy' ? '5,-3' : '0,0');
    const result = pickOracleVision(['player', 'enemy'], baseKeyOf, () => 0);
    expect(result).not.toBeNull();
    expect(result!.blessedFaction).toBe('player');
    expect(result!.revealedTileKey).toBe('5,-3'); // enemy's base
  });
  it('returns null when target faction has no base key', () => {
    const baseKeyOf = (_id: string) => null;
    expect(pickOracleVision(['player', 'enemy'], baseKeyOf, () => 0)).toBeNull();
  });
});
