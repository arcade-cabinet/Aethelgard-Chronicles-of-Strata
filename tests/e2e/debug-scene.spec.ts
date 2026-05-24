import { writeFileSync } from 'node:fs';
import { test } from '@playwright/test';

test('debug: capture scene console + errors', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (m) => {
    messages.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    messages.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`);
  });
  page.on('requestfailed', (r) => {
    messages.push(`[reqfail] ${r.method()} ${r.url()} - ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    messages.push(`[${r.status()}] ${r.url()}`);
  });

  // Listeners attached BEFORE goto so first-request 404s are caught.
  await page.goto('/');
  await page.waitForSelector('#title-screen');
  await page.click('#menu-new-game');
  await page.waitForSelector('#begin-game');
  await page.click('#begin-game');
  await page.waitForTimeout(4000);

  writeFileSync('artifacts/debug-scene.log', messages.join('\n'), 'utf-8');
});
