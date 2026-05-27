import { describe, expect, it } from 'vitest';
import { AttractorBehavior, DefensiveBehavior, OffensiveBehavior } from '@/ecs/components';
import { placeBuilding } from '@/game/commands';
import { startGame } from '@/game/game-state';

describe('Wonder building (M_FEATURE.4)', () => {
  it('composes all three ZoC archetypes (attractor + offensive + defensive)', () => {
    const game = startGame('wonder-test');
    // grant cost so the test focuses on composition
    game.economy.player.wood = 9999;
    game.economy.player.stone = 9999;
    game.economy.player.gold = 9999;
    // find a free walkable tile
    let key: string | null = null;
    for (const [k, t] of game.board.tiles) {
      if (!t.walkable) continue;
      if (k === game.palaceKey || k === game.enemyBaseKey) continue;
      if (game.buildSites.has(k)) continue;
      key = k;
      break;
    }
    if (!key) throw new Error('no free tile');
    expect(placeBuilding(game, key, 'Wonder', 'player')).toBe(true);
    const entity = game.buildSites.get(key);
    expect(entity?.has(AttractorBehavior)).toBe(true);
    expect(entity?.has(OffensiveBehavior)).toBe(true);
    expect(entity?.has(DefensiveBehavior)).toBe(true);
  });
});
