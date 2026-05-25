#!/usr/bin/env node
// AIVAI playthrough screenshot battery — exercises a v0.4 match end-to-end
// and captures viewport screenshots at deterministic intervals so the
// agent (or a human reviewer) can confirm the visual state of the build
// without sitting through the match in real time.
//
// Strategy: launch the LIVE Pages deploy in headless Chromium, skip the
// onboarding via the `__skipOnboarding` hook, start an AIVAI match
// with seed `polish-the-builder-vs-the-raider` (asymmetric matchup to
// exercise both Build + Military evaluators on the same board), then
// step time via `window.__game.advanceSimSeconds(N)` and screenshot at
// each landmark.
//
// Landmarks (every 30 sim-sec for the first 3 min, then every 60s for
// the long tail — 30s catches early-game build cadence, 60s plenty for
// mid/late-game mass + zone expansion):
//   t=0    landing — title + UI chrome
//   t=5    first paint — board lit, units placed
//   t=30   first-House threshold — both factions should be harvesting
//   t=60   first build complete — peon → House visible
//   t=90   second-tier (Barracks / Watchtower) breakouts
//   t=120  2-min — supply cap clearly distinct between factions
//   t=180  3-min PATTERN-B rage-quit threshold — military boost fires
//   t=240..600 every 60s — mass + zone expansion through endgame
//
// Output: writes PNGs to .agent-state/ownership/playthrough/<ts>/ and
// a manifest.json with timing + URL + sha for reproducibility.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const PAGES_URL = process.env.PAGES_URL ?? 'https://arcade-cabinet.github.io/Aethelgard-Chronicles-of-Strata/';
const SEED = process.env.AIVAI_SEED ?? 'polish-the-builder-vs-the-raider';
const PLAYER_PERS = process.env.PLAYER_PERSONALITY ?? 'the-builder';
const ENEMY_PERS = process.env.ENEMY_PERSONALITY ?? 'the-raider';

const LANDMARKS = [
  { t: 0, label: '00-landing' },
  { t: 5, label: '05-first-paint' },
  { t: 30, label: '030-first-harvest' },
  { t: 60, label: '060-first-build' },
  { t: 90, label: '090-tier2-breakout' },
  { t: 120, label: '120-supply-cap-distinct' },
  { t: 180, label: '180-rage-quit-threshold' },
  { t: 240, label: '240-mid-game' },
  { t: 300, label: '300-mid-late' },
  { t: 360, label: '360-mass-formed' },
  { t: 420, label: '420-zone-expansion' },
  { t: 480, label: '480-late-game' },
  { t: 540, label: '540-endgame-pressure' },
  { t: 600, label: '600-endgame' },
];

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `.agent-state/ownership/playthrough/${ts}`;
const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
});

const url = `${PAGES_URL}?ai-vs-ai=1&seed=${SEED}&playerPersonality=${PLAYER_PERS}&personality=${ENEMY_PERS}&mode=border-clash&skipOnboarding=1`;
console.log(`[aivai] navigating ${url}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });

// Wait for the runtime test hook the dev build exposes. The onboarding
// auto-skip + game-state mount happen within ~2 frames once the bundle
// is parsed; allow up to 30s for the prod CDN cold start.
// Onboarding may auto-skip via the URL param OR via the test hook.
// Wait for either path then for the game-state hook.
await page.waitForFunction(
  () => {
    const w = globalThis;
    return typeof w.__skipOnboarding === 'function' || typeof w.__game !== 'undefined';
  },
  { timeout: 30_000 },
);
if (await page.evaluate(() => typeof globalThis.__skipOnboarding === 'function')) {
  await page.evaluate(() => globalThis.__skipOnboarding?.());
}
await page.waitForFunction(
  () => typeof globalThis.__game !== 'undefined' && typeof globalThis.__game_advanceFrames === 'function',
  { timeout: 30_000 },
);
console.log('[aivai] __game hook ready');

const manifest = {
  ts,
  sha,
  url,
  seed: SEED,
  player: PLAYER_PERS,
  enemy: ENEMY_PERS,
  viewport: { width: 1440, height: 900 },
  landmarks: [],
  errors: [],
};

let prevT = 0;
for (const lm of LANDMARKS) {
  const dt = lm.t - prevT;
  if (dt > 0) {
    // The existing test hook is __game_advanceFrames(n) at 60Hz fixed-step.
    await page.evaluate((sec) => globalThis.__game_advanceFrames(sec * 60), dt);
    // Let r3f paint the new state — 2 rAF is the standard barrier.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
  }
  const file = `${outDir}/${lm.label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  const state = await page.evaluate(() => {
    const g = globalThis.__game?.game;
    if (!g) return null;
    return {
      clockElapsed: g.clock?.elapsed ?? null,
      playerBuildings: g.world ? [...g.world.query()].length : null,
      playerWood: g.economy?.player?.wood ?? null,
      enemyWood: g.economy?.enemy?.wood ?? null,
      outcome: g.outcome ?? null,
    };
  });
  manifest.landmarks.push({ t: lm.t, label: lm.label, file, state });
  console.log(`[aivai] ${lm.label} t=${lm.t}s captured (clock=${state?.clockElapsed?.toFixed(1)}s outcome=${state?.outcome})`);
  prevT = lm.t;
  if (state?.outcome && state.outcome !== 'playing') {
    console.log(`[aivai] match ended early — outcome=${state.outcome}`);
    break;
  }
}

manifest.errors = errors;
await writeFile(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));
await browser.close();

console.log(`\n[aivai] DONE — ${manifest.landmarks.length} screenshots written to ${outDir}`);
console.log(`[aivai] manifest: ${outDir}/manifest.json`);
if (errors.length > 0) {
  console.log(`[aivai] ⚠ ${errors.length} runtime errors captured — see manifest.errors`);
  for (const e of errors.slice(0, 5)) console.log(`   ${e}`);
}
