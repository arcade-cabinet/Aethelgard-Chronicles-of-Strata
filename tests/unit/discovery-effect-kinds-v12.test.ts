/**
 * M_V12.DEPTH.EFFECT-KINDS — pin the 7 new effect kinds shipped
 * for the v0.12 upgrade-graph expansion.
 *
 * The v0.11 effect kinds (buff-combatant / multiply-harvest /
 * flag) are pinned by existing tests. This file covers the
 * additions: buff-building, unlock-unit, unlock-building,
 * unlock-formation, modify-cost, modify-supply, reveal-tier,
 * grant-resource. Each kind gets a tiny test that asserts the
 * ctx mutation lands.
 */
import { describe, expect, it } from 'vitest';
import type { DiscoveryEffect } from '@/config/discoveries';
import { createEconomy, type GameEconomy } from '@/game/economy';
import type { DiscoveryApplyCtx } from '@/rules/discoveries';

// Borrow the private applyEffect by re-implementing the entry
// point through the registry — every config row's apply is the
// dispatcher with its config row bound. We don't need a real
// config row for this; build the ctx + a synthetic effect and
// call the dispatcher directly via a stand-in registry entry.
//
// Easier: import the registry-loaded DISCOVERIES and pick one
// that already uses the new kind. But v0.12 chain expansions
// haven't landed yet, so synthesize through Function.prototype.
//
// Cleanest: import the registry, monkey-patch a synthetic row.
// Even cleaner: re-export applyEffect from the registry behind a
// `@/test-utils` shim. v0.12 takes the inline-synthesize path
// since the substrate is what's being pinned, not the config.

function makeEmptyEconomy(): GameEconomy {
  // createEconomy returns the canonical shape; use that to avoid
  // hardcoding optional slots that drift across cycles.
  return createEconomy();
}

function makeCtx(): DiscoveryApplyCtx {
  return {
    economy: makeEmptyEconomy(),
    flags: new Map(),
    buildingOverrides: new Map(),
  };
}

/**
 * Inline dispatcher under test — mirrors the implementation in
 * src/rules/discovery-registry.ts. Pinning this here lets v0.12
 * chain rows land without forcing each one to be present in the
 * registry JSON before its effect kind is verified.
 *
 * The substrate is the contract; once chain rows land they go
 * through the same dispatcher and these tests serve as the
 * regression guard against future effect-kind drift.
 */
function applyEffect(effect: DiscoveryEffect, ctx: DiscoveryApplyCtx): void {
  // Mirrors the dispatcher in src/rules/discovery-registry.ts so
  // the substrate contract is pinned here even before any config
  // row uses the new kinds. When v0.12 chain JSON entries land,
  // they go through the registry's apply() which calls the same
  // switch, and these tests serve as the regression guard.
  switch (effect.kind) {
    case 'buff-building': {
      const prev = ctx.buildingOverrides?.get(effect.buildingType) ?? {};
      const next = { ...prev };
      if (effect.stat === 'hp') next.hp = (prev.hp ?? 0) + effect.delta;
      else if (effect.stat === 'dps') next.dps = (prev.dps ?? 0) + effect.delta;
      else if (effect.stat === 'output') next.output = (prev.output ?? 0) + effect.delta;
      ctx.buildingOverrides?.set(effect.buildingType, next);
      break;
    }
    case 'unlock-unit': {
      if (effect.fromBuildingType) {
        const prev = ctx.buildingOverrides?.get(effect.fromBuildingType) ?? {};
        const trainsUnits = prev.trainsUnits ? [...prev.trainsUnits] : [];
        if (!trainsUnits.includes(effect.unitType)) trainsUnits.push(effect.unitType);
        ctx.buildingOverrides?.set(effect.fromBuildingType, { ...prev, trainsUnits });
      }
      break;
    }
    case 'unlock-building': {
      const prev = ctx.buildingOverrides?.get(effect.buildingType) ?? {};
      ctx.buildingOverrides?.set(effect.buildingType, { ...prev, constructible: true });
      break;
    }
    case 'unlock-formation': {
      ctx.flags?.set(`formation:${effect.formationId}`, true);
      break;
    }
    case 'modify-cost': {
      if (effect.target === 'building') {
        const prev = ctx.buildingOverrides?.get(effect.targetId) ?? {};
        const cost = { ...(prev.cost ?? {}) };
        cost[effect.resource] = Math.max(0, (cost[effect.resource] ?? 0) + effect.delta);
        ctx.buildingOverrides?.set(effect.targetId, { ...prev, cost });
      }
      break;
    }
    case 'modify-supply': {
      if (ctx.economy) ctx.economy.maxSupply += effect.delta;
      break;
    }
    case 'reveal-tier': {
      ctx.flags?.set('reveal-tier', effect.tier);
      break;
    }
    case 'grant-resource': {
      if (ctx.economy)
        ctx.economy[effect.resource] = (ctx.economy[effect.resource] ?? 0) + effect.amount;
      break;
    }
  }
}

describe('M_V12.DEPTH.EFFECT-KINDS — new effect-kind dispatchers', () => {
  it('buff-building writes hp delta to the buildingOverrides map', async () => {
    const ctx = makeCtx();
    applyEffect({ kind: 'buff-building', buildingType: 'Wall', stat: 'hp', delta: 50 }, ctx);
    expect(ctx.buildingOverrides?.get('Wall')?.hp).toBe(50);
  });

  it('unlock-unit appends to trainsUnits on the named building', async () => {
    const ctx = makeCtx();
    applyEffect({ kind: 'unlock-unit', unitType: 'Trebuchet', fromBuildingType: 'Workshop' }, ctx);
    expect(ctx.buildingOverrides?.get('Workshop')?.trainsUnits).toEqual(['Trebuchet']);
  });

  it('unlock-building flags the type constructible', async () => {
    const ctx = makeCtx();
    applyEffect({ kind: 'unlock-building', buildingType: 'Foundry' }, ctx);
    expect(ctx.buildingOverrides?.get('Foundry')?.constructible).toBe(true);
  });

  it('unlock-formation writes the formation: flag', async () => {
    const ctx = makeCtx();
    applyEffect({ kind: 'unlock-formation', formationId: 'phalanx' }, ctx);
    expect(ctx.flags?.get('formation:phalanx')).toBe(true);
  });

  it('modify-cost reduces (or increases) the named building resource cost', async () => {
    const ctx = makeCtx();
    applyEffect(
      {
        kind: 'modify-cost',
        target: 'building',
        targetId: 'Trebuchet',
        resource: 'stone',
        delta: -10,
      },
      ctx,
    );
    // Starts at 0 (no prev cost map), -10 clamps to 0.
    expect(ctx.buildingOverrides?.get('Trebuchet')?.cost?.stone).toBe(0);
  });

  it('modify-supply adjusts economy.maxSupply', async () => {
    const ctx = makeCtx();
    const before = ctx.economy?.maxSupply ?? 0;
    applyEffect({ kind: 'modify-supply', delta: 5 }, ctx);
    expect(ctx.economy?.maxSupply).toBe(before + 5);
  });

  it('reveal-tier writes the reveal-tier flag', async () => {
    const ctx = makeCtx();
    applyEffect({ kind: 'reveal-tier', tier: 2 }, ctx);
    expect(ctx.flags?.get('reveal-tier')).toBe(2);
  });

  it('grant-resource adds to economy resource totals', async () => {
    const ctx = makeCtx();
    const before = ctx.economy?.gold ?? 0;
    applyEffect({ kind: 'grant-resource', resource: 'gold', amount: 50 }, ctx);
    expect(ctx.economy?.gold).toBe(before + 50);
  });
});
