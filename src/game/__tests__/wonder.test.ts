/**
 * M_EXPANSION.F.71 — Wonder countdown win-condition.
 * M_V8.WONDER-TIMERS.N-PLAYER — widened to Record<FactionId, number>.
 *
 * Spawn a Wonder building for the player, mark it complete, advance
 * the sim past the countdown window, and assert the outcome flips
 * to 'win'. Tests the inverse for the enemy (loss precedence).
 * N-player tests: extra faction ids seeded, timers decrement correctly,
 * save round-trip preserves all faction ids.
 */
import { describe, expect, it } from 'vitest';
import {
  Building,
  type BuildingType,
  FactionTrait,
  type Faction,
  HexPosition,
} from '@/ecs/components';
import type { FactionId } from '@/config/factions';
import { runEconomyTick, startGame } from '@/game/game-state';

function spawnCompleteWonder(game: ReturnType<typeof startGame>, faction: FactionId): void {
  const entity = game.world.spawn(
    Building({ buildingType: 'Wonder' as BuildingType, isComplete: true, progress: 1 }),
    // faction-cast: FactionTrait.faction typed Faction; FactionId superset — valid at runtime.
    FactionTrait({ faction: faction as Faction }),
    HexPosition({ q: 0, r: 0, level: 0 }),
  );
  // Register in buildSites so other systems see it as a structure.
  game.buildSites.set(`wonder:${faction}:${Number(entity)}`, entity);
  game.buildSitesGeneration += 1;
  // Ensure the faction has an entry in wonderTimers (needed when spawning
  // an entity for an N-player faction that wasn't seeded at startGame).
  if (!(faction in game.wonderTimers)) {
    game.wonderTimers[faction] = Infinity;
  }
}

describe('Wonder countdown (M_EXPANSION.F.71)', () => {
  it('completing a player Wonder seeds the countdown to 300s', () => {
    const game = startGame('autumn-bronze-summit');
    expect(game.wonderTimers.player).toBe(Infinity);
    spawnCompleteWonder(game, 'player');
    runEconomyTick(game, 1);
    expect(game.wonderTimers.player).toBeLessThanOrEqual(300);
    expect(game.wonderTimers.player).toBeGreaterThan(290);
  });

  it('countdown to 0 flips outcome to win for player Wonder', () => {
    const game = startGame('autumn-bronze-summit');
    spawnCompleteWonder(game, 'player');
    // Advance the sim past the 300s window in one big tick.
    runEconomyTick(game, 305);
    expect(game.wonderTimers.player).toBe(0);
    expect(game.outcome).toBe('win');
  });

  it('countdown to 0 flips outcome to loss for enemy Wonder', () => {
    const game = startGame('autumn-bronze-summit');
    spawnCompleteWonder(game, 'enemy');
    runEconomyTick(game, 305);
    expect(game.wonderTimers.enemy).toBe(0);
    expect(game.outcome).toBe('loss');
  });
});

const BASE_CFG = {
  seedPhrase: 'autumn-bronze-summit',
  mapSize: 20,
  difficulty: 'normal' as const,
  eventSeed: 'test-seed',
};

describe('Wonder timers — N-player (M_V8.WONDER-TIMERS.N-PLAYER)', () => {
  it('startGame seeds wonderTimers for both legacy faction ids', () => {
    const game = startGame('autumn-bronze-summit');
    expect('player' in game.wonderTimers).toBe(true);
    expect('enemy' in game.wonderTimers).toBe(true);
    expect(game.wonderTimers['player']).toBe(Infinity);
    expect(game.wonderTimers['enemy']).toBe(Infinity);
  });

  it('startGame with 4 factions seeds all 4 ids in wonderTimers', () => {
    const game = startGame({
      ...BASE_CFG,
      factions: [
        { id: 'player', kind: 'human', color: '#3b82f6', displayName: 'P1', archetype: 'medieval' },
        { id: 'ai-2', kind: 'ai', color: '#ef4444', displayName: 'AI2', archetype: 'orc' },
        { id: 'ai-3', kind: 'ai', color: '#22c55e', displayName: 'AI3', archetype: 'undead' },
        { id: 'ai-4', kind: 'ai', color: '#f59e0b', displayName: 'AI4', archetype: 'mystic' },
      ],
    });
    expect(Object.keys(game.wonderTimers)).toEqual(
      expect.arrayContaining(['player', 'ai-2', 'ai-3', 'ai-4']),
    );
    for (const v of Object.values(game.wonderTimers)) {
      expect(v).toBe(Infinity);
    }
  });

  it('N-player faction (ai-3) wonder timer decrements independently', () => {
    const game = startGame({
      ...BASE_CFG,
      factions: [
        { id: 'player', kind: 'human', color: '#3b82f6', displayName: 'P1', archetype: 'medieval' },
        { id: 'ai-2', kind: 'ai', color: '#ef4444', displayName: 'AI2', archetype: 'orc' },
        { id: 'ai-3', kind: 'ai', color: '#22c55e', displayName: 'AI3', archetype: 'undead' },
      ],
    });
    spawnCompleteWonder(game, 'ai-3');
    runEconomyTick(game, 10);
    expect(game.wonderTimers['ai-3']).toBeLessThan(300);
    // Other factions without a wonder remain Infinity.
    expect(game.wonderTimers['player']).toBe(Infinity);
    expect(game.wonderTimers['ai-2']).toBe(Infinity);
  });

  it('4X first-AI-to-zero flips outcome to loss (classic mode)', () => {
    const game = startGame({
      ...BASE_CFG,
      factions: [
        { id: 'player', kind: 'human', color: '#3b82f6', displayName: 'P1', archetype: 'medieval' },
        { id: 'ai-2', kind: 'ai', color: '#ef4444', displayName: 'AI2', archetype: 'orc' },
      ],
    });
    spawnCompleteWonder(game, 'ai-2');
    runEconomyTick(game, 305);
    expect(game.wonderTimers['ai-2']).toBe(0);
    expect(game.outcome).toBe('loss');
  });
});
