import { describe, expect, it } from 'vitest';
import { Building, ScienceProducer } from '@/ecs/components';
import { placeBuilding } from '@/game/commands';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('science accumulation (M_FEATURE.3)', () => {
  it('passive trickle accumulates science even without a Library', () => {
    const game = startGame('science-passive');
    const before = game.economy.player.science;
    // 60 fixed ticks = 1 game-second
    for (let i = 0; i < 60; i++) runEconomyTick(game, 1 / 60);
    // M_MICRO.6.11 — constrain magnitude: passive trickle is 0.05/sec
    // (see scienceSystem.PASSIVE_TRICKLE), so 1 game-second should
    // produce ~0.05. ±5% tolerance.
    const delta = game.economy.player.science - before;
    expect(delta).toBeGreaterThanOrEqual(0.0475);
    expect(delta).toBeLessThanOrEqual(0.0525);
  });

  it('Library entity carries ScienceProducer trait + accelerates accumulation', () => {
    const game = startGame('library-test');
    game.economy.player.wood = 9999;
    game.economy.player.stone = 9999;
    game.economy.player.gold = 9999;
    let key: string | null = null;
    for (const [k, t] of game.board.tiles) {
      if (!t.walkable) continue;
      if (k === game.palaceKey || k === game.enemyBaseKey) continue;
      if (game.buildSites.has(k)) continue;
      key = k;
      break;
    }
    if (!key) throw new Error('no free tile');
    expect(placeBuilding(game, key, 'Library', 'player')).toBe(true);
    const entity = game.buildSites.get(key);
    expect(entity?.has(ScienceProducer)).toBe(true);
    // Library starts at progress 0; mark complete so its science-rate kicks in.
    const b = entity?.get(Building);
    if (entity && b) entity.set(Building, { ...b, isComplete: true });
    // 60 ticks with the Library completed should beat passive-only by margin
    const baseline = game.economy.player.science;
    for (let i = 0; i < 60; i++) runEconomyTick(game, 1 / 60);
    expect(game.economy.player.science).toBeGreaterThan(baseline + 0.5);
  });
});
