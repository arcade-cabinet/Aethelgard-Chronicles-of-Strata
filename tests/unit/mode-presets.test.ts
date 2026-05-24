import { describe, expect, it } from 'vitest';
import { FactionBase, Health } from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';
import { MODE_PRESETS, presetFor } from '@/rules';

describe('mode presets (M_MODES.2-.6)', () => {
  it('presetFor returns red-vs-blue defaults for undefined / unknown', () => {
    expect(presetFor(undefined)).toEqual(MODE_PRESETS['border-clash']);
  });

  it('skirmish bypasses guided map gen — pure noise allowed (no beach ring guarantee)', () => {
    const game = startGame({
      seedPhrase: 'skirmish-test',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'skirmish-events',
      mode: 'frontier-raid',
    });
    // skirmish mode skips paintBeachRing — outer ring may NOT be all OCEAN.
    // We don't assert "must be non-ocean" (noise might still produce it);
    // we just assert the mode flag round-trips.
    expect(game.mode).toBe('frontier-raid');
  });

  it('endless mode keeps FactionBases invulnerable across damage ticks', () => {
    const game = startGame({
      seedPhrase: 'endless-test',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'endless-events',
      mode: 'long-reign',
    });
    // wound the player base by 100hp
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase)?.faction;
      const h = e.get(Health);
      if (f === 'player' && h) {
        e.set(Health, { ...h, current: h.max - 100 });
      }
    }
    // advance one tick — invulnerability clamp should restore
    runEconomyTick(game, 1 / 60);
    let checked = 0;
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase)?.faction;
      const h = e.get(Health);
      if (f === 'player' && h) {
        checked += 1;
        expect(h.current).toBe(h.max);
      }
    }
    // CodeRabbit follow-up: prevent vacuous pass — if no player
    // FactionBase ever matches, the loop runs zero expects and the
    // test silently passes. Force at least one match.
    expect(checked).toBeGreaterThan(0);
  });

  it('red-vs-blue (default) does NOT clamp base health', () => {
    const game = startGame({
      seedPhrase: 'normal-test',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'normal-events',
      mode: 'border-clash',
    });
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase)?.faction;
      const h = e.get(Health);
      if (f === 'player' && h) {
        e.set(Health, { ...h, current: h.max - 50 });
      }
    }
    runEconomyTick(game, 1 / 60);
    let checked = 0;
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase)?.faction;
      const h = e.get(Health);
      if (f === 'player' && h) {
        checked += 1;
        expect(h.current).toBeLessThan(h.max);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
