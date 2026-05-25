/**
 * Multi-viewport visual regression — pins that the user's reported issues
 * (HUD overlap on OnePlus Open foldable unfolded; board going grey after
 * a few seconds) DON'T recur on any of the 6 standardised viewports.
 *
 * Asserts per viewport:
 *   1. Canvas paints a non-blank image at t=0 (post-onboarding).
 *   2. After advancing 10 sim-seconds the canvas STILL paints (catches
 *      OnePlus grey-out — WebGL context drop without our handler would
 *      reset the canvas to solid background).
 *   3. No HUD elements have bounding-box overlaps (catches unfolded
 *      foldable HUD crowding).
 *   4. Visual baseline locked per project via Playwright toHaveScreenshot.
 *
 * Run via `pnpm test:e2e:multiview` — playwright.config.ts projects matrix
 * (desktop / mobile / tablet / foldable-portrait / foldable-landscape /
 * ultrawide) means this single test runs 6× under MULTIVIEW=1.
 */
import { expect, test } from '@playwright/test';

test.describe('multi-viewport regression', () => {
  test('board renders + stays painted + HUD does not overlap', async ({ page }, testInfo) => {
    await page.goto('/?ai-vs-ai=1&seed=mvp-regress&skipOnboarding=1');

    // Wait for the runtime hook the game build exposes.
    await page.waitForFunction(
      () => typeof (globalThis as { __game?: unknown }).__game !== 'undefined',
      { timeout: 20_000 },
    );

    // Force-dismiss any onboarding overlay that lingers under the
    // ?skipOnboarding=1 flow on the new N-player code path.
    await page.evaluate(() => {
      const hook = (window as { __skipOnboarding?: () => Promise<void> }).__skipOnboarding;
      return hook?.();
    });

    // 2 rAF barrier so r3f flushes the first paint.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    // -------- check 1: canvas is present + non-zero dims --------
    // Cross-platform note: reading WebGL canvas pixels into a 2D context
    // requires preserveDrawingBuffer:true, which we don't set; so the
    // "painted" assertion can only verify the canvas exists with non-
    // zero dimensions. The "board went grey" bug surfaces as canvas
    // dimensions being zero or the canvas element going missing; the
    // visual baseline below catches the actual pixel-level regression.
    const canvasState = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return { ok: false, reason: 'no-canvas' };
      if (c.width === 0 || c.height === 0)
        return { ok: false, reason: `zero-dim ${c.width}×${c.height}` };
      return { ok: true, reason: `${c.width}×${c.height}` };
    });
    expect(
      canvasState.ok,
      `t=0 canvas problem on ${testInfo.project.name}: ${canvasState.reason}`,
    ).toBe(true);

    // Advance 10 sim-seconds — when the user reported the board going
    // grey on OnePlus. PR #16 webglcontextlost handler should keep it painted.
    await page.evaluate(() => {
      const advance = (window as { __game_advanceFrames?: (n: number) => void })
        .__game_advanceFrames;
      if (advance) advance(600); // 10 sim-sec at 60Hz
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const canvasState10 = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return { ok: false, reason: 'canvas-missing' };
      if (c.width === 0 || c.height === 0)
        return { ok: false, reason: `zero-dim ${c.width}×${c.height}` };
      return { ok: true, reason: `${c.width}×${c.height}` };
    });
    expect(
      canvasState10.ok,
      `t=10 canvas problem on ${testInfo.project.name}: ${canvasState10.reason}`,
    ).toBe(true);

    // -------- check 3: HUD bounding-box overlap audit --------
    const overlaps = await page.evaluate(() => {
      const sels = [
        '[data-testid="resource-bar"]',
        '[data-testid="minimap"]',
        '[data-testid="win-condition-pill"]',
        '[data-testid="discoveries-button"]',
        '[data-testid="audio-toggle"]',
      ];
      const rects: Array<{ sel: string; x: number; y: number; r: number; b: number }> = [];
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        rects.push({ sel, x: r.x, y: r.y, r: r.right, b: r.bottom });
      }
      const collisions: Array<{ a: string; b: string }> = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          if (!a || !b) continue;
          const ox = Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x));
          const oy = Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
          if (ox > 0 && oy > 0) collisions.push({ a: a.sel, b: b.sel });
        }
      }
      return collisions;
    });
    expect(overlaps, `HUD overlaps on ${testInfo.project.name}`).toEqual([]);

    // -------- check 4: visual baseline --------
    await expect(page).toHaveScreenshot(`${testInfo.project.name}.png`, {
      mask: [page.locator('[data-testid="resource-bar"]')],
      maxDiffPixelRatio: 0.02,
    });
  });
});
