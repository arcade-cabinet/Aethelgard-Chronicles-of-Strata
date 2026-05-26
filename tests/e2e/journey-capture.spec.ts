import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
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

async function snap(page: import('@playwright/test').Page, slug: string): Promise<void> {
  await page.screenshot({
    path: join(OUT_DIR, `${slug}.png`),
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
  test('00-title-screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title-heading');
    await page.waitForTimeout(700); // framer-motion entry settle
    await snap(page, '00-title-screen');
  });

  test('01-new-game-modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title-screen');
    await page.click('#menu-new-game');
    await page.waitForSelector('#begin-game');
    await page.waitForTimeout(500);
    await snap(page, '01-new-game-modal');
  });

  test('02-settings-modal-from-title', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#menu-settings');
    await page.click('#menu-settings');
    // settings modal id is one of the dialog children; wait for a known toggle.
    await page.waitForSelector('#settings-colorblind', { timeout: 5000 });
    await page.waitForTimeout(500);
    await snap(page, '02-settings-modal-from-title');
  });

  test('03-game-fresh-start', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await snap(page, '03-game-fresh-start');
  });

  test('04-game-after-10s-sim', async ({ page }) => {
    test.setTimeout(60_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(600);
    });
    await page.waitForTimeout(600);
    await snap(page, '04-game-after-10s-sim');
  });

  test('05-build-menu-open', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:open-build-menu'));
    });
    await page.waitForTimeout(400);
    await snap(page, '05-build-menu-open');
  });

  test('06-game-over-win', async ({ page }) => {
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
    await snap(page, '06-game-over-win');
  });

  test('07-game-over-loss', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    await page.evaluate(() => {
      const w = window as unknown as { __triggerGameOver?: (o: 'win' | 'loss' | 'draw') => void };
      w.__triggerGameOver?.('loss');
    });
    await page.waitForSelector('#game-over-modal', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    await snap(page, '07-game-over-loss');
  });

  // M_V11.POLISH.SCREENSHOT-BATTERY — v0.11-specific moments so a
  // reviewer can spot regressions in the new substrate work.

  test('08-long-sim-90s-camps-mobs', async ({ page }) => {
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
    await snap(page, '08-long-sim-90s-camps-mobs');
  });

  test('09-procedural-buildings-zoom', async ({ page }) => {
    test.setTimeout(60_000);
    await enterGame(page, 'ancient-silver-forest');
    await dismissOnboardingAndWaitForScene(page);
    // Tight zoom on the player Town Hall so the procedural
    // composition (columns + banners + spire + shields) reads.
    // Dispatches focus-town-hall (App listener forwards to
    // focus-tile which CameraRig tweens). The tween is r3f-
    // useFrame-driven (~6Hz exp-smooth, settles when within
    // 0.5 world units of target). Wait 4s real-time for the
    // tween to fully converge + the cameraTap re-paint.
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:focus-town-hall'));
    });
    await page.waitForTimeout(4000);
    await snap(page, '09-procedural-buildings-zoom');
  });
});
