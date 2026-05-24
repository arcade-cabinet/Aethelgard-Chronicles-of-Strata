import { mkdirSync, writeFileSync } from 'node:fs';
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

test.describe('AI-vs-AI playthrough', () => {
  for (const mode of MODES) {
    test(`mode=${mode}`, async ({ page }) => {
      test.setTimeout(120_000);
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
        { timeout: 30_000 },
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

      // up to 18 chunks × 300 frames @ 60Hz = 90 sim-seconds total.
      // Most modes resolve in ~60-120s of sim; if we hit the cap,
      // the assertion below records "did not converge" but the
      // screenshots still review.
      const transcript: FrameSummary[] = [];
      let resolved = false;
      for (let chunk = 0; chunk < 18; chunk++) {
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
          w.__game_advanceFrames?.(300);
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

        const slug = String(chunk).padStart(2, '0');
        await page.screenshot({
          path: join(outDir, `frame-${slug}-outcome-${info.outcome}.png`),
          fullPage: false,
        });
        transcript.push({
          frame: chunk * 300,
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
        await page.waitForTimeout(150);
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
        console.log(
          `[${mode}] AI-vs-AI did not resolve within 5400 frames (${transcript.length} chunks captured).`,
        );
      } else {
        console.log(`[${mode}] AI-vs-AI resolved with outcome=${transcript.at(-1)?.outcome}.`);
      }
    });
  }
});
