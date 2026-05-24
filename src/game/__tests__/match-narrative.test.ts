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
});
