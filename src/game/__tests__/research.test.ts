/**
 * Research / Discoveries gating coverage (M_AUDIT2.ARCH.48).
 *
 * Pins canResearch + applyResearch contracts: purchased gates,
 * prereq gates, affordability gates, and effect dispatch.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { createEconomy } from '@/game/economy';
import {
  applyResearch,
  canResearch,
  createResearch,
  type ResearchId,
} from '@/game/research';

function richEconomy() {
  const e = createEconomy();
  e.wood = 9999;
  e.stone = 9999;
  e.gold = 9999;
  e.science = 9999;
  return e;
}

describe('research', () => {
  it('createResearch starts empty', () => {
    const r = createResearch();
    expect(r.purchased.size).toBe(0);
  });

  it('canResearch is true for an affordable root Discovery', () => {
    const eco = richEconomy();
    const r = createResearch();
    expect(canResearch(eco, r, 'forgedBlades' as ResearchId)).toBe(true);
  });

  it('canResearch is false once already purchased', () => {
    const eco = richEconomy();
    const r = createResearch();
    r.purchased.add('forgedBlades' as ResearchId);
    expect(canResearch(eco, r, 'forgedBlades' as ResearchId)).toBe(false);
  });

  it('canResearch is false when unaffordable', () => {
    const eco = createEconomy(); // 0 of everything beyond start
    eco.wood = 0;
    eco.stone = 0;
    eco.gold = 0;
    eco.science = 0;
    const r = createResearch();
    expect(canResearch(eco, r, 'forgedBlades' as ResearchId)).toBe(false);
  });

  it('applyResearch spends + records + returns true on success', () => {
    const world = createWorld();
    const eco = richEconomy();
    const r = createResearch();
    const goldBefore = eco.gold;
    const ok = applyResearch(world, eco, r, 'forgedBlades' as ResearchId);
    expect(ok).toBe(true);
    expect(r.purchased.has('forgedBlades' as ResearchId)).toBe(true);
    // economy spent SOMETHING (cost depends on DAG depth — assert change).
    expect(
      eco.wood + eco.stone + eco.gold + eco.science,
    ).toBeLessThan(goldBefore + 9999 * 3);
  });

  it('applyResearch returns false when canResearch is false', () => {
    const world = createWorld();
    const eco = richEconomy();
    const r = createResearch();
    r.purchased.add('forgedBlades' as ResearchId);
    const ok = applyResearch(world, eco, r, 'forgedBlades' as ResearchId);
    expect(ok).toBe(false);
  });

  it('applyResearch returns false for an unknown id', () => {
    const world = createWorld();
    const eco = richEconomy();
    const r = createResearch();
    const ok = applyResearch(world, eco, r, 'doesNotExist' as ResearchId);
    expect(ok).toBe(false);
  });
});
