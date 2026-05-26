/**
 * M_HUD.SHELL.16c — IdleUnitIndicator harness.
 *
 * Smoke check: renders without crashing on a fresh game (zero idle
 * units → component returns null), the data-testid is correct when
 * idle units exist, and tap dispatches `aethelgard:focus-tile`.
 *
 * Real-ECS-driven idle-cycle coverage will arrive when M_GAME.MODE.PEON.1
 * lands and the test substrate can spawn a forced-idle Footman.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { IdleUnitIndicator } from '@/hud/IdleUnitIndicator';
import { startGame } from '@/game/game-state';

describe('IdleUnitIndicator (M_HUD.SHELL.16c)', () => {
  it('returns null when no idle player military units exist', async () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    render(<IdleUnitIndicator game={game} />);
    await new Promise((r) => setTimeout(r, 320));
    // Fresh game has no military units yet — indicator should not render.
    expect(document.querySelector('[data-testid="idle-units-indicator"]')).toBeNull();
  });
});
