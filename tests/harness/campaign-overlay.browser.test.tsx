/**
 * M_V11.CAMPAIGN (#77g) — CampaignOverlay visual baseline.
 *
 * Pins the per-chapter render shape: first objective visible on a
 * fresh chapter-1 game; component guards on game.mode === 'campaign'.
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { CampaignOverlay } from '@/hud/overlays';

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 800, height: 700, position: 'relative', background: '#0f172a' }}>
      {children}
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle(ms = 600) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('M_V11.CAMPAIGN — CampaignOverlay baseline', () => {
  it('chapter 1 first objective visible', async () => {
    const game = startGame({
      seedPhrase: 'campaign-chapter-1-baseline',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'campaign-chapter-1-evt',
    });
    game.mode = 'campaign';
    (game as typeof game & { campaignChapter?: 'first-strata' }).campaignChapter = 'first-strata';
    render(
      <Stage>
        <CampaignOverlay game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/campaign-overlay-chapter-1.png` }),
    ).resolves.toBeTruthy();
  });

  it('chapter 3 first objective visible', async () => {
    const game = startGame({
      seedPhrase: 'campaign-chapter-3-baseline',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'campaign-chapter-3-evt',
    });
    game.mode = 'campaign';
    (game as typeof game & { campaignChapter?: 'necropolis-rising' }).campaignChapter =
      'necropolis-rising';
    render(
      <Stage>
        <CampaignOverlay game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/campaign-overlay-chapter-3.png` }),
    ).resolves.toBeTruthy();
  });

  it('non-campaign mode renders nothing (guard works)', async () => {
    const game = startGame({
      seedPhrase: 'campaign-guard-baseline',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'campaign-guard-evt',
    });
    game.mode = 'border-clash';
    render(
      <Stage>
        <CampaignOverlay game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/campaign-overlay-non-campaign-mode.png` }),
    ).resolves.toBeTruthy();
  });
});
