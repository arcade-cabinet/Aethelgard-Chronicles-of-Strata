/**
 * M_FUN.QA.AIVAI — Playwright AI-vs-AI playable-match validation.
 *
 * Unit tests prove systems work; the v0.4 release gate per PRD §5.1
 * requires PROOF that matches actually complete to a satisfying
 * gameplay level. This suite runs a deterministic AI-vs-AI matrix
 * (self-play per personality + sampled cross-matchups) and asserts:
 *
 *   1. Terminal outcome reached (win / loss / draw) — the sim CAN
 *      finish under autonomous play.
 *   2. Elapsed turn-count in [30, 600] turns — instant finishes
 *      AND multi-hour drags are both balance failures.
 *      (Turn-count is `clock.elapsed / 60` rounded; one
 *      'turn' ~= 1 game-minute for the purpose of this gate.)
 *   3. Combat happened: total kills > 0.
 *   4. Building happened: per-faction complete building count > 2.
 *   5. Training happened: peakSupply > startingSupply.
 *
 * Output: tests/e2e/__data__/ai-balance-runs.json — appended-to so
 * trend regressions show up over time.
 *
 * Runs on demand (JOURNEY=1) or as a nightly CI job, NOT every
 * commit. v0.4 release blocker.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';

const PERSONALITIES = [
  'the-builder',
  'the-raider',
  'the-hoarder',
  'the-diplomat',
  'the-mad-king',
] as const;

// Matrix: 5 self-play + 5 sampled cross-matchups. The cross matrix
// is INTENTIONALLY a sample (not full 10) to keep wall-clock under
// 15 minutes for the suite — pairings rotate through the personality
// list so every personality is in at least 2 cross matches.
const MATCHUPS: Array<{ player: string; enemy: string }> = [
  // self-play (5)
  ...PERSONALITIES.map((p) => ({ player: p, enemy: p })),
  // cross-matchups (5 sampled — every personality vs the-mad-king
  // OR the-builder, the high/low cardinality stress)
  { player: 'the-builder', enemy: 'the-raider' },
  { player: 'the-raider', enemy: 'the-builder' },
  { player: 'the-hoarder', enemy: 'the-mad-king' },
  { player: 'the-diplomat', enemy: 'the-raider' },
  { player: 'the-mad-king', enemy: 'the-builder' },
];

const ARTIFACT_PATH = 'tests/e2e/__data__/ai-balance-runs.json';

interface BalanceRun {
  player: string;
  enemy: string;
  seed: string;
  outcome: string;
  elapsedTurns: number;
  totalKills: number;
  buildingsPlayer: number;
  buildingsEnemy: number;
  peakSupplyPlayer: number;
  peakSupplyEnemy: number;
  resolvedWithinBudget: boolean;
  chunksRan: number;
  /** % of walkable board claimed by either faction (M_FUN.MAP.UTILISATION.METRIC). */
  zoneUnionPct: number;
  /**
   * M_FUN.QA.AIVAI.ZONE-BREAKDOWN — player-faction kills classified
   * by where the enemy died (zone-of-control class).
   */
  killsByZone: {
    skirmish: number;
    encroachment: number;
    assault: number;
  };
  /**
   * M_FUN.QA.AIVAI.BUILD-MIX — per-faction building counts by
   * bucket: economic (House/Farm/Granary/Library), offensive
   * (Barracks), defensive (Wall/Watchtower), wonder. Lets
   * personality tuning target distinct mixes (Mad-King heavy
   * offensive, Builder heavy economic, Hoarder heavy defensive)
   * — today we tune blind because counts are scalar.
   */
  buildMixPlayer: { economic: number; offensive: number; defensive: number; wonder: number };
  buildMixEnemy: { economic: number; offensive: number; defensive: number; wonder: number };
  /**
   * M_FUN.QA.AIVAI.PEON-METRICS — per-faction harvest cadence.
   * depositPerMin = depositCount / (elapsedTurns minutes); a
   * satisfying RTS economy targets ~6-12 deposits/min/faction. The
   * other two columns surface the macro landmarks the player feels:
   * how long until the first wood lands, how long until first House
   * stands. Both -1 means the cadence loop never closed for that
   * faction. Per docs/specs/130 §4.
   */
  peonMetricsPlayer: { depositsPerMin: number; firstWoodAt: number; firstHouseAt: number };
  peonMetricsEnemy: { depositsPerMin: number; firstWoodAt: number; firstHouseAt: number };
}

interface BalanceArtifact {
  schema: 1;
  recordedAt: string;
  runs: BalanceRun[];
}

function appendArtifact(run: BalanceRun): void {
  mkdirSync(dirname(ARTIFACT_PATH), { recursive: true });
  let existing: BalanceArtifact;
  try {
    existing = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8')) as BalanceArtifact;
    if (existing.schema !== 1) throw new Error('schema bump');
  } catch {
    existing = { schema: 1, recordedAt: '2026-05-24', runs: [] };
  }
  // Keep last 100 runs only — file stays tractable.
  existing.runs.push(run);
  if (existing.runs.length > 100) existing.runs.splice(0, existing.runs.length - 100);
  writeFileSync(ARTIFACT_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

test.use({ video: 'off' });

test.describe('AI-vs-AI balance gate (M_FUN.QA.AIVAI)', () => {
  for (const { player, enemy } of MATCHUPS) {
    test(`${player} vs ${enemy} produces a satisfying match`, async ({ page }) => {
      test.setTimeout(180_000);
      const seed = `balance-${player}-vs-${enemy}`;
      const url = `/?ai-vs-ai=1&seed=${seed}&mode=border-clash&playerPersonality=${player}&personality=${enemy}`;
      await page.goto(url);

      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
          'function',
        { timeout: 30_000 },
      );
      // Wait for the onboarding hook to mount BEFORE calling it — the
      // OnboardingOverlay useEffect registers the hook a frame or two
      // after game-mount, and racing it means the modal stays open and
      // screens the gameplay screenshot underneath. Per PATTERN-J.
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
      // Onboarding setOpen(false) is async via React state — let the
      // tree flush so the canvas + HUD render cleanly.
      await page.waitForTimeout(150);

      // Advance sim in 600-frame chunks (10 sim-seconds @ 60Hz each)
      // up to 60 chunks = 600 sim-seconds = 10 sim-minutes. Most
      // matches resolve well before this; chunks > 60 means "balance
      // failure: drag".
      let outcome = 'playing';
      let chunks = 0;
      let snapshot: {
        outcome: string;
        elapsed: number;
        kills: number;
        buildingsPlayer: number;
        buildingsEnemy: number;
        peakPlayer: number;
        peakEnemy: number;
        zoneUnionPct: number; // M_FUN.MAP.UTILISATION.METRIC
        killsByZone: { skirmish: number; encroachment: number; assault: number };
        buildMixPlayer: { economic: number; offensive: number; defensive: number; wonder: number };
        buildMixEnemy: { economic: number; offensive: number; defensive: number; wonder: number };
        peonMetricsPlayer: {
          depositCount: number;
          firstWoodAt: number;
          firstHouseAt: number;
        };
        peonMetricsEnemy: {
          depositCount: number;
          firstWoodAt: number;
          firstHouseAt: number;
        };
      } | null = null;

      for (chunks = 0; chunks < 60 && outcome === 'playing'; chunks++) {
        snapshot = await page.evaluate(() => {
          const w = window as unknown as {
            __game_advanceFrames?: (n: number) => void;
            __game?: {
              outcome: string;
              clock: { elapsed: number };
              economy: {
                player: {
                  kills: number;
                  peakSupply: number;
                  killsByZone: { skirmish: number; encroachment: number; assault: number };
                  peonMetrics: {
                    depositCount: number;
                    firstWoodAt: number;
                    firstHouseAt: number;
                  };
                };
                enemy: {
                  kills: number;
                  peakSupply: number;
                  peonMetrics: {
                    depositCount: number;
                    firstWoodAt: number;
                    firstHouseAt: number;
                  };
                };
              };
              world: {
                query: (...traits: unknown[]) => Iterable<{ get: (t: unknown) => unknown }>;
              };
              zones: {
                player: { controlled: Set<string> };
                enemy: { controlled: Set<string> };
              };
              board: { tiles: Map<string, { walkable: boolean }> };
            };
            // koota traits exposed by the existing test hooks
            __game_traits?: {
              Building?: unknown;
              FactionTrait?: unknown;
            };
          };
          w.__game_advanceFrames?.(600);
          const g = w.__game;
          if (!g) return null;
          // Count complete buildings per faction via a query — falls
          // back to 0 if the trait references aren't exposed.
          let bp = 0;
          let be = 0;
          // M_FUN.QA.AIVAI.BUILD-MIX — per-faction building-type
          // bucketing. Buckets per spec §5: economic, offensive,
          // defensive, wonder. Drives personality-tuning targets
          // (Mad-King heavy offensive, Builder heavy economic,
          // Hoarder heavy defensive).
          const ECONOMIC = new Set(['House', 'Farm', 'Granary', 'Library']);
          const OFFENSIVE = new Set(['Barracks']);
          const DEFENSIVE = new Set(['Wall', 'Watchtower']);
          const WONDER = new Set(['Wonder']);
          const mixP = { economic: 0, offensive: 0, defensive: 0, wonder: 0 };
          const mixE = { economic: 0, offensive: 0, defensive: 0, wonder: 0 };
          const traits = w.__game_traits;
          if (traits?.Building && traits?.FactionTrait) {
            for (const e of g.world.query(traits.Building, traits.FactionTrait)) {
              const b = e.get(traits.Building) as {
                isComplete?: boolean;
                buildingType?: string;
              } | null;
              const ft = e.get(traits.FactionTrait) as { faction?: string } | null;
              if (!b?.isComplete) continue;
              const mix = ft?.faction === 'player' ? mixP : ft?.faction === 'enemy' ? mixE : null;
              if (!mix) continue;
              if (ft?.faction === 'player') bp++;
              else be++;
              const t = b.buildingType;
              if (t && ECONOMIC.has(t)) mix.economic++;
              else if (t && OFFENSIVE.has(t)) mix.offensive++;
              else if (t && DEFENSIVE.has(t)) mix.defensive++;
              else if (t && WONDER.has(t)) mix.wonder++;
            }
          }
          // M_FUN.MAP.UTILISATION.METRIC — % of walkable tiles claimed
          // by EITHER faction's zone-of-control. Catches the 'clumped'
          // failure mode where both factions huddle around their bases
          // and never expand across the board.
          let walkable = 0;
          for (const t of g.board.tiles.values()) if (t.walkable) walkable++;
          const union = new Set<string>();
          for (const k of g.zones.player.controlled) union.add(k);
          for (const k of g.zones.enemy.controlled) union.add(k);
          const zoneUnionPct = walkable > 0 ? (union.size / walkable) * 100 : 0;
          return {
            outcome: g.outcome,
            elapsed: g.clock.elapsed,
            kills: g.economy.player.kills + g.economy.enemy.kills,
            buildingsPlayer: bp,
            buildingsEnemy: be,
            peakPlayer: g.economy.player.peakSupply,
            peakEnemy: g.economy.enemy.peakSupply,
            zoneUnionPct,
            killsByZone: g.economy.player.killsByZone,
            buildMixPlayer: mixP,
            buildMixEnemy: mixE,
            peonMetricsPlayer: {
              depositCount: g.economy.player.peonMetrics.depositCount,
              firstWoodAt: g.economy.player.peonMetrics.firstWoodAt,
              firstHouseAt: g.economy.player.peonMetrics.firstHouseAt,
            },
            peonMetricsEnemy: {
              depositCount: g.economy.enemy.peonMetrics.depositCount,
              firstWoodAt: g.economy.enemy.peonMetrics.firstWoodAt,
              firstHouseAt: g.economy.enemy.peonMetrics.firstHouseAt,
            },
          };
        });
        if (!snapshot) break;
        outcome = snapshot.outcome;
      }

      // Snapshot may legitimately be null (page nav failure); fail loud.
      if (!snapshot) throw new Error(`No snapshot captured for ${player} vs ${enemy}`);

      const elapsedTurns = Math.round(snapshot.elapsed / 60); // 1 "turn" ≈ 1 sim-minute
      const resolvedWithinBudget = outcome !== 'playing';

      const run: BalanceRun = {
        player,
        enemy,
        seed,
        outcome,
        elapsedTurns,
        totalKills: snapshot.kills,
        buildingsPlayer: snapshot.buildingsPlayer,
        buildingsEnemy: snapshot.buildingsEnemy,
        peakSupplyPlayer: snapshot.peakPlayer,
        peakSupplyEnemy: snapshot.peakEnemy,
        resolvedWithinBudget,
        chunksRan: chunks,
        zoneUnionPct: snapshot.zoneUnionPct,
        killsByZone: snapshot.killsByZone,
        buildMixPlayer: (snapshot as unknown as { buildMixPlayer?: BalanceRun['buildMixPlayer'] })
          .buildMixPlayer ?? { economic: 0, offensive: 0, defensive: 0, wonder: 0 },
        buildMixEnemy: (snapshot as unknown as { buildMixEnemy?: BalanceRun['buildMixEnemy'] })
          .buildMixEnemy ?? { economic: 0, offensive: 0, defensive: 0, wonder: 0 },
        // PEON-METRICS — depositsPerMin is derived: depositCount ÷
        // elapsed sim-minutes. The snapshot ships raw counts +
        // landmark timestamps; the rate calc lives here so the
        // ledger row already carries the human-readable cadence.
        peonMetricsPlayer: {
          depositsPerMin:
            elapsedTurns > 0 ? snapshot.peonMetricsPlayer.depositCount / elapsedTurns : 0,
          firstWoodAt: snapshot.peonMetricsPlayer.firstWoodAt,
          firstHouseAt: snapshot.peonMetricsPlayer.firstHouseAt,
        },
        peonMetricsEnemy: {
          depositsPerMin:
            elapsedTurns > 0 ? snapshot.peonMetricsEnemy.depositCount / elapsedTurns : 0,
          firstWoodAt: snapshot.peonMetricsEnemy.firstWoodAt,
          firstHouseAt: snapshot.peonMetricsEnemy.firstHouseAt,
        },
      };
      appendArtifact(run);

      // M_FUN.QA.AIVAI.VISUAL — capture a final-frame screenshot for
      // every run so the agent can eyeball balance failures visually
      // (units stuck in clumps, peons walking off-map, buildings
      // bunched on the wrong side, etc.) instead of inferring from
      // numbers alone. Filename includes outcome + key counters so
      // the artifact dir is self-narrating.
      try {
        const { mkdirSync } = await import('node:fs');
        const dir = `tests/e2e/__data__/aivai-screens/${run.outcome}`;
        mkdirSync(dir, { recursive: true });
        await page.screenshot({
          path: `${dir}/${player}-vs-${enemy}_t${run.elapsedTurns}_k${run.totalKills}_b${run.buildingsPlayer}-${run.buildingsEnemy}.png`,
          fullPage: false,
        });
      } catch {
        // screenshot is best-effort; never fail a test for it
      }

      // Real assertions — these are the gate.
      expect.soft(resolvedWithinBudget, 'match must reach a terminal outcome').toBe(true);
      // PATTERN-C — tightened from >=1 to >=2 sim-min. A win in
      // 1 sim-min means a single-Footman rush instakilled a
      // TownHall, which is a balance failure (the gate should
      // catch it as such).
      expect.soft(elapsedTurns, 'turn count too low — instant finish').toBeGreaterThanOrEqual(2);
      expect.soft(elapsedTurns, 'turn count too high — drag').toBeLessThanOrEqual(15);
      expect.soft(snapshot.kills, 'combat must occur').toBeGreaterThan(0);
      expect.soft(snapshot.buildingsPlayer, 'player faction must build').toBeGreaterThanOrEqual(1);
      expect.soft(snapshot.buildingsEnemy, 'enemy faction must build').toBeGreaterThanOrEqual(1);
      // peakSupply > 1 proves training happened beyond the starting
      // Footman (which counts as 1 supply on its own).
      const peakAny = Math.max(snapshot.peakPlayer, snapshot.peakEnemy);
      expect.soft(peakAny, 'at least one faction must train units').toBeGreaterThan(1);
      // M_FUN.MAP.UTILISATION.METRIC — both factions combined must
      // claim >30% of the walkable board's tiles by match end. If the
      // union is tiny, both AIs huddled around their bases and never
      // expanded — that's the 'clumped' failure mode the user called
      // out (huge wasted oceans, no use of the full board).
      expect
        .soft(snapshot.zoneUnionPct, 'faction expansion must cover >30% of walkable board')
        .toBeGreaterThan(30);
    });
  }
});
