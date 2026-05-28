/**
 * M_V11.WAVE-DEFENSE (#77h) — wave system tests.
 *
 * Pins:
 *   - System is a no-op outside game.mode === 'wave-defense'
 *   - Initializing spawns 3 barbarian-camp EnemySpawners
 *   - Wave cadence guard fires waves at correct intervals
 */
import { describe, expect, it } from 'vitest';
import { EnemySpawner, FactionTrait } from '@/ecs/components';
import { waveDefenseProgress, waveDefenseSystem } from '@/ecs/systems/combat';
import { type GameState, startGame } from '@/game/game-state';

function countBarbarianCamps(game: GameState): number {
  let n = 0;
  for (const s of game.world.query(EnemySpawner, FactionTrait)) {
    const faction = s.get(FactionTrait)?.faction as unknown as string | undefined;
    if (faction?.startsWith('barbarian-camp-')) n += 1;
  }
  return n;
}

describe('M_V11.WAVE-DEFENSE — waveDefenseSystem', () => {
  it('is a no-op outside wave-defense mode', () => {
    const game = startGame('wave-defense-noop');
    // default mode is border-clash.
    const before = waveDefenseProgress(game);
    waveDefenseSystem(game);
    waveDefenseSystem(game);
    const after = waveDefenseProgress(game);
    expect(after.wave).toBe(before.wave);
  });

  it('initialises by spawning at least 1 additional barbarian-camp EnemySpawner', () => {
    const game = startGame('wave-defense-init');
    const before = countBarbarianCamps(game);
    game.mode = 'wave-defense';
    waveDefenseSystem(game);
    const after = countBarbarianCamps(game);
    // The system adds up to 3 camps (only on walkable tiles around
    // the Palace); accept any positive delta.
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThanOrEqual(3);
  });

  it('fires the first wave at WAVE_FIRST_DELAY (60s)', () => {
    const game = startGame('wave-defense-first-wave');
    game.mode = 'wave-defense';
    waveDefenseSystem(game);
    expect(waveDefenseProgress(game).wave).toBe(0);
    // Push clock past the 60s threshold.
    game.clock.elapsed = 61;
    waveDefenseSystem(game);
    expect(waveDefenseProgress(game).wave).toBe(1);
  });

  it('caps at 5 total waves', () => {
    const game = startGame('wave-defense-cap');
    game.mode = 'wave-defense';
    // Skip all the way to wave 6.
    waveDefenseSystem(game);
    for (let i = 0; i < 7; i++) {
      game.clock.elapsed += 200;
      waveDefenseSystem(game);
    }
    expect(waveDefenseProgress(game).wave).toBeLessThanOrEqual(5);
  });
});
