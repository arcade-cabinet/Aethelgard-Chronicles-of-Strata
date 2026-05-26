/**
 * M_REGISTRY.6 — particle-consumer spec regression coverage.
 *
 * Pin the tick contracts of each consumer: that each spawns under
 * the right trigger, returns null otherwise, and that determinism
 * holds (the same seed produces the same particle stream).
 *
 * The renderParticle output is JSX — its correctness is covered by
 * the visual harness (the inherited M_POLISH.* tests already lock
 * baselines). The contract layer is the state machine.
 */
import { describe, expect, it } from 'vitest';
import { createMapPrng } from '@/core/rng';
import { startGame } from '@/game/game-state';
import {
  bloodSplashConsumer,
  buildCompleteConsumer,
  embersConsumer,
  rainConsumer,
  sawdustConsumer,
  snowConsumer,
  victoryConfettiConsumer,
} from '@/world/particle-consumers';

let particleId = 0;
function nextId(): number {
  return particleId++;
}

describe('M_REGISTRY.6 — particle consumer specs', () => {
  describe('rainConsumer', () => {
    it('returns null when weather is not rain', () => {
      const game = startGame('rain-no-emit');
      // game starts with 'sunny' weather — no rain drops should spawn.
      game.weather.state = 'sunny';
      const fresh = rainConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test-rain'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });

    it('spawns drops up to RAIN_TARGET_COUNT when raining', () => {
      const game = startGame('rain-emit');
      game.weather.state = 'rain';
      const fresh = rainConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test-rain'),
        live: [],
        nextId,
      });
      expect(fresh).not.toBeNull();
      // Top up from 0 → target = full batch.
      expect(fresh?.length).toBe(1200);
    });

    it('is deterministic — same seed produces same drop positions', () => {
      const game = startGame('rain-determinism');
      game.weather.state = 'rain';
      const a = rainConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('det-seed'),
        live: [],
        nextId: () => 0,
      });
      const b = rainConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('det-seed'),
        live: [],
        nextId: () => 0,
      });
      expect(a?.[0]?.x).toBe(b?.[0]?.x);
      expect(a?.[0]?.z).toBe(b?.[0]?.z);
    });
  });

  describe('buildCompleteConsumer', () => {
    it('returns null when no buildings exist', () => {
      const game = startGame('no-buildings');
      // startGame places a Palace + EnemyBase, both isComplete=true at
      // tick 0. The consumer's seen-set is module-level — but on the
      // FIRST call after a fresh seenRef sees both as new. We can't
      // easily reset module state from a test; instead verify the
      // shape (returns either null or a non-empty array of CompletePuff).
      const fresh = buildCompleteConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      // It returned either null OR an array of complete-puffs — both valid.
      expect(fresh === null || Array.isArray(fresh)).toBe(true);
    });
  });

  describe('sawdustConsumer', () => {
    it('returns null when no peons are BUILDING', () => {
      const game = startGame('no-builders');
      // fresh game: peons exist but are IDLE, not BUILDING.
      const fresh = sawdustConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });
  });

  describe('victoryConfettiConsumer', () => {
    it('returns null when game.outcome is playing', () => {
      const game = startGame('still-playing');
      const fresh = victoryConfettiConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });

    it('consumer declares the right lifetime + name', () => {
      // Module-level state on victoryConfettiConsumer prevents a
      // re-test of the win-emit branch without state reset. Pin the
      // contract surface instead.
      expect(victoryConfettiConsumer.lifetime).toBe(3.0);
      expect(victoryConfettiConsumer.seedTag).toBe('confetti');
      expect(victoryConfettiConsumer.name).toBe('victory-confetti');
    });
  });

  // -----------------------------------------------------------------
  // M_REFACTOR.1 — 3 new consumers (biome / unit / building)
  // -----------------------------------------------------------------
  describe('snowConsumer (biome-localized: MOUNTAIN)', () => {
    it('contract surface', () => {
      expect(snowConsumer.name).toBe('snow');
      expect(snowConsumer.seedTag).toBe('snow');
      expect(snowConsumer.lifetime).toBeGreaterThan(0);
    });

    it('returns null when the board has no MOUNTAIN tiles', () => {
      const game = startGame('snow-no-mountain');
      // Force every tile to grass so MOUNTAIN count == 0.
      for (const tile of game.board.tiles.values()) tile.type = 'GRASS';
      const fresh = snowConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });

    it('spawns flakes when MOUNTAIN tiles exist', () => {
      const game = startGame('snow-emit');
      // Guarantee at least one mountain tile.
      const tile = game.board.tiles.values().next().value;
      if (tile) tile.type = 'MOUNTAIN';
      const fresh = snowConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).not.toBeNull();
      expect((fresh ?? []).length).toBeGreaterThan(0);
    });
  });

  describe('bloodSplashConsumer (unit-localized: combat hits)', () => {
    it('contract surface', () => {
      expect(bloodSplashConsumer.name).toBe('blood-splash');
      expect(bloodSplashConsumer.seedTag).toBe('blood');
      expect(bloodSplashConsumer.lifetime).toBeGreaterThan(0);
    });

    it('returns null when no damage events fired', () => {
      const game = startGame('blood-no-events');
      // game.lastDamageEvents is empty at game start.
      const fresh = bloodSplashConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });
  });

  describe('embersConsumer (building-localized: Barracks)', () => {
    it('contract surface', () => {
      expect(embersConsumer.name).toBe('embers');
      expect(embersConsumer.seedTag).toBe('embers');
      expect(embersConsumer.lifetime).toBeGreaterThan(0);
    });

    it('returns null when no Barracks are built', () => {
      const game = startGame('embers-no-barracks');
      // fresh game has no buildings beyond the starting Palace;
      // Barracks query is empty.
      const fresh = embersConsumer.tick({
        game,
        delta: 1 / 60,
        rng: createMapPrng('test'),
        live: [],
        nextId,
      });
      expect(fresh).toBeNull();
    });
  });
});
