#!/usr/bin/env node
/**
 * M_V7.VISUAL.BATTERY — per-cycle visual-regression script.
 *
 * Aggregates every per-component browser harness baseline in
 * tests/harness/__screenshots__/ into a single command:
 *
 *   pnpm visual:battery       — run all harnesses, write fresh baselines,
 *                               diff against committed (display result)
 *   pnpm visual:battery --ci  — read-only: run all harnesses, fail on drift
 *
 * Touches src/render/**, src/world/**, src/hud/**, src/ui/** should trigger
 * this in the pre-commit gate. CI runs --ci mode on every commit touching
 * those directories.
 *
 * Implementation: shells `pnpm test:browser tests/harness/` (every .browser.test.tsx
 * file in tests/harness/), then compares the resulting __screenshots__/*.png
 * against the committed baselines via git diff. Drift = fail.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const HARNESS_DIR = resolve(ROOT, 'tests/harness');
const BASELINES_DIR = resolve(HARNESS_DIR, '__screenshots__');

const args = process.argv.slice(2);
const CI_MODE = args.includes('--ci');

function log(msg) {
  console.log(`[visual-battery] ${msg}`);
}

function die(msg, code = 1) {
  console.error(`[visual-battery] ERROR: ${msg}`);
  process.exit(code);
}

if (!existsSync(HARNESS_DIR)) {
  die(`harness dir not found: ${HARNESS_DIR}`);
}

// Enumerate every .browser.test.tsx in tests/harness/.
const harnessFiles = readdirSync(HARNESS_DIR)
  .filter((f) => f.endsWith('.browser.test.tsx'))
  .map((f) => `tests/harness/${f}`);

if (harnessFiles.length === 0) {
  die('no harness files found');
}

log(`running ${harnessFiles.length} harness file(s):`);
for (const f of harnessFiles) log(`  - ${f}`);

// Capture pre-run state of __screenshots__/ via git so we can diff.
let beforeStatus = '';
if (CI_MODE) {
  try {
    beforeStatus = execSync('git status --porcelain tests/harness/__screenshots__/', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
  } catch (err) {
    die(`git status failed: ${err}`);
  }
  if (beforeStatus.trim().length > 0) {
    die(
      'tests/harness/__screenshots__/ has uncommitted changes before run — commit or reset before --ci mode',
    );
  }
}

// Run the harnesses.
log(`running pnpm test:browser ${harnessFiles.join(' ')}...`);
try {
  execSync(`pnpm test:browser ${harnessFiles.join(' ')}`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch {
  die('one or more harnesses failed — fix the failing test before re-running visual battery');
}

// Check baseline count.
if (!existsSync(BASELINES_DIR)) {
  die(`baselines dir not created: ${BASELINES_DIR}`);
}
const baselineCount = readdirSync(BASELINES_DIR).filter((f) => f.endsWith('.png')).length;
log(`baseline screenshots produced: ${baselineCount}`);

// Compare against committed baselines.
const afterStatus = execSync('git status --porcelain tests/harness/__screenshots__/', {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (afterStatus.trim().length === 0) {
  log('baselines clean — no visual drift detected.');
  process.exit(0);
}

if (CI_MODE) {
  console.error('[visual-battery] DRIFT DETECTED in CI mode:');
  console.error(afterStatus);
  console.error('[visual-battery] failing — run `pnpm visual:battery` locally + commit baselines');
  process.exit(1);
}

// Update mode: print the diff for review.
log(`baselines updated — ${afterStatus.split('\n').filter(Boolean).length} file(s) changed:`);
log(afterStatus);
log('review the diff with `git diff tests/harness/__screenshots__/` then commit if intended.');
log('CI gate: `pnpm visual:battery --ci` will fail until the updated baselines are committed.');

// Surface file sizes so the reviewer can sanity-check (a 0-byte PNG = harness crash).
log('baseline file sizes:');
for (const f of readdirSync(BASELINES_DIR)) {
  if (!f.endsWith('.png')) continue;
  const path = resolve(BASELINES_DIR, f);
  const size = statSync(path).size;
  log(`  ${f}  ${size} bytes`);
}
