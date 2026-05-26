/**
 * M_GAME.STACK.2b — MultiSelectActions component harness.
 *
 * Smoke check: with a fresh game and no selection, the component
 * returns null (no chrome leaked). Real Stack-creation coverage
 * lives in src/game/__tests__/stacking.test.ts; this harness only
 * verifies the HUD surface mounts cleanly when there's nothing to
 * stack.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MultiSelectActions } from '@/hud/MultiSelectActions';
import { startGame } from '@/game/game-state';

describe('MultiSelectActions (M_GAME.STACK.2b)', () => {
  it('renders nothing when 0-1 entities are selected', async () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    render(<MultiSelectActions game={game} />);
    await new Promise((r) => setTimeout(r, 260));
    expect(document.querySelector('[data-testid="multi-select-actions"]')).toBeNull();
    expect(document.querySelector('[data-testid="multi-select-stack"]')).toBeNull();
  });
});
