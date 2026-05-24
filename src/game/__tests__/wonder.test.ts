/**
 * M_EXPANSION.F.71 — Wonder countdown win-condition.
 *
 * Spawn a Wonder building for the player, mark it complete, advance
 * the sim past the countdown window, and assert the outcome flips
 * to 'win'. Tests the inverse for the enemy (loss precedence).
 */
import { describe, expect, it } from 'vitest';
import {
  Building,
  type BuildingType,
  FactionTrait,
  type Faction,
  HexPosition,
} from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';

function spawnCompleteWonder(game: ReturnType<typeof startGame>, faction: Faction): void {
  const entity = game.world.spawn(
    Building({ buildingType: 'Wonder' as BuildingType, isComplete: true, progress: 1 }),
    FactionTrait({ faction }),
    HexPosition({ q: 0, r: 0, level: 0 }),
  );
  // Register in buildSites so other systems see it as a structure.
  game.buildSites.set(`wonder:${faction}:${Number(entity)}`, entity);
  game.buildSitesGeneration += 1;
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
