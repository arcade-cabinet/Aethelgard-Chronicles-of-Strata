import { writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

test('debug: inspect canvas DOM + screenshot canvas only', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => messages.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => messages.push(`[pageerror] ${e.message}`));

  await page.goto('/');
  await page.waitForSelector('#title-screen');
  await page.click('#menu-new-game');
  await page.waitForSelector('#begin-game');
  await page.click('#begin-game');
  await page.waitForTimeout(5000);
  const skip = page.locator('button', { hasText: 'Skip' });
  if (await skip.count()) await skip.first().click();
  await page.waitForTimeout(2000);

  const canvases = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('canvas'));
    return list.map((c) => {
      const rect = c.getBoundingClientRect();
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      let glInfo: Record<string, unknown> = { hasContext: !!gl };
      if (gl) {
        glInfo = {
          hasContext: true,
          version: gl.getParameter(gl.VERSION),
          renderer: gl.getParameter(gl.RENDERER),
          contextLost: gl.isContextLost(),
        };
      }
      return {
        id: c.id ?? '(no id)',
        w: c.width,
        h: c.height,
        rectW: rect.width,
        rectH: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        gl: glInfo,
      };
    });
  });
  console.log('CANVASES:', JSON.stringify(canvases, null, 2));

  // Sample the r3f canvas at multiple points to see if there's ANY
  // non-sky-color painting happening.
  const samples = await page.evaluate(() => {
    const canvas = document.querySelector('canvas:not(#minimap-canvas)') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return [];
    const w = canvas.width;
    const h = canvas.height;
    const points = [
      [w / 2, h / 2], // center
      [w / 4, h / 2], // left
      [w * 0.75, h / 2], // right
      [w / 2, h / 4], // top
      [w / 2, h * 0.75], // bottom
      [w / 2, h * 0.9], // lower-mid (board should be here)
    ];
    const pixels: Array<{ x: number; y: number; rgba: number[] }> = [];
    for (const [x, y] of points) {
      const px = new Uint8Array(4);
      gl.readPixels(x as number, y as number, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      pixels.push({ x: x as number, y: y as number, rgba: Array.from(px) });
    }
    return pixels;
  });
  console.log('PIXEL SAMPLES:', JSON.stringify(samples, null, 2));

  writeFileSync('artifacts/debug-scene.log', messages.join('\n'), 'utf-8');
});
