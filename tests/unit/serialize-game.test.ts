import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

describe('serializeGame ↔ deserializeGame round-trip (M_HARDENING.1)', () => {
  it('round-trips a fresh game with equal economy + clock + weather + outcome', () => {
    const original = startGame('autumn-bronze-summit');
    // mutate state away from defaults so round-trip really exercises overlay
    original.economy.player.wood = 123;
    original.economy.player.gold = 45;
    original.economy.enemy.stone = 67;
    runEconomyTick(original, 1.5);

    const snapshot = JSON.parse(JSON.stringify(serializeGame(original)));
    const restored = deserializeGame(snapshot);

    expect(restored.economy.player.wood).toBe(123);
    expect(restored.economy.player.gold).toBe(45);
    expect(restored.economy.enemy.stone).toBe(67);
    expect(restored.weather.state).toBe(original.weather.state);
    expect(restored.outcome).toBe(original.outcome);
    expect(restored.seedPhrase).toBe(original.seedPhrase);
    expect(restored.difficulty).toBe(original.difficulty);
  });

  it('survives a JSON serialization round-trip (the on-disk shape)', () => {
    const original = startGame('autumn-bronze-summit');
    const wire = JSON.stringify(serializeGame(original));
    const parsed = JSON.parse(wire);
    const restored = deserializeGame(parsed);
    expect(restored.seedPhrase).toBe('autumn-bronze-summit');
    expect(restored.outcome).toBe('playing');
  });

  it('rejects an unknown snapshot version', () => {
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 9999 as never;
    expect(() => deserializeGame(snap)).toThrow(/snapshot version 9999/);
  });

  it('continues advancing after restore — runEconomyTick stays valid', () => {
    const original = startGame('autumn-bronze-summit');
    const before = original.clock.elapsed;
    const restored = deserializeGame(JSON.parse(JSON.stringify(serializeGame(original))));
    expect(restored.clock.elapsed).toBe(before);
    runEconomyTick(restored, 1);
    expect(restored.clock.elapsed).toBeGreaterThan(before);
  });

  it('M_EXPANSION.S.57 — event seed round-trips byte-for-byte in the snapshot', () => {
    // The eventSeed is the device-level event PRNG seed; spec 96 says it
    // MUST embed in the snapshot so a save→load preserves the event-PRNG
    // lineage (re-deriving from the map seed alone would collapse the
    // two-PRNG model). Pin it.
    const original = startGame({
      seedPhrase: 'autumn-bronze-summit',
      mapSize: 6,
      difficulty: 'normal',
      eventSeed: 'fixed-event-seed-for-test-only',
    });
    const wire = JSON.stringify(serializeGame(original));
    const parsed = JSON.parse(wire);
    expect(parsed.config.eventSeed).toBe('fixed-event-seed-for-test-only');
    const restored = deserializeGame(parsed);
    expect(restored.eventSeed).toBe('fixed-event-seed-for-test-only');
  });
});
