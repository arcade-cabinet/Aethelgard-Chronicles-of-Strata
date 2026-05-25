/**
 * M_FUN.ARCH.TURN-AWARE (v0.5.C) — single helper for "how much match
 * time has elapsed?" that works the same way in RTS and turn-based
 * modes. The raw `game.clock.elapsed` is sim-seconds; in RTS that
 * directly maps to wall-clock pacing, but in turn-based the same
 * counter advances slowly + in chunks, so reading it as "seconds
 * since match start" overcounts every chunk.
 *
 * Two accessors:
 *
 *   matchElapsedSeconds(game) — same as game.clock.elapsed in RTS;
 *     in turn-based, scales the raw seconds by an RTS-equivalent
 *     factor (turn.turnsElapsed × RTS_SECONDS_PER_TURN) so a
 *     threshold like "after 180 sim-seconds of RTS" maps to "after
 *     ~6 turns of turn-based" — the same gameplay landmark.
 *
 *   matchElapsedTurns(game) — turns elapsed (turn-based) or a
 *     derived turn count (RTS, by dividing seconds by the same
 *     RTS_SECONDS_PER_TURN constant). For decisions that read
 *     more naturally as turns (AI cadence, escalation tiers).
 *
 * Callers SHOULD use these instead of `game.clock.elapsed`. The
 * raw clock stays for systems that genuinely care about
 * wall-clock seconds (day-night cycle, particle decay).
 */
import type { GameState } from './game-state';

/**
 * The wall-clock seconds that one turn-based turn represents for
 * gameplay-pacing purposes. ~30s feels right for RTS landmarks
 * (Footman first spawn ~15s; first House ~30s; first attack ~60s);
 * keeping the same per-turn cadence makes turn-based feel like a
 * "paused" version of RTS rather than a different game.
 */
export const RTS_SECONDS_PER_TURN = 30;

/** Seconds since match start, normalised across RTS and turn-based. */
export function matchElapsedSeconds(game: GameState): number {
  if (game.turn) {
    // Turn-based: each completed turn is RTS_SECONDS_PER_TURN of
    // gameplay-equivalent time. The current turn's remaining time
    // doesn't count toward elapsed (you haven't acted yet).
    return game.turn.turnsElapsed * RTS_SECONDS_PER_TURN;
  }
  return game.clock.elapsed;
}

/** Turns elapsed since match start, derived for RTS modes. */
export function matchElapsedTurns(game: GameState): number {
  if (game.turn) return game.turn.turnsElapsed;
  return Math.floor(game.clock.elapsed / RTS_SECONDS_PER_TURN);
}
