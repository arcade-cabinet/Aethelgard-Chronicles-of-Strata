import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_EXPANSION.T.137 — performance regression smoke at 60Hz.
 *
 * The spec calls for "full game at 60fps on a mid-tier mock
 * (Pixel 5a CPU profile)". JS-level we can't simulate a Pixel
 * 5a thermal/CPU envelope, but we CAN pin a worst-case sim-tick
 * cost ceiling on the dev machine. If a future change makes
 * runEconomyTick 10× more expensive, this test fires RED.
 *
 * Budget: 60Hz = 16.67ms per frame. Sim work shares the frame
 * with render; allocating ~5ms (30% of the frame) for the sim
 * tick on dev hardware. Pixel 5a is ~3-4× slower per single-
 * core, so 5ms on dev = ~15-20ms on Pixel 5a — still inside
 * the 16.67ms budget if we hit the dev ceiling exactly. Cushion
 * pulls the assertion to 3ms average so the dev runner has
 * headroom for slow CI hardware.
 *
 * The MEDIAN over 200 ticks is the assert target (not the mean —
 * GC stops cause occasional 50ms spikes that ARE expected and
 * don't reflect steady-state cost).
 */
const TICKS = 200;
const DELTA = 1 / 60;
const PER_TICK_MS_MAX_MEDIAN = 3.0;

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1] ?? 0;
    const b = sorted[mid] ?? 0;
    return (a + b) / 2;
  }
  return sorted[mid] ?? 0;
}

describe('M_EXPANSION.T.137 — runEconomyTick perf regression', () => {
  it('median tick time stays under 3ms on a Medium board (proxy for 60fps Pixel 5a budget)', () => {
    const game = startGame({
      seedPhrase: 'perf-medium',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'perf-medium-events',
    });
    // Warm-up: 30 ticks to prime hot paths + caches.
    for (let i = 0; i < 30; i++) runEconomyTick(game, DELTA);
    const timings: number[] = [];
    for (let i = 0; i < TICKS; i++) {
      const start = performance.now();
      runEconomyTick(game, DELTA);
      timings.push(performance.now() - start);
    }
    const m = median(timings);
    expect(m).toBeLessThan(PER_TICK_MS_MAX_MEDIAN);
  });
});
