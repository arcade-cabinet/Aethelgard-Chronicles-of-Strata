/**
 * M_V6.MYTH.EVENTS — registry + cooldown + fire pipeline pins.
 */
import { describe, expect, it } from 'vitest';
import {
  MYTH_EVENT_IDS,
  MYTH_EVENTS,
  MYTH_MIN_INTERVAL_SECONDS,
  mythEventFor,
} from '@/config/narrative';
import { createEconomy, type GameEconomy } from '@/game/economy';
import {
  applyHarvestFestival,
  canFireMythEvent,
  createMythEventsState,
  fireMythEvent,
  pickMythEvent,
} from '@/game/myth-events';

describe('MYTH_EVENTS registry', () => {
  it('contains the 5 declared events', () => {
    expect(MYTH_EVENT_IDS.length).toBe(5);
    for (const id of [
      'solar-eclipse',
      'meteor-strike',
      'wildlife-migration',
      'oracle-vision',
      'harvest-festival',
    ]) {
      expect(MYTH_EVENTS[id]).toBeDefined();
    }
  });
  it('shared cooldown = 300s', () => {
    expect(MYTH_MIN_INTERVAL_SECONDS).toBe(300);
  });
  it('mythEventFor throws on unknown id', () => {
    expect(() => mythEventFor('does-not-exist')).toThrow();
  });
});

describe('canFireMythEvent', () => {
  it('returns true at clock 0 (never fired)', () => {
    expect(canFireMythEvent(createMythEventsState(), 0)).toBe(true);
  });
  it('returns false while an active event is in flight', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'solar-eclipse', 100);
    expect(canFireMythEvent(s, 130)).toBe(false); // eclipse runs 60s
  });
  it('returns false during the post-fire shared cooldown', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'harvest-festival', 100); // duration 0 = no active
    // lastFireSeconds = 100; cooldown until 400.
    expect(canFireMythEvent(s, 200)).toBe(false);
    expect(canFireMythEvent(s, 399)).toBe(false);
    expect(canFireMythEvent(s, 400)).toBe(true);
  });
  it('clears stale active state during readiness check', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'solar-eclipse', 100); // expires at 160
    // At t=300, eclipse has long expired AND the 300s cooldown is up.
    // (100 + 300 = 400, NOT yet up at t=300 — pick later)
    expect(canFireMythEvent(s, 400)).toBe(true);
    // The check should have cleared s.active.
    expect(s.active).toBeNull();
  });
});

describe('pickMythEvent', () => {
  it('returns an event id from the registry', () => {
    const pick = pickMythEvent(() => 0.5);
    expect(pick).not.toBeNull();
    expect(MYTH_EVENT_IDS.includes(pick!)).toBe(true);
  });
  it('is deterministic for a fixed prng', () => {
    const a = pickMythEvent(() => 0.42);
    const b = pickMythEvent(() => 0.42);
    expect(a).toBe(b);
  });
  it('handles prng() = 0 + 1 corner cases', () => {
    expect(pickMythEvent(() => 0)).not.toBeNull();
    expect(pickMythEvent(() => 0.999)).not.toBeNull();
  });
});

describe('fireMythEvent', () => {
  it('returns null when gated by cooldown', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'harvest-festival', 100);
    expect(fireMythEvent(s, 'harvest-festival', 200)).toBeNull();
  });
  it('sets active for duration > 0 events', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'solar-eclipse', 50);
    expect(s.active).toEqual({ id: 'solar-eclipse', expiresAtSeconds: 50 + 60 });
  });
  it('leaves active null for duration = 0 events', () => {
    const s = createMythEventsState();
    fireMythEvent(s, 'harvest-festival', 100);
    expect(s.active).toBeNull();
    expect(s.lastFireSeconds).toBe(100);
  });
});

describe('applyHarvestFestival', () => {
  it('+50 food + +20 gold to every faction', () => {
    const eco: Record<string, GameEconomy> = {
      player: createEconomy(),
      enemy: createEconomy(),
    };
    eco.player!.food = 10;
    eco.player!.gold = 5;
    eco.enemy!.food = 0;
    eco.enemy!.gold = 0;
    applyHarvestFestival((f) => eco[f], ['player', 'enemy']);
    expect(eco.player?.food).toBe(60);
    expect(eco.player?.gold).toBe(25);
    expect(eco.enemy?.food).toBe(50);
    expect(eco.enemy?.gold).toBe(20);
  });
});
