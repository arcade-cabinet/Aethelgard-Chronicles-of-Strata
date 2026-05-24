import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.2 — weather captures.
 *
 * Loads the game once at a fixed seed + mode, advances to ~30s of
 * sim so the scene has buildings + units to colour, then forces each
 * weather state (sunny/fog/rain) and screenshots. Three PNGs land in
 * artifacts/journey/weather/<state>.png.
 *
 * Forces weather via direct game.weather.state mutation — the
 * rain/fog overlays are r3f-driven by reading state each frame so
 * a single mutation + small wait is enough to render.
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/weather-journey.spec.ts
 */

const OUT_DIR = 'artifacts/journey/weather';
const WEATHERS = ['sunny', 'fog', 'rain'] as const;

test('weather state captures', async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(OUT_DIR, { recursive: true });

  await page.goto('/?ai-vs-ai=1&seed=weather-seed&mode=border-clash');
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

  // advance to ~30s so we have some buildings + scenery to colour
  await page.evaluate(() => {
    const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
    w.__game_advanceFrames?.(1800);
  });
  await page.waitForTimeout(400);

  for (const state of WEATHERS) {
    await page.evaluate((s) => {
      const w = window as unknown as { __game?: { weather: { state: string } } };
      if (w.__game) w.__game.weather.state = s;
    }, state);
    // advance a tiny bit so the next-frame readers pick up the new state
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(30);
    });
    await page.waitForTimeout(600); // particle warmup
    await page.screenshot({
      path: join(OUT_DIR, `${state}.png`),
      fullPage: false,
    });
  }
});
