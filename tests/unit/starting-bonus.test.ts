import { describe, expect, it } from 'vitest';
import { FactionBase, Health, Unit } from '@/ecs/components';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.84 — startingBonus pick applies a one-shot
 * advantage at game start. Tests verify each pick changes the
 * initial GameState shape as documented.
 */
describe('M_EXPANSION.F.84 — starting bonus picks', () => {
  it('"none" (default) — baseline starts with 50 wood + 2 Peons + 3000hp TownHall', () => {
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
      // PATTERN-C bump to 1500.
      expect(e.get(Health)?.max).toBe(3000);
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
      // PATTERN-C: baseline raised to 1500, so extra-hp = 1700.
      expect(h?.max).toBe(3200);
      expect(h?.current).toBe(3200);
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
      // M_FUN.QA.AIVAI.TUNE.PATTERN-C — bases equalised at 1500 HP
      // so AI-vs-AI matches can't end at t=0 from a solo-Footman
      // rush (100 sim-seconds to solo a TownHall now).
      expect(e.get(Health)?.max).toBe(3000);
    }
  });
});
