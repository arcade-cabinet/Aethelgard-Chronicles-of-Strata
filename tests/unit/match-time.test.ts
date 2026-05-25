/**
 * M_FUN.ARCH.TURN-AWARE — unit tests for src/game/match-time.ts.
 *
 * Pins the RTS vs turn-based time-normalisation contract: in RTS
 * mode `matchElapsedSeconds` returns the raw clock.elapsed; in
 * turn-based mode it scales by RTS_SECONDS_PER_TURN so an AI
 * threshold like "after 180 sim-seconds" maps to "after ~6 turns"
 * — the same gameplay landmark.
 *
 * Coderabbit MAJOR (PR #10 02:56Z review): "Core/ECS/game changes
 * require unit or browser test updates in code quality gates."
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/game/game-state';
import { matchElapsedSeconds, matchElapsedTurns, RTS_SECONDS_PER_TURN } from '@/game/match-time';

function rtsGame(elapsed: number): GameState {
  return { clock: { elapsed }, turn: undefined } as unknown as GameState;
}

function turnGame(turnsElapsed: number): GameState {
  return {
    clock: { elapsed: 999 }, // raw clock ignored in turn-based path
    turn: { turnsElapsed, active: 'player', secondsRemaining: 0, turnLength: 30, maxTurns: null },
  } as unknown as GameState;
}

describe('match-time helper', () => {
  describe('matchElapsedSeconds', () => {
    it('returns clock.elapsed in RTS mode', () => {
      expect(matchElapsedSeconds(rtsGame(45))).toBe(45);
      expect(matchElapsedSeconds(rtsGame(180))).toBe(180);
      expect(matchElapsedSeconds(rtsGame(0))).toBe(0);
    });

    it('scales turns by RTS_SECONDS_PER_TURN in turn-based mode', () => {
      // 6 turns × 30s/turn = 180s — matches the AI rage-quit
      // landmark from M_FUN.QA.AIVAI.TUNE.PATTERN-B.
      expect(matchElapsedSeconds(turnGame(6))).toBe(6 * RTS_SECONDS_PER_TURN);
      expect(matchElapsedSeconds(turnGame(0))).toBe(0);
      expect(matchElapsedSeconds(turnGame(1))).toBe(RTS_SECONDS_PER_TURN);
    });

    it('ignores raw clock.elapsed when in turn-based mode', () => {
      // turn-based: raw clock is irrelevant; only turn count drives time.
      const g = turnGame(3);
      // We seeded clock.elapsed=999 above; the helper must NOT
      // return 999 — it returns 3 * 30 = 90.
      expect(matchElapsedSeconds(g)).toBe(3 * RTS_SECONDS_PER_TURN);
    });
  });

  describe('matchElapsedTurns', () => {
    it('returns turn.turnsElapsed in turn-based mode', () => {
      expect(matchElapsedTurns(turnGame(0))).toBe(0);
      expect(matchElapsedTurns(turnGame(7))).toBe(7);
    });

    it('derives turn count from clock in RTS mode', () => {
      // 0..29s = turn 0; 30..59s = turn 1; etc.
      expect(matchElapsedTurns(rtsGame(0))).toBe(0);
      expect(matchElapsedTurns(rtsGame(29))).toBe(0);
      expect(matchElapsedTurns(rtsGame(30))).toBe(1);
      expect(matchElapsedTurns(rtsGame(180))).toBe(6);
    });
  });

  it('RTS_SECONDS_PER_TURN is the contracted 30s cadence', () => {
    // The constant is the lever for re-pacing turn-based modes
    // relative to the RTS baseline. Other AI thresholds are
    // multiples of this (e.g. 180s rage-quit = 6 turns); a
    // change here moves every turn-based landmark together.
    expect(RTS_SECONDS_PER_TURN).toBe(30);
  });
});
