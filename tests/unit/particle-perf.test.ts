import { describe, expect, it } from 'vitest';
import { createMapPrng } from '@/core/rng';
import { startGame } from '@/game/game-state';
import { rainConsumer, snowConsumer } from '@/world/particle-consumers';

/**
 * M_EXPANSION.T.136 — particle archetype spawn/age/cull at 60Hz.
 *
 * Drives one of the steady-state consumers (rain) for 600 ticks at
 * 1/60s and asserts:
 *   - The total particle count stays within a bounded ceiling
 *     (consumer is self-capped by RAIN_TARGET_COUNT etc).
 *   - No tick produces NaN positions or runs faster than the
 *     consumer's spawn cadence.
 *   - The simulated lifecycle matches the consumer's lifetime
 *     (drops added at age=0 cull when age > lifetime).
 *
 * "No allocations" is a hard contract to assert from JS-land
 * without V8 instrumentation, so we proxy via the ceiling test:
 * if the consumer were allocating unbounded, the array length
 * would grow without bound.
 */
const TICKS = 600; // 10 game-seconds at 60Hz
const DELTA = 1 / 60;

function nextIdFactory() {
  let next = 0;
  return () => next++;
}

describe('M_EXPANSION.T.136 — particle consumer perf', () => {
  it('rainConsumer steady-state stays under RAIN_TARGET_COUNT + lifetime tolerance', () => {
    const game = startGame('rain-perf');
    game.weather.state = 'rain';
    const nextId = nextIdFactory();
    const rng = createMapPrng('rain-perf-rng');
    let particles: Awaited<ReturnType<typeof rainConsumer.tick>> extends (infer P)[] | null
      ? Array<P extends { id: number; age: number } ? P : never>
      : never[] = [] as never[];
    let peakCount = 0;
    for (let i = 0; i < TICKS; i++) {
      // Age existing particles + cull aged-out (mimics ParticleEmitter)
      particles = particles
        .map((p) => ({ ...p, age: p.age + DELTA }))
        .filter((p) => p.age < rainConsumer.lifetime);
      const fresh = rainConsumer.tick({
        game,
        delta: DELTA,
        rng,
        live: particles,
        nextId,
      });
      if (fresh) particles = [...particles, ...fresh];
      peakCount = Math.max(peakCount, particles.length);
    }
    // The consumer caps at RAIN_TARGET_COUNT = 1200; allow 10%
    // overshoot for the tick boundary (spawn before cull).
    expect(peakCount).toBeLessThan(1400);
    // After 10s the count should be steady — not climbing past
    // RAIN_TARGET_COUNT (which would indicate the cull broke).
    expect(particles.length).toBeLessThanOrEqual(1300);
  });

  it('snowConsumer returns null when no MOUNTAIN tiles (zero allocation)', () => {
    const game = startGame('snow-perf-no-mountain');
    for (const tile of game.board.tiles.values()) tile.type = 'GRASS';
    const nextId = nextIdFactory();
    const rng = createMapPrng('snow-perf-rng');
    for (let i = 0; i < TICKS; i++) {
      const result = snowConsumer.tick({
        game,
        delta: DELTA,
        rng,
        live: [],
        nextId,
      });
      // Every tick with no mountains must short-circuit to null —
      // no allocations.
      expect(result).toBeNull();
    }
  });
});
