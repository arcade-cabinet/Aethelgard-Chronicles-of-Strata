import { describe, expect, it } from 'vitest';
import { tradeResource } from '@/game/utilities';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.93 — resource trade at 3:1. Convert N wood → ⌊N/3⌋
 * stone (or any resource pair, both directions). Player pays in
 * full; receives the integer floor of fromAmount/3. Trades that
 * round to 0 output are rejected so the player can't sneak a free
 * destruction of resources.
 */
describe('M_EXPANSION.F.93 — resource trade', () => {
  it('3 wood → 1 stone (canonical case)', () => {
    const game = startGame('trade-3-to-1');
    const beforeWood = game.economy.player.wood;
    const beforeStone = game.economy.player.stone;
    expect(tradeResource(game, 'wood', 'stone', 3)).toBe(true);
    expect(game.economy.player.wood).toBe(beforeWood - 3);
    expect(game.economy.player.stone).toBe(beforeStone + 1);
  });

  it('15 wood → 5 stone (integer multiple)', () => {
    const game = startGame('trade-15');
    const beforeStone = game.economy.player.stone;
    expect(tradeResource(game, 'wood', 'stone', 15)).toBe(true);
    expect(game.economy.player.stone).toBe(beforeStone + 5);
  });

  it('10 wood → 3 stone (floors the output)', () => {
    const game = startGame('trade-floor');
    const beforeStone = game.economy.player.stone;
    expect(tradeResource(game, 'wood', 'stone', 10)).toBe(true);
    expect(game.economy.player.stone).toBe(beforeStone + 3);
  });

  it('2 wood → 0 stone — rejected (no-op)', () => {
    const game = startGame('trade-too-small');
    const beforeWood = game.economy.player.wood;
    const beforeStone = game.economy.player.stone;
    expect(tradeResource(game, 'wood', 'stone', 2)).toBe(false);
    expect(game.economy.player.wood).toBe(beforeWood);
    expect(game.economy.player.stone).toBe(beforeStone);
  });

  it('insufficient resources — rejected', () => {
    const game = startGame('trade-broke');
    game.economy.player.wood = 1;
    expect(tradeResource(game, 'wood', 'stone', 3)).toBe(false);
    expect(game.economy.player.wood).toBe(1);
  });

  it('same-type trade — rejected', () => {
    const game = startGame('trade-self');
    expect(tradeResource(game, 'wood', 'wood', 3)).toBe(false);
  });

  it('reverse direction works (gold → wood)', () => {
    const game = startGame('trade-reverse');
    game.economy.player.gold = 30;
    const beforeWood = game.economy.player.wood;
    expect(tradeResource(game, 'gold', 'wood', 30)).toBe(true);
    expect(game.economy.player.gold).toBe(0);
    expect(game.economy.player.wood).toBe(beforeWood + 10);
  });

  // M_CODE_REVIEW.5 — material-only contract.
  it('rejects science → wood (science is non-tradeable)', () => {
    const game = startGame('trade-science-reject');
    game.economy.player.science = 30;
    const beforeWood = game.economy.player.wood;
    expect(tradeResource(game, 'science', 'wood', 30)).toBe(false);
    expect(game.economy.player.science).toBe(30);
    expect(game.economy.player.wood).toBe(beforeWood);
  });

  it('rejects wood → mana (mana is non-tradeable)', () => {
    const game = startGame('trade-mana-reject');
    expect(tradeResource(game, 'wood', 'mana', 30)).toBe(false);
  });

  // M_SEC_REVIEW.3 — output-side cap.
  it('rejects extreme fromAmount (above RESOURCE_TRADE_CAP)', () => {
    const game = startGame('trade-cap-reject');
    game.economy.player.wood = 1e20;
    expect(tradeResource(game, 'wood', 'stone', 1e15)).toBe(false);
    // Source unchanged because guard short-circuits before the spend
    expect(game.economy.player.wood).toBe(1e20);
  });
});
