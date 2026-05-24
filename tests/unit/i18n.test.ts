import { describe, expect, it } from 'vitest';
import { t, tn } from '@/hud/i18n';

/**
 * M_EXPANSION.T.139 — i18n facade contract. Today the facade is a
 * passthrough; future phase replaces the body with a bundle lookup
 * without touching any caller.
 */
describe('M_EXPANSION.T.139 — i18n facade', () => {
  it('t() returns the source string verbatim today (no-op passthrough)', () => {
    expect(t('newgame.begin', 'Begin')).toBe('Begin');
    expect(t('hud.resign', 'Resign')).toBe('Resign');
  });

  it('tn() picks singular vs plural by count', () => {
    expect(tn('peon.plural', 1, 'peon', 'peons')).toBe('peon');
    expect(tn('peon.plural', 0, 'peon', 'peons')).toBe('peons');
    expect(tn('peon.plural', 2, 'peon', 'peons')).toBe('peons');
  });
});
