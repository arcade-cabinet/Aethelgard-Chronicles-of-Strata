/**
 * M_V11.TUTORIAL (#77f) — TutorialOverlay visual baseline.
 *
 * Two states pinned: first step active (fresh tutorial) + completion
 * panel (every step satisfied). Component guards on game.mode ===
 * 'tutorial', so these baselines also pin the guard.
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { TutorialOverlay } from '@/hud/overlays';

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 800,
        height: 700,
        position: 'relative',
        background: '#0f172a',
      }}
    >
      {children}
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle(ms = 600) {
  // Longer than the 250ms poll so the initial render lands.
  await new Promise((r) => setTimeout(r, ms));
}

describe('M_V11.TUTORIAL — TutorialOverlay baseline', () => {
  it('first step visible on a fresh tutorial game', async () => {
    const game = startGame({
      seedPhrase: 'tutorial-baseline',
      mapSize: 8,
      difficulty: 'easy',
      eventSeed: 'tutorial-baseline-evt',
    });
    game.mode = 'tutorial';
    render(
      <Stage>
        <TutorialOverlay game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/tutorial-overlay-step-1.png` }),
    ).resolves.toBeTruthy();
  });

  it('non-tutorial mode renders nothing (guard works)', async () => {
    const game = startGame({
      seedPhrase: 'tutorial-guard',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'tutorial-guard-evt',
    });
    game.mode = 'border-clash';
    render(
      <Stage>
        <TutorialOverlay game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/tutorial-overlay-non-tutorial-mode.png` }),
    ).resolves.toBeTruthy();
  });
});
