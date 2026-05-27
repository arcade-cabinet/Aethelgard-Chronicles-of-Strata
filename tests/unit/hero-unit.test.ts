import { describe, expect, it } from 'vitest';
import { AnimationState, FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';
import { deathSystem } from '@/ecs/systems/death';
import { trainUnit } from '@/game/commands';
import { runEconomyTick, startGame } from '@/game/game-state';
import { unitProfileFor } from '@/rules/unit-profiles';

/**
 * M_EXPANSION.F.96 — Hero unit. Premium melee unit with permadeath
 * + only-one-alive contract.
 */
describe('M_EXPANSION.F.96 — Hero unit', () => {
  it('Hero has premium melee stats (sword, parry 0.2, military)', () => {
    const p = unitProfileFor('Hero');
    expect(p.meleeWeapon).toBe('sword');
    expect(p.parryChance).toBe(0.2);
    expect(p.combatRole).toBe('military');
    expect(p.nonCombat).toBe(false);
    expect(p.harvester).toBe(false);
  });

  it('trainUnit Hero rejects when a player Hero already exists', () => {
    const game = startGame('hero-only-one');
    game.economy.player.gold = 1000;
    game.economy.player.science = 1000;
    // First train succeeds (assuming supply ok).
    const first = trainUnit(game, 'Hero');
    expect(first).toBe(true);
    // Second immediate train must reject.
    const second = trainUnit(game, 'Hero');
    expect(second).toBe(false);
  });

  it('Hero death (player faction) flips game.outcome to loss', () => {
    const game = startGame('hero-permadeath');
    // Spawn a player Hero directly. Use HexPosition adjacent to
    // the Palace (any walkable tile is fine for this contract).
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    game.world.spawn(
      Unit({ unitType: 'Hero' }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
      Health({ current: 0, max: 200 }),
      AnimationState({ state: 'IDLE' }),
    );
    // Advance through the deathDelay window via runEconomyTick so
    // the deathSystem return value flows through the outcome flip
    // wiring in runEconomyTick.
    for (let i = 0; i < 20; i++) runEconomyTick(game, 0.5);
    expect(game.outcome).toBe('loss');
  });

  it('enemy Hero (hypothetical) does NOT flip player outcome', () => {
    const game = startGame('hero-enemy-noflip');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    game.world.spawn(
      Unit({ unitType: 'Hero' }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'enemy' }),
      Health({ current: 0, max: 200 }),
      AnimationState({ state: 'IDLE' }),
    );
    const result = deathSystem(game.world, 100);
    expect(result.playerHeroDied).toBe(false);
    expect(game.outcome).toBe('playing');
  });
});
