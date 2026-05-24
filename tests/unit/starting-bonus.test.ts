import { describe, expect, it } from 'vitest';
import { FactionBase, Health, Unit } from '@/ecs/components';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.84 — startingBonus pick applies a one-shot
 * advantage at game start. Tests verify each pick changes the
 * initial GameState shape as documented.
 */
describe('M_EXPANSION.F.84 — starting bonus picks', () => {
  it('"none" (default) — baseline starts with 50 wood + 2 Peons + 500hp TownHall', () => {
    const game = startGame({
      seedPhrase: 'bonus-none',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'bonus-none-events',
      startingBonus: 'none',
    });
    expect(game.economy.player.wood).toBe(50);
    let peonCount = 0;
    for (const e of game.world.query(Unit)) {
      if (e.get(Unit)?.unitType === 'Peon') peonCount++;
    }
    expect(peonCount).toBe(2);
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase);
      if (f?.faction !== 'player') continue;
      expect(e.get(Health)?.max).toBe(500);
    }
  });

  it('"extra-wood" — economy starts with +50 wood (100 total)', () => {
    const game = startGame({
      seedPhrase: 'bonus-wood',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'bonus-wood-events',
      startingBonus: 'extra-wood',
    });
    expect(game.economy.player.wood).toBe(100);
  });

  it('"extra-peons" — 4 Peons spawn instead of 2', () => {
    const game = startGame({
      seedPhrase: 'bonus-peons',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'bonus-peons-events',
      startingBonus: 'extra-peons',
    });
    let peonCount = 0;
    for (const e of game.world.query(Unit)) {
      if (e.get(Unit)?.unitType === 'Peon') peonCount++;
    }
    expect(peonCount).toBe(4);
  });

  it('"extra-hp" — player TownHall starts with 700hp instead of 500', () => {
    const game = startGame({
      seedPhrase: 'bonus-hp',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'bonus-hp-events',
      startingBonus: 'extra-hp',
    });
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase);
      if (f?.faction !== 'player') continue;
      const h = e.get(Health);
      expect(h?.max).toBe(700);
      expect(h?.current).toBe(700);
    }
  });

  it('enemy TownHall is never affected by the bonus', () => {
    const game = startGame({
      seedPhrase: 'bonus-enemy-unchanged',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'bonus-enemy-unchanged-events',
      startingBonus: 'extra-hp',
    });
    for (const e of game.world.query(FactionBase, Health)) {
      const f = e.get(FactionBase);
      if (f?.faction !== 'enemy') continue;
      expect(e.get(Health)?.max).toBe(300);
    }
  });
});
