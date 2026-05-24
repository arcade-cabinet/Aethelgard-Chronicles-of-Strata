import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.1 — per-mode HUD review captures.
 *
 * For each of the 6 game modes (border-clash, frontier-raid, long-
 * reign, strata-wars, age-of-strata, coexistence), capture the
 * HUD chrome + scene at:
 *   t=0       (fresh start, before sim has done anything)
 *   t=10s     (early-game framing)
 *   t=60s     (mid-game, peon AI has placed buildings, military spawning)
 *   t=peak    (180s — peak combat / late expansion)
 *
 * Uses AI-vs-AI URL auto-start so each mode boots straight into a
 * self-playing match without modal clicks.
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/per-mode-journey.spec.ts
 */

const OUT_BASE = 'artifacts/journey/per-mode';

const MODES = [
  'border-clash',
  'frontier-raid',
  'long-reign',
  'strata-wars',
  'age-of-strata',
  'coexistence',
] as const;

const SNAPS = [
  { label: 't0', simSeconds: 0 },
  { label: 't10s', simSeconds: 10 },
  { label: 't60s', simSeconds: 60 },
  { label: 't180s', simSeconds: 180 },
] as const;

test.describe('per-mode HUD captures', () => {
  for (const mode of MODES) {
    test(`mode=${mode}`, async ({ page }) => {
      test.setTimeout(60_000);
      const outDir = join(OUT_BASE, mode);
      mkdirSync(outDir, { recursive: true });

      await page.goto(`/?ai-vs-ai=1&seed=hud-${mode}&mode=${mode}`);
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
          'function',
        { timeout: 30_000 },
      );
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __skipOnboarding?: unknown }).__skipOnboarding ===
          'function',
        { timeout: 10_000 },
      );
      await page.evaluate(async () => {
        const w = window as unknown as { __skipOnboarding?: () => Promise<void> };
        await w.__skipOnboarding?.();
      });
      await page
        .waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5_000 })
        .catch(() => undefined);
      await page.waitForTimeout(2500); // paint warmup

      let totalAdvanced = 0;
      for (const { label, simSeconds } of SNAPS) {
        const framesToAdvance = simSeconds * 60 - totalAdvanced;
        if (framesToAdvance > 0) {
          await page.evaluate((n) => {
            const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
            w.__game_advanceFrames?.(n);
          }, framesToAdvance);
          totalAdvanced += framesToAdvance;
          await page.waitForTimeout(200); // r3f catches up
        }
        await page.screenshot({
          path: join(outDir, `${label}.png`),
          fullPage: false,
        });
      }
    });
  }
});
