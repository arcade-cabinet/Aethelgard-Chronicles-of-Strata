/**
 * Encroachment system regression (M_AUDIT2.ARCH.41).
 *
 * Pins: claim→pulse→flip lifecycle; defended pulse cancels; peons
 * never trigger encroachment (only combatRole=military); FACTIONS
 * loop covers both sides.
 *
 * Uses the live game world so the integration matches what the tick
 * actually runs.
 */
import { describe, expect, it } from 'vitest';
import { type Faction, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { encroachmentSystem } from '@/ecs/systems/encroachment';
import { startGame } from '@/game/game-state';
import { claimTile } from '@/game/zone';

/**
 * Spawn a military unit (Footman) for the given faction on a hex —
 * minimal trait set the encroachment system filters on.
 */
function spawnMilitaryAt(
  game: ReturnType<typeof startGame>,
  faction: Faction,
  q: number,
  r: number,
) {
  return game.world.spawn(
    HexPosition({ q, r, level: 0 }),
    FactionTrait({ faction }),
    Unit({ unitType: 'Footman' }),
  );
}

describe('encroachmentSystem (M_AUDIT2.ARCH.41)', () => {
  it('starts a pulse on a controlled tile when enemy military stands on it', () => {
    const game = startGame('encroach-pulse');
    // Player owns a tile; spawn an enemy footman ON it.
    claimTile(game.zones.player, '1,0');
    spawnMilitaryAt(game, 'enemy', 1, 0);
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has('1,0')).toBe(true);
  });

  it('flips the tile to the encroacher when grace elapses', () => {
    const game = startGame('encroach-flip');
    claimTile(game.zones.player, '2,0');
    spawnMilitaryAt(game, 'enemy', 2, 0);
    // Hard difficulty has 4s grace — drain it.
    game.difficulty = 'hard';
    for (let i = 0; i < 10; i++) {
      encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    }
    expect(game.zones.player.controlled.has('2,0')).toBe(false);
    expect(game.zones.enemy.controlled.has('2,0')).toBe(true);
  });

  it('defended pulse is cancelled when a friendly military stands adjacent', () => {
    const game = startGame('encroach-defended');
    claimTile(game.zones.player, '3,0');
    // Enemy on the tile, player defending one hex away.
    spawnMilitaryAt(game, 'enemy', 3, 0);
    spawnMilitaryAt(game, 'player', 2, 0);
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has('3,0')).toBe(false);
    expect(game.zones.player.controlled.has('3,0')).toBe(true);
  });

  it('peons never trigger encroachment (combatRole=civilian)', () => {
    const game = startGame('encroach-peon');
    claimTile(game.zones.player, '4,0');
    // Spawn an ENEMY peon on the tile — should not start a pulse.
    game.world.spawn(
      HexPosition({ q: 4, r: 0, level: 0 }),
      FactionTrait({ faction: 'enemy' }),
      Unit({ unitType: 'Peon' }),
    );
    encroachmentSystem(game.world, game.zones, 0.5, game.difficulty);
    expect(game.zones.player.pulsing.has('4,0')).toBe(false);
  });
});
