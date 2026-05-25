/**
 * M_FUN.DYN.QUAKE — applies a brief camera shake while
 * `game.quakeShakeRemaining > 0`. The shake oscillates the camera
 * position by a small deterministic offset on each frame, decaying
 * with the remaining time so the wobble naturally fades. The
 * COUNTDOWN itself is driven by runEconomyTick — this component
 * only READS it and converts to a position delta.
 *
 * Tradeoff: this directly mutates camera.position. The renderer
 * doesn't have a "camera offset" channel, and adding one would
 * touch every camera-controller hook. Inline mutation here is the
 * smallest change that ships the feature; revisit if a second
 * effect (volcano rumble) needs the same channel.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { GameState } from '@/game/game-state';

const SHAKE_AMPLITUDE = 0.35; // world units of peak displacement

export function QuakeShake({ game }: { game: GameState }) {
  const camera = useThree((s) => s.camera);
  // Capture the un-shaken baseline so we can restore exactly when
  // the shake ends; without this the camera would drift by the
  // accumulated micro-deltas.
  const baseline = useRef<{ x: number; y: number; z: number } | null>(null);
  // Reviewer-fix (HIGH #4): use a local accumulator instead of
  // state.clock.elapsedTime (= performance.now via Three.Clock) so
  // the wobble is deterministic across visual-regression runs and
  // doesn't violate the profile's ban on performance.now in render
  // code. The accumulator advances by frame delta only while a
  // shake is active.
  const localT = useRef(0);

  useFrame((_state, delta) => {
    const remaining = game.quakeShakeRemaining;
    // Reviewer-fix (LOW #3 / sec #3): guard against a tampered
    // huge or non-finite value (DevTools injection) so the camera
    // never gets locked into permanent shake.
    if (!Number.isFinite(remaining) || remaining <= 0) {
      if (baseline.current) {
        camera.position.x = baseline.current.x;
        camera.position.y = baseline.current.y;
        camera.position.z = baseline.current.z;
        baseline.current = null;
        localT.current = 0;
      }
      return;
    }
    if (!baseline.current) {
      baseline.current = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
      localT.current = 0;
    }
    localT.current += delta;
    // Decay scaled by remaining/total (clamped 0..1).
    const decay = Math.min(1, remaining / 1.5);
    // Independent sin / cos channels so the wobble doesn't lock to
    // a single axis. The 25 + 17 Hz pair keeps it from looking like
    // a stable oscillation.
    const t = localT.current;
    const dx = Math.sin(t * 25) * SHAKE_AMPLITUDE * decay;
    const dz = Math.cos(t * 17) * SHAKE_AMPLITUDE * decay;
    camera.position.x = baseline.current.x + dx;
    camera.position.z = baseline.current.z + dz;
  });

  return null;
}
