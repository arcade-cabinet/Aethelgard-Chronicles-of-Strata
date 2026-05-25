/**
 * M_V6.DIPLO.TRIBUTE — demand detection + cession pipeline.
 */
import { describe, expect, it } from 'vitest';
import { createDiplomacyState, getRelation, tributaryDominant } from '@/game/diplomacy';
import {
  acceptTribute,
  canDemandTribute,
  refuseTribute,
  TRIBUTE_CESSION_FRACTION,
  TRIBUTE_DEMAND_RATIO,
  tickTributeCession,
} from '@/game/diplomacy-tribute';
import { createEconomy, type GameEconomy } from '@/game/economy';

function makeStrongWeak(): { strong: GameEconomy; weak: GameEconomy } {
  const strong = createEconomy();
  strong.peakSupply = 20;
  strong.usedSupply = 20;
  strong.wood = 100;
  strong.stone = 100;
  strong.gold = 100;
  const weak = createEconomy();
  weak.peakSupply = 5;
  weak.usedSupply = 5;
  weak.wood = 100;
  weak.stone = 100;
  weak.gold = 100;
  return { strong, weak };
}

describe('canDemandTribute', () => {
  it('returns true when supply ratio >= TRIBUTE_DEMAND_RATIO', () => {
    const { strong, weak } = makeStrongWeak();
    expect(canDemandTribute(strong, weak)).toBe(true);
  });
  it('returns false on equal supply', () => {
    const a = createEconomy();
    a.usedSupply = 10;
    a.peakSupply = 10;
    const b = createEconomy();
    b.usedSupply = 10;
    b.peakSupply = 10;
    expect(canDemandTribute(a, b)).toBe(false);
  });
  it('returns false when dominant has no military history', () => {
    const a = createEconomy();
    a.usedSupply = 20;
    a.peakSupply = 0; // never trained anything
    const b = createEconomy();
    expect(canDemandTribute(a, b)).toBe(false);
  });
  it('returns true when weak has 0 supply (clearly dominant)', () => {
    const a = createEconomy();
    a.usedSupply = 5;
    a.peakSupply = 5;
    const b = createEconomy();
    expect(canDemandTribute(a, b)).toBe(true);
  });
  it('TRIBUTE_DEMAND_RATIO is 2', () => {
    expect(TRIBUTE_DEMAND_RATIO).toBe(2.0);
  });
});

describe('acceptTribute / refuseTribute', () => {
  it('acceptTribute flips to tributary with dominant set', () => {
    const d = createDiplomacyState();
    acceptTribute(d, 'enemy', 'player', 100);
    expect(getRelation(d, 'enemy', 'player')).toBe('tributary');
    expect(tributaryDominant(d, 'enemy', 'player')).toBe('player');
  });
  it('refuseTribute flips to enemy', () => {
    const d = createDiplomacyState();
    refuseTribute(d, 'enemy', 'player', 100);
    expect(getRelation(d, 'enemy', 'player')).toBe('enemy');
  });
});

describe('tickTributeCession', () => {
  it('drains TRIBUTE_CESSION_FRACTION × delta from tributary to dominant', () => {
    const d = createDiplomacyState();
    acceptTribute(d, 'enemy', 'player', 100);
    const eco: Record<string, GameEconomy> = {
      player: createEconomy(),
      enemy: createEconomy(),
    };
    eco.player!.wood = 50;
    eco.enemy!.wood = 100;
    const fired = tickTributeCession(d, ['player', 'enemy'], (f) => eco[f], 1);
    expect(fired).toBe(1);
    // 10% of 100 wood = 10
    const ceded = Math.floor(100 * TRIBUTE_CESSION_FRACTION * 1);
    expect(eco.enemy?.wood).toBe(100 - ceded);
    expect(eco.player?.wood).toBe(50 + ceded);
  });

  it('does nothing on neutral pairs', () => {
    const d = createDiplomacyState();
    const eco: Record<string, GameEconomy> = {
      player: createEconomy(),
      enemy: createEconomy(),
    };
    eco.player!.wood = 50;
    eco.enemy!.wood = 100;
    expect(tickTributeCession(d, ['player', 'enemy'], (f) => eco[f], 1)).toBe(0);
    expect(eco.enemy?.wood).toBe(100);
  });

  it('zero delta is a no-op', () => {
    const d = createDiplomacyState();
    acceptTribute(d, 'enemy', 'player', 100);
    const eco: Record<string, GameEconomy> = {
      player: createEconomy(),
      enemy: createEconomy(),
    };
    eco.enemy!.wood = 100;
    expect(tickTributeCession(d, ['player', 'enemy'], (f) => eco[f], 0)).toBe(0);
    expect(eco.enemy?.wood).toBe(100);
  });
});
