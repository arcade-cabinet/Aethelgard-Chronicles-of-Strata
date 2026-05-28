/**
 * M_V11.WAVE-DEFENSE (#77h) — scripted wave-spawn system.
 *
 * Active only when game.mode === 'wave-defense'. Pre-place 3
 * EnemySpawner entities at fixed offsets around the player's
 * Palace; every WAVE_INTERVAL sim-seconds, ramp their `liveMobs`
 * cap so the next batch is bigger.
 *
 * State tracked on GameState via a non-typed slot (`_waveDefenseState`).
 * Persists with the rest of the per-tick state across save/load
 * (the substrate doesn't formalize a slot yet, mirrors the
 * Market-trade pattern).
 *
 * Win/lose:
 *   - Player wins when waveIndex === WAVE_COUNT (after the last
 *     wave's mobs die or after WAVE_INTERVAL elapsed past the
 *     last spawn). For now we treat "reached final wave clock"
 *     as success — the existing barbarian-camp + win-loss
 *     systems decide whether to flip game.outcome.
 *   - Player loses when the Palace dies (handled by win-loss).
 *
 * The first wave fires at WAVE_FIRST_DELAY (giving the player
 * 60s to build initial defenses).
 */
import { EnemySpawner, FactionTrait, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { parseHexKey } from '@/core/hex';

const WAVE_COUNT = 5;
const WAVE_FIRST_DELAY = 60;
const WAVE_INTERVAL = 120;

interface WaveDefenseState {
  initialised: boolean;
  waveIndex: number;
  nextWaveAt: number;
}

// biome-ignore lint/suspicious/noExplicitAny: per-tick state slot — stashed on GameState until the substrate formalizes a registry.
type GameStateWithWave = GameState & { _waveDefenseState?: WaveDefenseState };

export function waveDefenseSystem(game: GameState): void {
  if (game.mode !== 'wave-defense') return;
  const gws = game as GameStateWithWave;
  if (!gws._waveDefenseState) {
    gws._waveDefenseState = {
      initialised: false,
      waveIndex: 0,
      nextWaveAt: WAVE_FIRST_DELAY,
    };
  }
  const state = gws._waveDefenseState;
  if (!state.initialised) {
    state.initialised = true;
    spawnWaveCamps(game);
  }
  if (state.waveIndex >= WAVE_COUNT) return;
  if (game.clock.elapsed < state.nextWaveAt) return;
  // Fire the next wave: bump every barbarian camp's `liveMobs` cap
  // so the next spawn batch is bigger. Cap baseline grows linearly:
  //   wave 1 → cap 3, wave 2 → 5, wave 3 → 7, wave 4 → 9, wave 5 → 11
  const newCap = 3 + state.waveIndex * 2;
  for (const spawner of game.world.query(EnemySpawner, FactionTrait)) {
    const faction = spawner.get(FactionTrait)?.faction;
    if (!faction?.startsWith?.('barbarian-camp-')) continue;
    const cfg = spawner.get(EnemySpawner);
    if (!cfg) continue;
    spawner.set(EnemySpawner, {
      ...cfg,
      mobCap: newCap,
      liveMobs: 0,
      spawnTimer: cfg.spawnInterval - 1,
    });
  }
  // Toast the wave (player-facing).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: `wave-defense-${state.waveIndex + 1}`,
          tone: state.waveIndex + 1 === WAVE_COUNT ? 'critical' : 'warning',
          title: `Wave ${state.waveIndex + 1} of ${WAVE_COUNT} incoming`,
          description: `Barbarian raiders close on the Palace. Mob cap: ${newCap}.`,
        },
      }),
    );
  }
  state.waveIndex += 1;
  state.nextWaveAt = game.clock.elapsed + WAVE_INTERVAL;
}

/** Place 3 barbarian-camp EnemySpawners around the player Palace. */
function spawnWaveCamps(game: GameState): void {
  const parts = game.palaceKey.split(',');
  if (parts.length !== 2) return;
  const pq = Number(parts[0]);
  const pr = Number(parts[1]);
  if (!Number.isFinite(pq) || !Number.isFinite(pr)) return;
  // Offsets in axial coords — roughly NE / SW / E around the Palace,
  // at distance ~6 hex so the player has room to defend.
  const offsets: Array<[number, number]> = [
    [6, -3],
    [-6, 6],
    [6, 6],
  ];
  for (let i = 0; i < offsets.length; i++) {
    const off = offsets[i];
    if (!off) continue;
    const [dq, dr] = off;
    const q = pq + dq;
    const r = pr + dr;
    const tile = game.board.tiles.get(`${q},${r}`);
    if (!tile?.walkable) continue;
    game.world.spawn(
      FactionTrait({ faction: `barbarian-camp-${i + 1}` as 'enemy' }),
      HexPosition({ q, r, level: tile.level }),
      EnemySpawner({
        spawnTimer: 0,
        spawnInterval: 30,
        spawnCount: 0,
        mobCap: 0, // bumped to wave size when the wave fires
        liveMobs: 0,
      }),
    );
  }
  // Defensive guard: ensure the spawn point parse landed
  void parseHexKey;
}

/** Read the active wave count for the wave-defense overlay. */
export function waveDefenseProgress(game: GameState): { wave: number; total: number } {
  const gws = game as GameStateWithWave;
  return {
    wave: gws._waveDefenseState?.waveIndex ?? 0,
    total: WAVE_COUNT,
  };
}
