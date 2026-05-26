import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, type TestInfo } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * Comprehensive Player Journey screenshot capture.
 *
 * Drives EVERY notable moment of the player journey + saves a PNG
 * to artifacts/journey/ for review. Runs only on demand:
 *
 *   pnpm test:e2e tests/e2e/journey-capture.spec.ts
 *
 * The screenshots become the lead agent's primary review surface
 * for visual quality (per user mandate — agent owns visuals, user
 * shouldn't have to point out a T-pose or palette issue).
 */
const OUT_DIR = 'artifacts/journey';

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

async function snap(
  page: import('@playwright/test').Page,
  slug: string,
  testInfo?: TestInfo,
): Promise<void> {
  // M_V11.POLISH.HUD-AUDIT — namespace by viewport project so
  // multi-viewport runs don't overwrite the desktop set. project
  // names come from playwright.config.ts (desktop, mobile, tablet).
  const viewport = testInfo?.project.name ?? 'desktop';
  await page.screenshot({
    path: join(OUT_DIR, `${viewport}-${slug}.png`),
    fullPage: false,
  });
}

/**
 * Skip the onboarding overlay + wait for the r3f scene to fully
 * paint. `__skipOnboarding` is wired by OnboardingOverlay's
 * useEffect; the function may not exist yet on enterGame return,
 * so poll for it. After dismissal, wait for the dialog DOM to
 * actually be removed (React re-render is async), then for
 * `__game_advanceFrames` (the GameSession test hook), then a
 * paint-warmup window for shadow maps + materials to settle.
 */
async function dismissOnboardingAndWaitForScene(
  page: import('@playwright/test').Page,
): Promise<void> {
  // 1. wait for __skipOnboarding to be wired
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __skipOnboarding?: unknown }).__skipOnboarding === 'function',
    { timeout: 10_000 },
  );
  // 2. call it
  await page.evaluate(async () => {
    const w = window as unknown as { __skipOnboarding?: () => Promise<void> };
    await w.__skipOnboarding?.();
  });
  // 3. wait for the dialog to leave the DOM
  await page
    .waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5_000 })
    .catch(() => undefined);
  // 4. wait for the game test hook + paint warmup
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
      'function',
    { timeout: 15_000 },
  );
  await page.waitForTimeout(2500);
}

test.describe('journey capture (manual review)', () => {
  test('00-title-screen', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('#title-heading');
    await page.waitForTimeout(700); // framer-motion entry settle
    await snap(page, '00-title-screen', testInfo);
  });

  test('01-new-game-modal', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('#title-screen');
    await page.click('#menu-new-game');
    await page.waitForSelector('#begin-game');
    await page.waitForTimeout(500);
    await snap(page, '01-new-game-modal', testInfo);
  });

  test('02-settings-modal-from-title', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('#menu-settings');
    await page.click('#menu-settings');
    // settings modal id is one of the dialog children; wait for a known toggle.
    await page.waitForSelector('#settings-colorblind', { timeout: 5000 });
    await page.waitForTimeout(500);
    await snap(page, '02-settings-modal-from-title', testInfo);
  });

  test('03-game-fresh-start', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await snap(page, '03-game-fresh-start', testInfo);
  });

  test('04-game-after-10s-sim', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(600);
    });
    await page.waitForTimeout(600);
    await snap(page, '04-game-after-10s-sim', testInfo);
  });

  test('05-build-menu-open', async ({ page }, testInfo) => {
    test.setTimeout(30_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    // The build-menu flow is the trigger-build CustomEvent
    // (mobile build chip dispatches { type: 'Barracks' } etc.)
    // → App handler sets buildContext → TileInteraction enters
    // placement mode. The SelectionPanel build-button list is
    // ONLY visible while a Town Hall is selected, but the build
    // *flow* (placement cursor) is independent.
    // For the screenshot, trigger the build placement mode for
    // a Barracks — produces visible placement cursor in the world.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('aethelgard:trigger-build', { detail: { type: 'Barracks' } }),
      );
    });
    await page.waitForTimeout(800);
    // Extra paint window for the framer-motion enter animation
    // (350ms ease-out per SelectionPanel.tsx transition prop).
    await page.waitForTimeout(600);
    await snap(page, '05-build-menu-open', testInfo);
  });

  test('06-game-over-win', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      const w = window as unknown as { __triggerGameOver?: (o: 'win' | 'loss' | 'draw') => void };
      w.__triggerGameOver?.('win');
    });
    // GameOverModal polls outcome via rAF; in headless rAF is
    // throttled but eventually fires. Don't fail if the modal
    // never appears — the screenshot captures whatever state
    // resulted (see M_POLISH3.SCENE.4 follow-up).
    await page.waitForSelector('#game-over-modal', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await snap(page, '06-game-over-win', testInfo);
  });

  test('07-game-over-loss', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      const w = window as unknown as { __triggerGameOver?: (o: 'win' | 'loss' | 'draw') => void };
      w.__triggerGameOver?.('loss');
    });
    await page.waitForSelector('#game-over-modal', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await snap(page, '07-game-over-loss', testInfo);
  });

  // M_V11.POLISH.SCREENSHOT-BATTERY — v0.11-specific moments so a
  // reviewer can spot regressions in the new substrate work.

  test('08-long-sim-90s-camps-mobs', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    // 5400 frames / 60fps = 90s of sim — past the 90s mob-spawn
    // baseline so barbarian-camp mobs should be visible roaming.
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(5400);
    });
    await page.waitForTimeout(800);
    await snap(page, '08-long-sim-90s-camps-mobs', testInfo);
  });

  test('09-procedural-buildings-zoom', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    // Re-dispatch focus-tile a few times so we win the race
    // against CameraRig's useEffect mounting after the Suspense
    // boundary resolves all GLBs. distance=4 pulls in tight on
    // the player Town Hall at axial 0,0.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent('aethelgard:focus-tile', { detail: { q: 0, r: 0, distance: 4 } }),
        );
      });
      await page.waitForTimeout(300);
    }
    // Tween convergence + paint window.
    await page.waitForTimeout(2000);
    await snap(page, '09-procedural-buildings-zoom', testInfo);
  });
});
