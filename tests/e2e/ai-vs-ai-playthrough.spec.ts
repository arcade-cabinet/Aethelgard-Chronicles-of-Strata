import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.AIVAI.2 — AI-vs-AI playthrough capture.
 *
 * Loads the game at `/?ai-vs-ai=1&seed=<X>&mode=<Y>`. The App's
 * URL-driven auto-start sees the flag and commits a NewGameConfig
 * with aiVsAi=true; startGame attaches a yuka AiPlayer to BOTH
 * factions. No human input — the match plays itself.
 *
 * The harness advances the sim in ~5-second chunks via the
 * window.__game_advanceFrames test hook (already wired by
 * GameSession), screenshots after each chunk, and stops once
 * game.outcome leaves 'playing' OR a 300-second sim budget is
 * exhausted.
 *
 * Output: artifacts/ai-vs-ai/<mode>/frame-<NNN>.png
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/ai-vs-ai-playthrough.spec.ts
 */

const OUT_BASE = 'artifacts/ai-vs-ai';

const MODES = ['border-clash', 'frontier-raid'] as const;

interface FrameSummary {
  frame: number;
  outcome: string;
  woodPlayer: number;
  woodEnemy: number;
  goldPlayer: number;
  goldEnemy: number;
  killsPlayer: number;
  killsEnemy: number;
  tilesPlayer: number;
  tilesEnemy: number;
}

// M_POLISH3.AIVAI.5 — record video for every AI-vs-AI playthrough so
// the agent can review the WHOLE match as one artifact (instead of
// 12-13 sparse PNGs). 'on' keeps the .webm even on passing tests.
test.use({ video: { mode: 'on', size: { width: 1280, height: 720 } } });

test.describe('AI-vs-AI playthrough', () => {
  for (const mode of MODES) {
    test(`mode=${mode}`, async ({ page }) => {
      test.setTimeout(240_000);
      const outDir = join(OUT_BASE, mode);
      mkdirSync(outDir, { recursive: true });

      const seed = `aivai-${mode}`;
      await page.goto(`/?ai-vs-ai=1&seed=${seed}&mode=${mode}`);

      // wait for the test hook (GameSession mounts, __game_advanceFrames
      // becomes available) — confirms auto-start dispatched correctly
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
          'function',
        { timeout: 60_000 },
      );

      // dismiss onboarding overlay so screenshots aren't dimmed
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

      // initial paint warmup so the first screenshot is meaningful
      await page.waitForTimeout(2500);

      // M_POLISH3.AIVAI.4 — up to 60 chunks × 600 frames @ 60Hz =
      // 600 sim-seconds (10 sim-minutes) total. The advanceFrames
      // hook itself is the speed-up: it runs runEconomyTick synchronously
      // without waiting for r3f frames, so 36000 sim-frames complete
      // in ~30s wallclock. Most modes resolve within this window.
      const transcript: FrameSummary[] = [];
      let resolved = false;
      for (let chunk = 0; chunk < 60; chunk++) {
        const info = await page.evaluate(() => {
          interface G {
            outcome: string;
            economy: {
              player: { wood: number; gold: number; kills: number };
              enemy: { wood: number; gold: number; kills: number };
            };
            zones: {
              player: { controlled: Set<string> };
              enemy: { controlled: Set<string> };
            };
          }
          const w = window as unknown as {
            __game?: G;
            __game_advanceFrames?: (n: number) => void;
          };
          w.__game_advanceFrames?.(600);
          const g = w.__game;
          if (!g) return null;
          return {
            outcome: g.outcome,
            woodPlayer: Math.round(g.economy.player.wood),
            woodEnemy: Math.round(g.economy.enemy.wood),
            goldPlayer: Math.round(g.economy.player.gold),
            goldEnemy: Math.round(g.economy.enemy.gold),
            killsPlayer: g.economy.player.kills,
            killsEnemy: g.economy.enemy.kills,
            tilesPlayer: g.zones.player.controlled.size,
            tilesEnemy: g.zones.enemy.controlled.size,
          };
        });
        if (!info) break;

        // Screenshot every 5th chunk + on outcome resolution; full
        // ledger is in transcript.json. Keeps artifacts/ tractable
        // without losing the visual storyboard.
        if (chunk % 5 === 0 || info.outcome !== 'playing') {
          const slug = String(chunk).padStart(2, '0');
          await page.screenshot({
            path: join(outDir, `frame-${slug}-outcome-${info.outcome}.png`),
            fullPage: false,
          });
        }
        transcript.push({
          frame: chunk * 600,
          outcome: info.outcome,
          woodPlayer: info.woodPlayer,
          woodEnemy: info.woodEnemy,
          goldPlayer: info.goldPlayer,
          goldEnemy: info.goldEnemy,
          killsPlayer: info.killsPlayer,
          killsEnemy: info.killsEnemy,
          tilesPlayer: info.tilesPlayer,
          tilesEnemy: info.tilesEnemy,
        });

        if (info.outcome !== 'playing') {
          resolved = true;
          break;
        }
        // tiny breath between chunks so r3f's frameloop catches up
        // + screenshot has fresh paint. Shorter than the prior 150ms
        // since advanceFrames already drained the sim work.
        await page.waitForTimeout(50);
      }

      // M_POLISH3.AIVAI.3 — write the transcript as JSON (frame → state
      // diff). Each per-mode transcript pins the deterministic
      // playthrough at fixed seed; the file is committed and a
      // future regression test can replay + assert no divergence.
      writeFileSync(
        join(outDir, 'transcript.json'),
        JSON.stringify(
          {
            mode,
            seed,
            chunksRecorded: transcript.length,
            resolved,
            finalOutcome: transcript.at(-1)?.outcome ?? 'unknown',
            frames: transcript,
            recordedAt: '2026-05-24', // pinned date (not Date.now()) for diff stability
          },
          null,
          2,
        ),
        'utf-8',
      );

      // Final outcome screenshot
      await page.screenshot({
        path: join(outDir, '_final.png'),
        fullPage: false,
      });

      // M_POLISH3.AIVAI.5 — copy the recorded video into the per-mode
      // artifacts dir so the full match plays back as one .webm next
      // to its transcript + screenshots. video() is async and resolves
      // after the page closes; close manually so the path is
      // available before the test ends.
      const videoSrc = await page.video()?.path();
      await page.close();
      if (videoSrc) {
        try {
          copyFileSync(videoSrc, join(outDir, '_playthrough.webm'));
        } catch (err) {
          console.warn(`[${mode}] video copy failed:`, err);
        }
      }

      // The match either resolves OR we exceed the cap. Both are
      // valuable to capture; the test only fails if the simulation
      // itself froze (no frames advanced — the proxy returned null).
      if (transcript.length === 0) {
        throw new Error(
          `[${mode}] AI-vs-AI playthrough never advanced a frame — window.__game was null`,
        );
      }
      if (!resolved) {
        // record non-failure metadata for review
        const simSeconds = (transcript.length * 600) / 60;
        console.log(
          `[${mode}] AI-vs-AI did not resolve within ${transcript.length * 600} frames ` +
            `(${simSeconds}s sim-time, ${transcript.length} chunks captured).`,
        );
      } else {
        console.log(`[${mode}] AI-vs-AI resolved with outcome=${transcript.at(-1)?.outcome}.`);
      }
    });
  }
});
