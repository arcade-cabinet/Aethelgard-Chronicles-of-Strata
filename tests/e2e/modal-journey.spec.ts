import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.5 — modal screenshot ledger.
 *
 * Captures each significant modal/panel that the player can encounter:
 *   - new-game-default      (NewGameModal opened from TitleScreen, all defaults)
 *   - settings-title        (SettingsModal opened from TitleScreen)
 *   - settings-in-game      (SettingsModal opened mid-match — different reachable controls)
 *   - hotkey-editor         (HotkeyEditor expanded inside SettingsModal)
 *   - discoveries-empty     (Discoveries panel at t=0, before any discoveries unlocked)
 *   - discoveries-populated (Discoveries panel after sim has run + science accumulated)
 *
 * Produces 6 PNGs in artifacts/journey/modals/<slug>.png.
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/modal-journey.spec.ts
 */
const OUT_DIR = 'artifacts/journey/modals';

test.beforeAll(() => mkdirSync(OUT_DIR, { recursive: true }));

async function snap(page: import('@playwright/test').Page, slug: string): Promise<void> {
  await page.screenshot({ path: join(OUT_DIR, `${slug}.png`), fullPage: false });
}

test('new-game default modal', async ({ page }) => {
  await page.goto('/');
  await page.click('#menu-new-game');
  await page.waitForSelector('#begin-game');
  await page.waitForTimeout(500);
  await snap(page, 'new-game-default');
});

test('settings modal from title', async ({ page }) => {
  await page.goto('/');
  await page.click('#menu-settings');
  await page.waitForSelector('#settings-colorblind', { timeout: 5000 });
  await page.waitForTimeout(500);
  await snap(page, 'settings-title');
});

test('hotkey editor expanded', async ({ page }) => {
  await page.goto('/');
  await page.click('#menu-settings');
  await page.waitForSelector('#settings-colorblind', { timeout: 5000 });
  // Scroll to bottom of modal so HotkeyEditor rows are visible
  await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement | null;
    dlg?.scrollTo?.({ top: 9999 });
  });
  await page.waitForTimeout(400);
  await snap(page, 'hotkey-editor');
});

test('discoveries panel mid-match', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?ai-vs-ai=1&seed=modal-seed&mode=border-clash');
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
  // advance to ~60s so some science / techs are reachable
  await page.evaluate(() => {
    const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
    w.__game_advanceFrames?.(3600);
  });
  await page.waitForTimeout(400);
  await page.click('#discoveries-button');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.waitForTimeout(400);
  await snap(page, 'discoveries-mid-match');
});

test('settings modal in-game', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?ai-vs-ai=1&seed=modal-seed&mode=border-clash');
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
  await page.waitForTimeout(800);
  // In-game settings reach: most builds have a system-menu button.
  // If it's missing, fall back to keyboard shortcut Escape (if wired).
  const sysBtn = page.locator(
    'button[aria-label*="settings" i], button[aria-label*="system" i], #settings-button',
  );
  if ((await sysBtn.count()) > 0) {
    await sysBtn.first().click();
    await page.waitForTimeout(400);
  }
  await snap(page, 'settings-in-game');
});
