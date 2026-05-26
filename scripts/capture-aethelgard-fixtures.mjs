#!/usr/bin/env node
/**
 * capture-aethelgard-fixtures.mjs — M_HUD.SHELL.12.
 *
 * Boots vite, sweeps Playwright across desktop + Pixel 7 + iPhone 14
 * + iPad Mini + foldable + ultrawide viewports, screenshots each
 * Aethelgard screen by visiting `?fixture=<name>` and waiting for
 * `data-testid="fixture-root"` to render. Writes per-viewport PNGs
 * under `test-results/visual-fixtures/<viewport>/<fixture>.png`.
 *
 * Pattern lifted from
 * ~/src/arcade-cabinet/mean-streets/scripts/capture-visual-fixtures.mjs.
 *
 * Run via `pnpm visual:fixtures` (added to package.json).
 *
 * Use `PW_REUSE_SERVER=1` to skip the vite boot if a dev server is
 * already running on PORT.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { chromium, devices } from 'playwright';

const PORT = 41739;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}/`;
const REUSE_SERVER = process.env.PW_REUSE_SERVER === '1';
const EXPORT_DIR = resolve(process.cwd(), 'test-results', 'visual-fixtures');
const SCREENSHOT_TIMEOUT_MS = 30_000;
const SERVER_START_TIMEOUT_MS = 30_000;
const HEADLESS = process.env.PW_HEADLESS !== '0';

const PROJECTS = [
  ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ['ultrawide', { viewport: { width: 3440, height: 1440 } }],
  ['pixel-7', devices['Pixel 7']],
  ['iphone-14', devices['iPhone 14']],
  ['ipad-mini', devices['iPad Mini']],
  [
    'foldable-portrait',
    {
      ...devices['Pixel 7'],
      viewport: { width: 840, height: 2120 },
      deviceScaleFactor: 3,
    },
  ],
  [
    'foldable-landscape',
    {
      ...devices['Pixel 7'],
      viewport: { width: 2120, height: 840 },
      deviceScaleFactor: 3,
    },
  ],
];

const FIXTURES = [
  'title',
  'newgame',
  'onboarding',
  'gameover-win',
  'gameover-loss',
  'gameover-draw',
  'system-menu',
];

function isPortOpen(port) {
  return new Promise((res) => {
    const socket = net.createConnection({ host: HOST, port });
    socket.once('connect', () => {
      socket.end();
      res(true);
    });
    socket.once('error', () => res(false));
  });
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (r.ok) return;
    } catch {
      // ignore
    }
    await new Promise((res) => setTimeout(res, 250));
  }
  throw new Error(`server did not respond at ${url} within ${timeoutMs}ms`);
}

async function startServer() {
  if (REUSE_SERVER && (await isPortOpen(PORT))) {
    console.log('[fixtures] reusing existing dev server on port', PORT);
    return null;
  }
  console.log('[fixtures] starting vite on port', PORT);
  const child = spawn(
    'pnpm',
    ['exec', 'vite', '--host', HOST, '--port', String(PORT)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
    },
  );
  let stderr = '';
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
  });
  try {
    await waitForServer(BASE_URL, SERVER_START_TIMEOUT_MS);
    return child;
  } catch (err) {
    child.kill('SIGTERM');
    throw new Error(`[fixtures] vite did not boot: ${err.message}\n${stderr}`);
  }
}

async function captureAll() {
  const browser = await chromium.launch({ headless: HEADLESS });
  try {
    for (const [projectName, use] of PROJECTS) {
      const ctx = await browser.newContext(use);
      try {
        for (const fixture of FIXTURES) {
          const page = await ctx.newPage();
          try {
            await page.goto(`${BASE_URL}?fixture=${fixture}`);
            await page.waitForLoadState('networkidle').catch(() => undefined);
            // Wait for the fixture root to appear (it's how each fixture
            // tells us it has mounted).
            await page
              .waitForSelector('[data-testid="fixture-root"]', { timeout: 15_000 })
              .catch(() => undefined);
            // Extra settle for shaders / modal entry animations.
            await page.waitForTimeout(1200);
            const outputPath = join(EXPORT_DIR, projectName, `${fixture}.png`);
            mkdirSync(dirname(outputPath), { recursive: true });
            await page.screenshot({
              animations: 'disabled',
              path: outputPath,
              fullPage: false,
              timeout: SCREENSHOT_TIMEOUT_MS,
            });
            console.log(`[fixtures] ${projectName} ${fixture}`);
          } finally {
            await page.close();
          }
        }
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
}

let serverProc = null;
try {
  serverProc = await startServer();
  await captureAll();
  console.log(`[fixtures] OK — captures under ${EXPORT_DIR}`);
} catch (err) {
  console.error(`[fixtures] FAILED — ${err.message}`);
  process.exitCode = 1;
} finally {
  if (serverProc) serverProc.kill('SIGTERM');
}
