/**
 * M_V9.HUD.WIN-LOSS-N-PLAYER — GameOverModal N-player per-faction stats grid.
 *
 * 6 contracts:
 *   1. 2-faction modal: no nplayer-faction-grid div rendered.
 *   2. N-player modal: nplayer-faction-grid appears with one row per faction.
 *   3. Winner row carries the nplayer-winner-row class and elevated styling.
 *   4. Relation badges carry the relation-badge class and relation-{rel} class.
 *   5. Tribute-ally tag appears for a faction with 'tributary' relation to winner.
 *   6. 2-faction legacy stats list still renders when N-player grid is absent.
 *
 * NOTE: GameOverModal renders via a Radix Dialog.Portal — content lives in
 * document.body (outside the render container). Use document.querySelector /
 * document.body instead of container.querySelector for portal-mounted nodes.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { buildDefaultFactions } from '@/config/factions';
import { setRelation } from '@/game/diplomacy';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/GameOverModal';

/**
 * Poll for a selector under document (Radix Portal mounts outside the
 * render container). 200ms sleeps were flaking on CI's slower runner —
 * the modal opens via a setInterval(100ms) poll on game.outcome, so
 * mount can take 100-300ms. 2s poll budget gives 20x headroom.
 */
async function waitFor<T>(probe: () => T | null, timeoutMs = 2000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = probe();
    if (v !== null && v !== undefined) return v;
    await new Promise<void>((res) => setTimeout(res, 25));
  }
  const v = probe();
  if (v !== null && v !== undefined) return v;
  throw new Error(`waitFor timeout after ${timeoutMs}ms`);
}

/** Wait for the modal dialog to be present in the DOM (Radix portal). */
async function waitForModal(): Promise<void> {
  await waitFor(() => document.querySelector('[role="dialog"]'));
}

/** Build a 4-faction game in the 'win' outcome. */
function make4PlayerGame() {
  const factions = buildDefaultFactions(4, ['#ff0000', '#00ff00', '#0000ff', '#ffff00']);
  const game = startGame({
    seedPhrase: 'nplayer-go-test',
    mapSize: 10,
    difficulty: 'normal',
    eventSeed: 'nplayer-go-ev',
    factions,
  });
  game.outcome = 'win';
  game.victoryRecord = {
    kind: 'military',
    winner: 'player',
    detectedAtSeconds: 300,
  };
  return game;
}

describe('M_V9.HUD.WIN-LOSS-N-PLAYER', () => {
  it('2-faction modal: nplayer-faction-grid NOT rendered', async () => {
    const game = startGame('nplayer-2fac-test');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await waitForModal();
    // Portal renders into document.body, not the render container.
    expect(document.querySelector('#nplayer-faction-grid')).toBeNull();
  });

  it('N-player modal: nplayer-faction-grid has one row per non-barbarian faction', async () => {
    const game = make4PlayerGame();
    await render(<GameOverModal game={game} />);
    const grid = await waitFor(() => document.querySelector('#nplayer-faction-grid'));
    expect(grid).not.toBeNull();
    // 4 factions → 4 data-faction-id rows
    const rows = document.querySelectorAll('[data-faction-id]');
    expect(rows.length).toBe(4);
  });

  it('winner row carries nplayer-winner-row class', async () => {
    const game = make4PlayerGame();
    await render(<GameOverModal game={game} />);
    const winnerRow = await waitFor(() => document.querySelector('.nplayer-winner-row'));
    expect(winnerRow).not.toBeNull();
    expect(winnerRow?.getAttribute('data-faction-id')).toBe('player');
  });

  it('relation badges carry relation-badge class and relation-{rel} class', async () => {
    const game = make4PlayerGame();
    // Set enemy relation to 'enemy' vs player
    setRelation(game.diplomacy, 'enemy', 'player', 'enemy', 0);
    await render(<GameOverModal game={game} />);
    await waitFor(() => document.querySelector('#nplayer-faction-grid'));
    const badges = document.querySelectorAll('.relation-badge');
    expect(badges.length).toBeGreaterThan(0);
    // Check the enemy row has relation-enemy class
    const enemyBadge = document.querySelector('[data-faction-id="enemy"] .relation-badge');
    expect(enemyBadge).not.toBeNull();
    expect(enemyBadge?.classList.contains('relation-enemy')).toBe(true);
  });

  it('tribute-ally tag appears for faction with tributary relation to winner', async () => {
    const game = make4PlayerGame();
    // Make player-3 a tributary under player (player is dominant)
    setRelation(game.diplomacy, 'player-3', 'player', 'tributary', 0, 'player');
    await render(<GameOverModal game={game} />);
    const tributeTag = await waitFor(() => document.querySelector('.tribute-ally-tag'));
    expect(tributeTag).not.toBeNull();
  });

  it('2-faction legacy: stats list rows still render when grid is absent', async () => {
    const game = startGame('nplayer-legacy-stats');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await waitForModal();
    // Poll for Territory Score text appearing in the document — modal
    // mount is async (Radix Portal + setInterval poll).
    await waitFor(() =>
      (document.body.textContent ?? '').includes('Territory Score') ? true : null,
    );
    const allText = document.body.textContent ?? '';
    expect(allText).toContain('Territory Score');
    expect(allText).toContain('Gold Earned');
  });
});
