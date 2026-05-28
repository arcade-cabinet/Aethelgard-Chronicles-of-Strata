import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { ZoneFlipPulse } from '@/hud/pills';

/**
 * M_POLISH2.MODES.42b — pulse-on-tile-flip.
 *
 * The pulse mounts ONLY in strata-wars + playing AND only when the
 * player's controlled-set shrinks between frames.
 */
describe('M_POLISH2.MODES.42b — ZoneFlipPulse', () => {
  it('renders nothing in border-clash mode', async () => {
    const game = startGame('zfp-border');
    await render(<ZoneFlipPulse game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('zone-flip-pulse')).toBeNull();
  });

  it('renders nothing in strata-wars when no flip has happened', async () => {
    const game = startGame({
      seedPhrase: 'zfp-strata',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'zfp-strata-ev',
      mode: 'strata-wars',
    });
    // Seed some controlled tiles.
    game.zones.player.controlled.add('1,1');
    game.zones.player.controlled.add('2,2');
    await render(<ZoneFlipPulse game={game} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(document.getElementById('zone-flip-pulse')).toBeNull();
  });

  it('renders the pulse when the player controlled-set shrinks', async () => {
    const game = startGame({
      seedPhrase: 'zfp-strata-flip',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'zfp-strata-flip-ev',
      mode: 'strata-wars',
    });
    game.zones.player.controlled.add('1,1');
    game.zones.player.controlled.add('2,2');
    await render(<ZoneFlipPulse game={game} />);
    // First frame establishes the baseline size; second frame after
    // the delete fires the pulse.
    await new Promise((r) => setTimeout(r, 100));
    game.zones.player.controlled.delete('1,1');
    await vi.waitFor(
      () => {
        if (!document.getElementById('zone-flip-pulse')) throw new Error('pulse not mounted');
      },
      { timeout: 2000, interval: 50 },
    );
    expect(document.getElementById('zone-flip-pulse')).not.toBeNull();
  });
});
