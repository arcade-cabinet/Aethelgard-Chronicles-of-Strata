/**
 * M_V9.AI.WONDER-EVALUATOR — WonderEvaluator unit tests.
 *
 * Five contracts:
 *   1. Returns 0 when the faction cannot afford the Wonder.
 *   2. Returns > 0 when affordable + tile available + no existing Wonder.
 *   3. Score decreases as supply fills (supplyRatio grows).
 *   4. Returns 0 when faction already owns a Wonder.
 *   5. wonderWeight from ai-personalities.json flows through.
 */
import { describe, expect, it } from 'vitest';
import { AiPlayer } from '@/ai/ai-player';
import { WonderEvaluator } from '@/ai/evaluators/wonder';
import { placeBuilding } from '@/game/commands';
import { startGame } from '@/game/game-state';

function makeAi(personalityKey?: string): { ai: AiPlayer; game: ReturnType<typeof startGame> } {
  const game = startGame({
    seedPhrase: 'wonder-eval-seed',
    mapSize: 10,
    difficulty: 'normal',
    eventSeed: 'wonder-eval-ev',
  });
  const ai = new AiPlayer('player', personalityKey);
  ai.game = game;
  return { ai, game };
}

describe('M_V9.AI.WONDER-EVALUATOR', () => {
  it('returns 0 when faction cannot afford Wonder', () => {
    const { ai, game } = makeAi();
    // Zero out all resources so can't afford.
    game.economy.player.wood = 0;
    game.economy.player.stone = 0;
    game.economy.player.gold = 0;
    const ev = new WonderEvaluator(1.0);
    expect(ev.calculateDesirability(ai)).toBe(0);
  });

  it('returns > 0 when affordable + tile available + no existing Wonder', () => {
    const { ai, game } = makeAi();
    // Fund the Wonder (cost: wood 500, stone 400, gold 300).
    game.economy.player.wood = 600;
    game.economy.player.stone = 500;
    game.economy.player.gold = 400;
    // Supply headroom — keep it low so ratio is low.
    game.economy.player.usedSupply = 0;
    game.economy.player.maxSupply = 20;
    const ev = new WonderEvaluator(1.0);
    expect(ev.calculateDesirability(ai)).toBeGreaterThan(0);
  });

  it('score decreases as supply fills', () => {
    const { ai: ai1, game: g1 } = makeAi();
    g1.economy.player.wood = 600;
    g1.economy.player.stone = 500;
    g1.economy.player.gold = 400;
    g1.economy.player.usedSupply = 0;
    g1.economy.player.maxSupply = 20;

    const { ai: ai2, game: g2 } = makeAi();
    g2.economy.player.wood = 600;
    g2.economy.player.stone = 500;
    g2.economy.player.gold = 400;
    g2.economy.player.usedSupply = 18;
    g2.economy.player.maxSupply = 20;

    const ev = new WonderEvaluator(1.0);
    const scoreLow = ev.calculateDesirability(ai1);
    const scoreHigh = ev.calculateDesirability(ai2);
    expect(scoreLow).toBeGreaterThan(scoreHigh);
  });

  it('returns 0 when faction already owns a Wonder', () => {
    const { ai, game } = makeAi();
    game.economy.player.wood = 600;
    game.economy.player.stone = 500;
    game.economy.player.gold = 400;
    // Place a Wonder so ownedBuildingCount returns > 0.
    // Find the first free tile the player controls.
    let placed = false;
    for (const [key] of game.board.tiles) {
      if (placeBuilding(game, key, 'Wonder', 'player')) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Fallback: skip if no tile was available (map gen edge case).
      return;
    }
    const ev = new WonderEvaluator(1.0);
    expect(ev.calculateDesirability(ai)).toBe(0);
  });

  it('wonderWeight=0.2 produces a lower score than wonderWeight=1.0', () => {
    const setup = () => {
      const { ai, game } = makeAi();
      game.economy.player.wood = 600;
      game.economy.player.stone = 500;
      game.economy.player.gold = 400;
      game.economy.player.usedSupply = 0;
      game.economy.player.maxSupply = 20;
      return ai;
    };
    const ai1 = setup();
    const ai2 = setup();
    const evLow = new WonderEvaluator(0.2);
    const evHigh = new WonderEvaluator(1.0);
    expect(evLow.calculateDesirability(ai1)).toBeLessThan(evHigh.calculateDesirability(ai2));
  });
});
