/**
 * M_FUN.NAR — unit tests for the pure narrative helpers.
 *
 * Pins: (1) nickname is deterministic under (seedPhrase, outcome);
 * (2) nickname pulls from the win/loss adjective pool by outcome;
 * (3) highlights surface a sensible default when nothing else fits.
 *
 * M_FUN.AI.MATCH-NARRATIVE-SPEC — adjective-pool assertions derive
 * from match-narrative.json instead of hardcoded word lists so that
 * adding a new adjective to the JSON does not require a test edit.
 * Structure assertions: "The <adj> <subject>" where <adj> is a
 * member of the outcome's adjective pool per the JSON schema.
 */
import matchNarrativeJson from '@/config/match-narrative.json';
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/game/game-state';
import { detectTranscriptHighlights, matchNickname } from '../match-narrative';

// Derive adjective sets from the schema source-of-truth so the tests
// stay correct when new words are added to match-narrative.json.
const VICTORY_ADJS = new Set(matchNarrativeJson.adjectives.victory);
const DEFEAT_ADJS = new Set(matchNarrativeJson.adjectives.defeat);
const DRAW_ADJS = new Set(matchNarrativeJson.adjectives.draw);
const ALL_SUBJECTS = new Set(matchNarrativeJson.subjects);

/** Parse "The <Adj> <Subject>" into its components. */
function parseNickname(name: string): { adj: string; subject: string } | null {
  const m = name.match(/^The (\S+) (\S+)$/);
  if (!m?.[1] || !m[2]) return null;
  return { adj: m[1], subject: m[2] };
}

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
    // M_FUN.AI.MATCH-NARRATIVE-SPEC: derive expected words from JSON schema,
    // not from a hardcoded list. Adding a new adjective to match-narrative.json
    // must not require a test edit.
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'win' });
    const parsed = parseNickname(name);
    expect(parsed, `nickname should be "The <adj> <subject>", got: "${name}"`).not.toBeNull();
    expect(
      VICTORY_ADJS.has(parsed?.adj ?? ''),
      `adj "${parsed?.adj}" must be in the victory pool: ${[...VICTORY_ADJS].join(', ')}`,
    ).toBe(true);
    expect(
      ALL_SUBJECTS.has(parsed?.subject ?? ''),
      `subject "${parsed?.subject}" must be in the subjects pool`,
    ).toBe(true);
  });

  it('uses the defeat pool for losses', () => {
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'loss' });
    const parsed = parseNickname(name);
    expect(parsed, `nickname should be "The <adj> <subject>", got: "${name}"`).not.toBeNull();
    expect(
      DEFEAT_ADJS.has(parsed?.adj ?? ''),
      `adj "${parsed?.adj}" must be in the defeat pool: ${[...DEFEAT_ADJS].join(', ')}`,
    ).toBe(true);
    expect(ALL_SUBJECTS.has(parsed?.subject ?? ''), 'subject must be in pool').toBe(true);
  });

  it('uses the draw pool for draws (reviewer-fix CRITICAL #1)', () => {
    const name = matchNickname({ seedPhrase: 'brave wild fox', outcome: 'draw' });
    const parsed = parseNickname(name);
    expect(parsed, `nickname should be "The <adj> <subject>", got: "${name}"`).not.toBeNull();
    expect(
      DRAW_ADJS.has(parsed?.adj ?? ''),
      `adj "${parsed?.adj}" must be in the draw pool: ${[...DRAW_ADJS].join(', ')}`,
    ).toBe(true);
    expect(ALL_SUBJECTS.has(parsed?.subject ?? ''), 'subject must be in pool').toBe(true);
  });

  it('decorrelates adjective and subject choice across seeds', () => {
    // Reviewer-fix HIGH #4: scan many seeds and confirm both axes
    // hit broad coverage of their pools. Old hash produced a fixed
    // subject ordering keyed off the adjective; new salted hashes
    // break that aliasing.
    // M_FUN.AI.MATCH-NARRATIVE-SPEC: coverage floor = half the pool
    // size per axis, derived from the JSON schema so new entries
    // automatically raise the floor.
    const seenAdjs = new Set<string>();
    const seenSubjects = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const name = matchNickname({ seedPhrase: `seed-${i}`, outcome: 'win' });
      const parsed = parseNickname(name);
      expect(parsed).not.toBeNull();
      if (!parsed) continue;
      expect(VICTORY_ADJS.has(parsed.adj), `unexpected adj "${parsed.adj}"`).toBe(true);
      expect(ALL_SUBJECTS.has(parsed.subject), `unexpected subject "${parsed.subject}"`).toBe(true);
      seenAdjs.add(parsed.adj);
      seenSubjects.add(parsed.subject);
    }
    // Expect coverage of at least half of each pool — proxies for
    // 'we're not stuck in one corner of the (adj, sub) grid'.
    const adjFloor = Math.ceil(VICTORY_ADJS.size / 2);
    const subFloor = Math.ceil(ALL_SUBJECTS.size / 2);
    expect(seenAdjs.size).toBeGreaterThanOrEqual(adjFloor);
    expect(seenSubjects.size).toBeGreaterThanOrEqual(subFloor);
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
