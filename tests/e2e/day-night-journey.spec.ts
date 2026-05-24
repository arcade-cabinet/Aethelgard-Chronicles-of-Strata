import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.3 — day-night cycle captures.
 *
 * DAY_LENGTH is 240 sim-seconds. Phase = elapsed / DAY_LENGTH.
 * Capture: dawn (0%), noon (25%), dusk (50%), midnight (75%) — the
 * four turning points of the sky-colour curve in DayNightCycle.
 *
 * Force the clock via direct game.clock.elapsed mutation (the
 * useFrame in DayNightCycle re-reads phase every frame).
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/day-night-journey.spec.ts
 */

const OUT_DIR = 'artifacts/journey/day-night';
const DAY_LENGTH = 240;
const PHASES = [
  { label: 'dawn', elapsed: 0 },
  { label: 'noon', elapsed: DAY_LENGTH * 0.25 },
  { label: 'dusk', elapsed: DAY_LENGTH * 0.5 },
  { label: 'midnight', elapsed: DAY_LENGTH * 0.75 },
] as const;

test('day-night phase captures', async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(OUT_DIR, { recursive: true });

  await page.goto('/?ai-vs-ai=1&seed=day-night-seed&mode=border-clash');
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
      'function',
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __skipOnboarding?: unknown }).__skipOnboarding === 'function',
    { timeout: 10_000 },
  );
  await page.evaluate(async () => {
    const w = window as unknown as { __skipOnboarding?: () => Promise<void> };
    await w.__skipOnboarding?.();
  });
  await page
    .waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2500);

  for (const { label, elapsed } of PHASES) {
    await page.evaluate((e) => {
      const w = window as unknown as { __game?: { clock: { elapsed: number } } };
      if (w.__game) w.__game.clock.elapsed = e;
    }, elapsed);
    // longer paint window — DayNightCycle reads the new phase on
    // next useFrame, but the scene.background + light intensity
    // both ease in over a few frames; give r3f time to commit.
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(60);
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(OUT_DIR, `${label}.png`),
      fullPage: false,
    });
  }
});
