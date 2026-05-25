/**
 * M_V6.DIPLO.TRADE — 1:1 swap + cooldown pins.
 */
import { describe, expect, it } from 'vitest';
import { createDiplomacyState, setRelation } from '@/game/diplomacy';
import {
  createTradeCooldownState,
  isTradeAvailable,
  performTrade,
  TRADE_COOLDOWN_SECONDS,
} from '@/game/diplomacy-trade';
import { createEconomy, type GameEconomy } from '@/game/economy';

function makeEcoPair(): Record<string, GameEconomy> {
  const a = createEconomy();
  const b = createEconomy();
  a.wood = 100;
  a.stone = 100;
  a.gold = 100;
  b.wood = 100;
  b.stone = 100;
  b.gold = 100;
  return { player: a, enemy: b };
}

describe('isTradeAvailable', () => {
  it('rejects same-id', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    expect(isTradeAvailable(c, d, 'player', 'player', 0)).toBe(false);
  });
  it('rejects enemies', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    setRelation(d, 'player', 'enemy', 'enemy', 0);
    expect(isTradeAvailable(c, d, 'player', 'enemy', 1)).toBe(false);
  });
  it('available for neutral / ally', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    expect(isTradeAvailable(c, d, 'player', 'enemy', 0)).toBe(true);
    setRelation(d, 'player', 'enemy', 'ally', 1);
    expect(isTradeAvailable(c, d, 'player', 'enemy', 2)).toBe(true);
  });
  it('blocked while cooldown active; available after', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    const eco = makeEcoPair();
    expect(performTrade(c, d, 'player', 'enemy', 'wood', 10, 'stone', 10, 100, (f) => eco[f])).toBe(
      true,
    );
    expect(isTradeAvailable(c, d, 'player', 'enemy', 100)).toBe(false);
    expect(isTradeAvailable(c, d, 'player', 'enemy', 100 + TRADE_COOLDOWN_SECONDS)).toBe(true);
  });
});

describe('performTrade atomicity', () => {
  it('1:1 swap mutates both economies + sets cooldown', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    const eco = makeEcoPair();
    expect(performTrade(c, d, 'player', 'enemy', 'wood', 20, 'gold', 30, 0, (f) => eco[f])).toBe(
      true,
    );
    expect(eco.player!.wood).toBe(80);
    expect(eco.player!.gold).toBe(130);
    expect(eco.enemy!.wood).toBe(120);
    expect(eco.enemy!.gold).toBe(70);
  });
  it('returns false when a side cannot afford (no mutation)', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    const eco = makeEcoPair();
    eco.player!.wood = 5;
    expect(performTrade(c, d, 'player', 'enemy', 'wood', 10, 'stone', 10, 0, (f) => eco[f])).toBe(
      false,
    );
    expect(eco.player!.wood).toBe(5);
    expect(eco.enemy!.stone).toBe(100);
  });
  it('rejects non-positive / non-finite amounts', () => {
    const c = createTradeCooldownState();
    const d = createDiplomacyState();
    const eco = makeEcoPair();
    expect(performTrade(c, d, 'player', 'enemy', 'wood', 0, 'stone', 5, 0, (f) => eco[f])).toBe(
      false,
    );
    expect(performTrade(c, d, 'player', 'enemy', 'wood', -1, 'stone', 5, 0, (f) => eco[f])).toBe(
      false,
    );
    expect(
      performTrade(c, d, 'player', 'enemy', 'wood', Number.NaN, 'stone', 5, 0, (f) => eco[f]),
    ).toBe(false);
  });
});
