/**
 * M_V12.DEPTH.EFFECT-KINDS — pin the 8 new effect kinds shipped
 * for the v0.12 upgrade-graph expansion.
 *
 * The v0.11 effect kinds (buff-combatant / multiply-harvest /
 * flag) are pinned by existing tests. This file covers the
 * additions: buff-building, unlock-unit, unlock-building,
 * unlock-formation, modify-cost, modify-supply, reveal-tier,
 * grant-resource. Each kind gets a tiny test that asserts the
 * ctx mutation lands.
 *
 * CodeRabbit MAJOR fix (PR #90): the previous version mirrored
 * the dispatcher switch inline, so the test could pass even if
 * the production dispatcher in src/rules/discovery-registry.ts
 * regressed differently. This version exercises the REAL
 * dispatcher via the exported applyEffect(effect, world, ctx)
 * entry point. The same path Discovery.apply takes.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import type { DiscoveryEffect } from '@/config/progression';
import { createEconomy, type GameEconomy } from '@/game/economy';
import type { DiscoveryApplyCtx } from '@/rules/discoveries';
import { applyEffect } from '@/rules/discovery-registry';

function makeEmptyEconomy(): GameEconomy {
  return createEconomy();
}

function makeCtx(): DiscoveryApplyCtx {
  return {
    economy: makeEmptyEconomy(),
    flags: new Map(),
    buildingOverrides: new Map(),
    unitOverrides: new Map(),
  };
}

function apply(effect: DiscoveryEffect, ctx: DiscoveryApplyCtx): void {
  // Production dispatcher needs a koota world; an empty one is
  // sufficient for the non-ECS-mutating effect kinds tested here.
  // For ECS-mutating kinds (buff-combatant, multiply-harvest) the
  // empty world is fine — the query returns no entities and the
  // dispatcher is a no-op on them, which is the same outcome we'd
  // want to assert if the world contained no combatants.
  applyEffect(effect, createWorld(), ctx);
}

describe('M_V12.DEPTH.EFFECT-KINDS — production dispatcher pins', () => {
  it('buff-building writes hp delta to the buildingOverrides map', () => {
    const ctx = makeCtx();
    apply({ kind: 'buff-building', buildingType: 'Wall', stat: 'hp', delta: 50 }, ctx);
    expect(ctx.buildingOverrides?.get('Wall')?.hp).toBe(50);
  });

  it('unlock-unit appends to trainsUnits on the named building', () => {
    const ctx = makeCtx();
    apply({ kind: 'unlock-unit', unitType: 'Trebuchet', fromBuildingType: 'Workshop' }, ctx);
    expect(ctx.buildingOverrides?.get('Workshop')?.trainsUnits).toEqual(['Trebuchet']);
  });

  it('unlock-building flags the type constructible', () => {
    const ctx = makeCtx();
    apply({ kind: 'unlock-building', buildingType: 'Foundry' }, ctx);
    expect(ctx.buildingOverrides?.get('Foundry')?.constructible).toBe(true);
  });

  it('unlock-formation writes the formation: flag', () => {
    const ctx = makeCtx();
    apply({ kind: 'unlock-formation', formationId: 'phalanx' }, ctx);
    expect(ctx.flags?.get('formation:phalanx')).toBe(true);
  });

  it('modify-cost (building target) reduces named building resource cost', () => {
    const ctx = makeCtx();
    apply(
      {
        kind: 'modify-cost',
        target: 'building',
        targetId: 'Trebuchet',
        resource: 'stone',
        delta: -10,
      },
      ctx,
    );
    expect(ctx.buildingOverrides?.get('Trebuchet')?.cost?.stone).toBe(0);
  });

  it('modify-cost (unit target) writes to unitOverrides', () => {
    const ctx = makeCtx();
    apply(
      {
        kind: 'modify-cost',
        target: 'unit',
        targetId: 'Trebuchet',
        resource: 'gold',
        delta: -10,
      },
      ctx,
    );
    expect(ctx.unitOverrides?.get('Trebuchet')?.cost?.gold).toBe(0);
  });

  it('modify-supply adjusts economy.maxSupply', () => {
    const ctx = makeCtx();
    const before = ctx.economy?.maxSupply ?? 0;
    apply({ kind: 'modify-supply', delta: 5 }, ctx);
    expect(ctx.economy?.maxSupply).toBe(before + 5);
  });

  it('reveal-tier writes the reveal-tier flag', () => {
    const ctx = makeCtx();
    apply({ kind: 'reveal-tier', tier: 2 }, ctx);
    expect(ctx.flags?.get('reveal-tier')).toBe(2);
  });

  it('grant-resource adds to economy resource totals', () => {
    const ctx = makeCtx();
    const before = ctx.economy?.gold ?? 0;
    apply({ kind: 'grant-resource', resource: 'gold', amount: 50 }, ctx);
    expect(ctx.economy?.gold).toBe(before + 50);
  });
});
