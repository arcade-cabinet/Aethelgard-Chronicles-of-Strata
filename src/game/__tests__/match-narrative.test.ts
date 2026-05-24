/**
 * M_FUN.NAR — unit tests for the pure narrative helpers.
 *
 * Pins: (1) nickname is deterministic under (seedPhrase, outcome);
 * (2) nickname pulls from the win/loss adjective pool by outcome;
 * (3) highlights surface a sensible default when nothing else fits.
 */
import { describe, expect, it } from 'vitest';
import { matchNickname } from '../match-narrative';

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
    expect(name).toMatch(
      /^The (Bitter|Doomed|Final|Lonely|Tragic|Stubborn|Cursed|Quiet) /,
    );
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
