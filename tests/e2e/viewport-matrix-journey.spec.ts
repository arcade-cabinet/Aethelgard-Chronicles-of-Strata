import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.6 — viewport matrix capture.
 *
 * For each important player-journey moment, screenshot at three
 * viewport sizes:
 *   - desktop  1280x720  (CI default, monitor 720p)
 *   - mobile   412x915   (Pixel 7 vertical, the Capacitor target)
 *   - tablet   768x1024  (iPad mini portrait, a 50/50 between)
 *
 * Moments captured:
 *   title          — TitleScreen
 *   new-game       — NewGameModal at default
 *   playing-fresh  — fresh sim, just dismissed onboarding
 *   playing-mid    — 60s in, both factions active
 *
 * Output: artifacts/journey/viewport/<viewport>/<moment>.png
 *
 * Forces the viewport via page.setViewportSize since this spec
 * runs in the default desktop project; the matrix dimension is
 * driven by JS, not Playwright projects (the multiview opt-in
 * runs every existing spec under all three, which is too noisy
 * for J.6's targeted matrix).
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/viewport-matrix-journey.spec.ts
 */

const OUT_BASE = 'artifacts/journey/viewport';

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 720 },
  { label: 'mobile', width: 412, height: 915 },
  { label: 'tablet', width: 768, height: 1024 },
] as const;

test.describe('viewport matrix journey', () => {
  for (const vp of VIEWPORTS) {
    test(`viewport=${vp.label}`, async ({ page }) => {
      test.setTimeout(60_000);
      const outDir = join(OUT_BASE, vp.label);
      mkdirSync(outDir, { recursive: true });

      await page.setViewportSize({ width: vp.width, height: vp.height });

      // title
      await page.goto('/');
      await page.waitForSelector('#title-heading');
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(outDir, 'title.png'), fullPage: false });

      // new-game modal
      await page.click('#menu-new-game');
      await page.waitForSelector('#begin-game');
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(outDir, 'new-game.png'), fullPage: false });

      // playing-fresh (via AI-vs-AI URL — no human input needed)
      await page.goto(`/?ai-vs-ai=1&seed=vp-${vp.label}&mode=border-clash`);
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
          'function',
        { timeout: 30_000 },
      );
      await page.evaluate(async () => {
        const w = window as unknown as { __skipOnboarding?: () => Promise<void> };
        await w.__skipOnboarding?.();
      });
      await page
        .waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5_000 })
        .catch(() => undefined);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(outDir, 'playing-fresh.png'), fullPage: false });

      // playing-mid (60 sim-seconds)
      await page.evaluate(() => {
        const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
        w.__game_advanceFrames?.(3600);
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(outDir, 'playing-mid.png'), fullPage: false });
    });
  }
});
