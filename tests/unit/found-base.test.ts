import { describe, expect, it } from 'vitest';
import { AttractorBehavior, Building, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { foundBase } from '@/game/utilities';
import { startGame } from '@/game/game-state';

describe('foundBase (M_MODES.6 — 4X expansion)', () => {
  it('consumes a Settler + spawns a new Palace+AttractorBehavior', () => {
    const game = startGame('settle-test');
    // find a free walkable tile near center
    let tile: { q: number; r: number; level: number } | null = null;
    for (const t of game.board.tiles.values()) {
      if (!t.walkable) continue;
      const key = `${t.q},${t.r}`;
      if (key === game.palaceKey || key === game.enemyBaseKey) continue;
      if (game.buildSites.has(key)) continue;
      tile = { q: t.q, r: t.r, level: t.level };
      break;
    }
    if (!tile) throw new Error('no free tile');
    const settler = createCharacter({
      world: game.world,
      role: 'Settler',
      q: tile.q,
      r: tile.r,
      level: tile.level,
      factionOverride: 'player',
    });
    const base = foundBase(game, settler);
    expect(base).not.toBeNull();
    expect(base?.has(Building)).toBe(true);
    expect(base?.has(AttractorBehavior)).toBe(true);
    expect(base?.has(FactionTrait)).toBe(true);
    expect(base?.get(FactionTrait)?.faction).toBe('player');
    // settler entity destroyed — its Unit trait is gone
    expect(settler.has(Unit)).toBe(false);
  });

  it('returns null if the unit isnt a Settler', () => {
    const game = startGame('settle-no-peon');
    let tile: { q: number; r: number; level: number } | null = null;
    for (const t of game.board.tiles.values()) {
      if (!t.walkable) continue;
      const key = `${t.q},${t.r}`;
      if (key === game.palaceKey || key === game.enemyBaseKey) continue;
      if (game.buildSites.has(key)) continue;
      tile = { q: t.q, r: t.r, level: t.level };
      break;
    }
    if (!tile) throw new Error('no free tile');
    const peon = createCharacter({
      world: game.world,
      role: 'Peon',
      q: tile.q,
      r: tile.r,
      level: tile.level,
    });
    expect(foundBase(game, peon)).toBeNull();
    expect(peon.has(Unit)).toBe(true); // not consumed
  });

  it('refuses to found on the original palace or enemy base', () => {
    const game = startGame('settle-conflict');
    const [thq, thr] = game.palaceKey.split(',').map(Number);
    const settler = createCharacter({
      world: game.world,
      role: 'Settler',
      q: thq ?? 0,
      r: thr ?? 0,
      level: 1,
      factionOverride: 'player',
    });
    // place settler at Palace hex
    settler.set(HexPosition, { q: thq ?? 0, r: thr ?? 0, level: 1 });
    expect(foundBase(game, settler)).toBeNull();
  });
});
