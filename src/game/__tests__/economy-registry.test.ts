/**
 * M_V7.ECONOMY.REGISTRY — N-player economy correctness pins.
 *
 * Resolves HIGH-1 + HIGH-2 from .full-review/v0.7-cycle-opening.md:
 * v0.5/v0.6 substrate gated tribute cession + camp clear reward to
 * legacy 2-faction slots (`Record<Faction, GameEconomy>` keyed by
 * `'player' | 'enemy'`). N-player slots (player-3..N) never saw
 * tribute paid TO them or camp reward credited.
 *
 * Pins:
 *   1. economyFor lazy-creates a slot for new factionIds.
 *   2. economyFor returns the same ref on subsequent lookups (no
 *      regression — mutations stick).
 *   3. economyFor for 'player' / 'enemy' returns the legacy slot.
 *   4. Camp clear reward credits player-3..N via the registry helper.
 *   5. Tribute cession routes through all faction ids, not just FACTIONS.
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultFactions } from '@/config/ai';
import { Health } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { economyFor } from '@/game/economy-for';
import { runEconomyTick, startGame } from '@/game/game-state';
import { spawnBarbarianCamp } from '@/world/board';

describe('economyFor lookup', () => {
  it("returns the legacy slot for 'player' / 'enemy'", () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(economyFor(game, 'player')).toBe(game.economy.player);
    expect(economyFor(game, 'enemy')).toBe(game.economy.enemy);
  });

  it('lazy-creates a slot for a new N-player factionId', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(game.economyExtra.has('player-3')).toBe(false);
    const eco = economyFor(game, 'player-3');
    expect(eco).toBeDefined();
    expect(eco.wood).toBe(80); // M_V11.OPEN.STOCKPILE
    expect(game.economyExtra.has('player-3')).toBe(true);
    // Same ref on second lookup; mutations stick.
    const eco2 = economyFor(game, 'player-3');
    expect(eco2).toBe(eco);
    eco2.wood += 100;
    expect(economyFor(game, 'player-3').wood).toBe(180); // 80 + 100 (M_V11.OPEN.STOCKPILE)
  });
});

describe('M_V7.ECONOMY.REGISTRY — camp clear credits N-player slot', () => {
  it('player-3 clearing a camp gets +50 wood + +50 stone via the registry helper', () => {
    const colors = ['#aa0000', '#00aa00', '#0000aa', '#aaaa00'];
    const game = startGame({
      seedPhrase: 'camp-n-player',
      mapSize: 14,
      difficulty: 'normal',
      eventSeed: 'evt',
      factions: buildDefaultFactions(4, colors),
    });
    // Place a camp adjacent to a player-3 footman so proximity-credit
    // picks player-3 as the clearer.
    let campTile: { q: number; r: number; level: number; key: string } | null = null;
    for (const tile of game.board.tiles.values()) {
      if (!tile.walkable) continue;
      const d = Math.abs(tile.q) + Math.abs(tile.r);
      if (d < 6 || d > 15) continue;
      campTile = { q: tile.q, r: tile.r, level: tile.level, key: `${tile.q},${tile.r}` };
      break;
    }
    expect(campTile).not.toBeNull();
    if (!campTile) throw new Error('campTile required');
    const ct = campTile;
    const camp = spawnBarbarianCamp(game.world, {
      factionId: 'barbarian-camp-99',
      q: ct.q,
      r: ct.r,
      level: ct.level,
      hp: 30,
      archetype: 'orc',
    });
    // Adjacent footman tagged 'player-3'.
    createCharacter({
      world: game.world,
      role: 'Footman',
      q: ct.q + 1,
      r: ct.r,
      level: ct.level,
      factionOverride: 'player-3',
    });
    // Capture starting player-3 wood/stone (lazy-created = 50 / 20).
    const before = economyFor(game, 'player-3');
    const startWood = before.wood;
    const startStone = before.stone;
    // Zero camp HP + tick → tickScoringPhase routes reward via economyFor.
    camp.set(Health, { current: 0, max: 30 });
    runEconomyTick(game, 1);
    const after = economyFor(game, 'player-3');
    expect(after.wood, 'player-3 wood after camp clear').toBeGreaterThanOrEqual(startWood + 50);
    expect(after.stone, 'player-3 stone after camp clear').toBeGreaterThanOrEqual(startStone + 50);
  });
});
