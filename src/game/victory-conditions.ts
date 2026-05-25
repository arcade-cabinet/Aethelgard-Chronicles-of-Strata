/**
 * M_V6.4X-FULL — 4X-mode victory condition detection.
 *
 * Per the v0.6 directive: "named victory conditions (military /
 * economic / scientific / diplomatic), end-of-game scoring screen."
 *
 * Each condition is a pure function of GameState. The runtime calls
 * `detectVictory(game)` each scoring tick; the first condition that
 * fires wins. Win attribution carries the kind + winner factionId so
 * the end-of-game scoring screen reads `game.victoryRecord`.
 *
 * Substrate ships the detectors + the record shape; the scoring-screen
 * UI is a follow-up render polish item.
 */
import type { FactionId } from '@/config/factions';
import { Building, FactionTrait } from '@/ecs/components';
import type { World } from 'koota';
import type { GameState } from './game-state';

/** The four named v0.6 4X-mode victory conditions. */
export type VictoryKind = 'military' | 'economic' | 'scientific' | 'diplomatic';

export interface VictoryRecord {
  kind: VictoryKind;
  winner: FactionId;
  /** Sim-clock seconds at which the condition was detected. */
  detectedAtSeconds: number;
}

/** Per-condition threshold values — tunable in one place. */
export const VICTORY_THRESHOLDS = {
  /** Player must own >= this many enemy bases (proxy: enemy bases destroyed). */
  militaryEnemyBaseDestroys: 1,
  /** Player must accumulate this much gold AND a Wonder built. */
  economicGold: 5000,
  /** Player must purchase this many Discoveries. */
  scientificDiscoveries: 6,
  /** Player must hold tributary/ally relations with this many other factions. */
  diplomaticAlliances: 3,
};

/** Count the legacy-eco wood/stone/gold sum + check Wonder presence. */
function ecoTotal(eco: { wood: number; stone: number; gold: number }): number {
  return eco.wood + eco.stone + eco.gold;
}

function hasWonder(world: World, faction: FactionId): boolean {
  for (const e of world.query(Building, FactionTrait)) {
    const b = e.get(Building);
    const f = e.get(FactionTrait)?.faction as unknown as string | undefined;
    if (f === faction && b?.buildingType === 'Wonder' && b.isComplete) return true;
  }
  return false;
}

function countDiplomaticTies(game: GameState, faction: FactionId): number {
  // Count ally + tributary relations involving `faction`. RelationEntry
  // doesn't carry pair ids on the entry today (only the Map KEY does);
  // parse the key to confirm `faction` is part of the pair.
  let ties = 0;
  for (const [key, entry] of game.diplomacy.relations.entries()) {
    if (entry.relation !== 'ally' && entry.relation !== 'tributary') continue;
    const [a, b] = key.split('|');
    if (a === faction || b === faction) ties += 1;
  }
  return ties;
}

/**
 * Detect a victory condition for `faction`. Returns the kind that fired,
 * or null when nothing applies. Checked in order:
 *   1. military  — game.outcome already 'win' (enemy base destroyed)
 *   2. economic  — wood+stone+gold >= economic threshold AND Wonder built
 *   3. scientific — research.purchased.size >= threshold
 *   4. diplomatic — N ally/tributary ties
 */
export function detectVictoryFor(game: GameState, faction: FactionId): VictoryKind | null {
  // 1. Military — runtime outcome flip is the source of truth.
  if (faction === 'player' && game.outcome === 'win') return 'military';
  if (faction === 'enemy' && game.outcome === 'loss') return 'military';
  // 2. Economic.
  if (faction === 'player' || faction === 'enemy') {
    const eco = game.economy[faction];
    if (ecoTotal(eco) >= VICTORY_THRESHOLDS.economicGold && hasWonder(game.world, faction)) {
      return 'economic';
    }
  }
  // 3. Scientific.
  if (game.research.purchased.size >= VICTORY_THRESHOLDS.scientificDiscoveries) {
    return 'scientific';
  }
  // 4. Diplomatic.
  if (countDiplomaticTies(game, faction) >= VICTORY_THRESHOLDS.diplomaticAlliances) {
    return 'diplomatic';
  }
  return null;
}

/**
 * Sweep every player faction for a victory condition. Returns the first
 * (faction, kind) pair that fires, or null. Caller updates
 * game.victoryRecord with the result.
 */
export function detectVictory(game: GameState): VictoryRecord | null {
  for (const f of game.factions) {
    if (f.kind === 'barbarian') continue;
    const kind = detectVictoryFor(game, f.id);
    if (kind) {
      return {
        kind,
        winner: f.id,
        detectedAtSeconds: game.clock.elapsed,
      };
    }
  }
  return null;
}
