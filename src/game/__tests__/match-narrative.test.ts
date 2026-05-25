/**
 * M_FUN.NAR — unit tests for the pure narrative helpers.
 *
 * Pins: (1) nickname is deterministic under (seedPhrase, outcome);
 * (2) nickname pulls from the win/loss adjective pool by outcome;
 * (3) highlights surface a sensible default when nothing else fits.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/game/game-state';
import { detectTranscriptHighlights, matchNickname } from '../match-narrative';

function makeStubGame(overrides: Partial<GameState> = {}): GameState {
  // biome-ignore lint/suspicious/noExplicitAny: minimal stub for narrative tests
  return {
    clock: { elapsed: 600 },
    lastDamageEvents: [],
    economy: {
      player: { kills: 0 },
      enemy: { kills: 0 },
    },
    score: { player: 0, enemy: 0 },
    ...overrides,
  } as unknown as GameState;
}

describe('matchNickname', () => {
  it('is deterministic for the same (seedPhrase, outcome)', () => {
    const a = matchNickname({ seedPhrase: 'silent quiet dawn', outcome: 'win' });
    const b = matchNickname({ seedPhrase: 'silent quiet dawn', outcome: 'win' });
    expect(a).toBe(b);
  });

  it('differs between win and loss for the same seed', () => {
    const winName = matchNickname({ seedPhrase: 'silent quiet dawn', outcome: 'win' });
    const lossName = matchNickname({ seedPhrase: 'silent quiet dawn', outcome: 'loss' });
    expect(winName).not.toBe(lossName);
  });

  it('uses the victory pool for wins', () => {
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'win' });
    // win pool words include 'Glorious', 'Crushing', 'Patient', 'Sudden',
    // 'Inevitable', 'Forgotten', 'Hard-Won', 'Defiant'.
    expect(name).toMatch(
      /^The (Glorious|Crushing|Patient|Sudden|Inevitable|Forgotten|Hard-Won|Defiant) /,
    );
  });

  it('uses the defeat pool for losses', () => {
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'loss' });
    expect(name).toMatch(/^The (Bitter|Doomed|Final|Lonely|Tragic|Stubborn|Cursed|Quiet) /);
  });

  it('uses the draw pool for draws (reviewer-fix CRITICAL #1)', () => {
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'draw' });
    expect(name).toMatch(
      /^The (Balanced|Even-Handed|Twin|Mirrored|Stalemate|Steady|Equal|Echoed) /,
    );
  });

  it('decorrelates adjective and subject choice across seeds', () => {
    // Reviewer-fix HIGH #4: scan many seeds and confirm both axes
    // hit broad coverage of their pools. Old hash produced a fixed
    // subject ordering keyed off the adjective; new salted hashes
    // break that aliasing.
    const adjs = new Set<string>();
    const subjects = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const name = matchNickname({ seedPhrase: `seed-${i}`, outcome: 'win' });
      const m = name.match(/^The (\S+) (\S+)$/);
      expect(m).not.toBeNull();
      if (!m) continue;
      const adj = m[1];
      const subject = m[2];
      if (adj) adjs.add(adj);
      if (subject) subjects.add(subject);
    }
    // Expect coverage of at least half of each pool — proxies for
    // 'we're not stuck in one corner of the (adj, sub) grid'.
    expect(adjs.size).toBeGreaterThanOrEqual(4);
    expect(subjects.size).toBeGreaterThanOrEqual(6);
  });
});

describe('detectTranscriptHighlights (M_FUN.NAR.HIGHLIGHTS)', () => {
  it('returns no highlights for a quiet match', () => {
    const game = makeStubGame();
    expect(detectTranscriptHighlights(game)).toEqual([]);
  });

  it('detects a lopsided-kill burst when >= 3 kills landed', () => {
    // Coderabbit MAJOR PR #10 04:56Z — `isKill` is the gate now, not
    // `damage > 0`. Stub fixtures must set isKill=true to count.
    const game = makeStubGame({
      lastDamageEvents: [
        { damage: 50, isKill: true },
        { damage: 30, isKill: true },
        { damage: 20, isKill: true },
      ] as unknown as GameState['lastDamageEvents'],
    });
    const out = detectTranscriptHighlights(game);
    expect(out.some((h) => h.kind === 'lopsided-kill')).toBe(true);
  });

  it('does NOT trip lopsided-kill on >=3 hits that did not kill', () => {
    // The reviewer-flagged bug: 3 burst-fire ticks on ONE Footman
    // should NOT count as a lopsided-kill — only the final blow does.
    const game = makeStubGame({
      lastDamageEvents: [
        { damage: 10, isKill: false },
        { damage: 10, isKill: false },
        { damage: 10, isKill: false },
      ] as unknown as GameState['lastDamageEvents'],
    });
    const out = detectTranscriptHighlights(game);
    expect(out.some((h) => h.kind === 'lopsided-kill')).toBe(false);
  });

  it('detects a long campaign when kills/min > 1', () => {
    const game = makeStubGame({
      clock: { elapsed: 60 } as never,
      economy: {
        player: { kills: 3 },
        enemy: { kills: 0 },
      } as never,
    });
    expect(detectTranscriptHighlights(game).some((h) => h.kind === 'long-engagement')).toBe(true);
  });

  it('detects biggest-comeback when player or enemy holds a 1.5× score lead', () => {
    const playerAhead = makeStubGame({
      score: { player: 150, enemy: 50 },
    });
    expect(detectTranscriptHighlights(playerAhead).some((h) => h.kind === 'biggest-comeback')).toBe(
      true,
    );
    const enemyAhead = makeStubGame({
      score: { player: 50, enemy: 200 },
    });
    expect(detectTranscriptHighlights(enemyAhead).some((h) => h.kind === 'biggest-comeback')).toBe(
      true,
    );
  });
});
