/**
 * M_V11.PERF.PROFILE — sim-loop perf profile harness.
 *
 * Spins up a 4-player AIVAI match (medium map), advances
 * runEconomyTick for 300 simulated seconds at 0.1s/tick (3000
 * ticks), and reports:
 *   - mean / p50 / p95 / max per-tick wall-clock duration (ms)
 *   - total wall-clock to run the sim
 *   - entity counts at start + end (mob churn signal)
 *   - GC pauses ≥ 5ms (via PerformanceObserver if available)
 *
 * Writes a JSON snapshot to docs/perf/v0.11-profile.json so
 * subsequent PROFILE runs (post-RECLAIM) can compare.
 *
 * Run: node --expose-gc scripts/perf-profile.mjs
 */
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use the tsx loader so we can import the TS source directly.
const HERE = dirname(fileURLToPath(import.meta.url));
process.chdir(`${HERE}/..`);

const { startGame, runEconomyTick } = await import('../src/game/game-state.ts');
const { AiPlayer } = await import('../src/ai/ai-player.ts');
const { Unit, FactionTrait } = await import('../src/ecs/components.ts');

const TICK_DT = 0.1;
const SIM_SECONDS = 300;
const TICKS = SIM_SECONDS / TICK_DT;

const gcPauses = [];
let observer = null;
try {
  observer = new PerformanceObserver((items) => {
    for (const entry of items.getEntries()) {
      if (entry.duration >= 5) gcPauses.push(entry.duration);
    }
  });
  observer.observe({ entryTypes: ['gc'] });
} catch {
  // GC observation unavailable; continue without it.
}

function countUnits(game) {
  let n = 0;
  for (const _ of game.world.query(Unit, FactionTrait)) n++;
  return n;
}

function p(durations, frac) {
  const sorted = [...durations].sort((a, b) => a - b);
  const i = Math.floor(frac * (sorted.length - 1));
  return sorted[i] ?? 0;
}

// 2 factions (player + enemy), both AI-driven for the profile run.
const game = startGame({
  seedPhrase: 'profile-alpha-bravo',
  mapSize: 12,
  difficulty: 'normal',
  eventSeed: 'profile-events',
});
for (const fid of ['player', 'enemy']) {
  game.aiPlayers[fid] = new AiPlayer(fid);
  const eco = game.economy[fid];
  eco.wood = 9999;
  eco.stone = 9999;
  eco.gold = 9999;
  eco.maxSupply = 50;
}

const startUnits = countUnits(game);
const startWallClock = performance.now();
const tickDurations = new Array(TICKS);

for (let i = 0; i < TICKS; i++) {
  const t0 = performance.now();
  runEconomyTick(game, TICK_DT);
  tickDurations[i] = performance.now() - t0;
}

const endWallClock = performance.now();
const endUnits = countUnits(game);

const total = endWallClock - startWallClock;
const mean = tickDurations.reduce((s, x) => s + x, 0) / tickDurations.length;
const result = {
  cycle: 'v0.11',
  capturedAt: new Date().toISOString(),
  config: {
    factions: ['player', 'enemy'],
    aiPlayers: ['player', 'enemy'],
    mapSize: 12,
    simSeconds: SIM_SECONDS,
    tickDt: TICK_DT,
    ticks: TICKS,
  },
  perTickMs: {
    mean: Number(mean.toFixed(3)),
    p50: Number(p(tickDurations, 0.5).toFixed(3)),
    p95: Number(p(tickDurations, 0.95).toFixed(3)),
    max: Number(Math.max(...tickDurations).toFixed(3)),
  },
  totalWallClockMs: Number(total.toFixed(0)),
  realtimeRatio: Number(((SIM_SECONDS * 1000) / total).toFixed(2)),
  entityCounts: { start: startUnits, end: endUnits },
  gcPauses: {
    count: gcPauses.length,
    totalMs: Number(gcPauses.reduce((s, x) => s + x, 0).toFixed(1)),
    maxMs: Number((gcPauses.length > 0 ? Math.max(...gcPauses) : 0).toFixed(1)),
  },
};

observer?.disconnect();

mkdirSync('docs/perf', { recursive: true });
writeFileSync('docs/perf/v0.11-profile.json', `${JSON.stringify(result, null, 2)}\n`);

console.log(JSON.stringify(result, null, 2));
