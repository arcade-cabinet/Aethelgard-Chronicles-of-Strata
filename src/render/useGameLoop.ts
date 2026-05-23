import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useAudio } from '@/audio/useAudio';
import { WORLD } from '@/config/world';
import { type GameState, runEconomyTick } from '@/game/game-state';

// M_AUDIT2.ARCH.14 — both determinism-critical constants moved into
// config/world.json (WORLD.sim). One source of truth; future
// fixed-180Hz experiments etc don't grep across the codebase.
const FIXED_DT = WORLD.sim.fixedDt;
const MAX_STEPS_PER_FRAME = WORLD.sim.maxStepsPerFrame;

/**
 * Fixed-timestep game loop (M_HARDENING.2 — closes the determinism gap the
 * comprehensive-review flagged). The render frame is variable-rate; the sim
 * advances in fixed `FIXED_DT` chunks via an accumulator. Same input + same
 * seed → byte-identical result across machines + frame rates. No more
 * cooldown-drift or weather skew at low fps.
 *
 * The render layer reads the latest sim state each frame (no interpolation
 * pass today — units snap-update through Transform on the sim tick, which is
 * already smooth enough at 60 Hz; a future POST_REL item adds explicit
 * interpolation if needed at <30 fps).
 */
export function useGameLoop(game: GameState): void {
  useAudio(game);
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    accumulator.current += delta;
    let steps = 0;
    while (accumulator.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      runEconomyTick(game, FIXED_DT);
      accumulator.current -= FIXED_DT;
      steps += 1;
    }
    // Discard any surplus that exceeded the per-frame cap — the alternative
    // (carrying a 500ms backlog into next frame) just compounds the lag.
    if (accumulator.current > FIXED_DT * MAX_STEPS_PER_FRAME) {
      accumulator.current = 0;
    }
  });
}
