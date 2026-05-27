import type { World } from 'koota';
import { DISCOVERIES_CONFIG, type DiscoveryEffect } from '@/config/discoveries';
import { Building, Combatant, Harvester, Health, Unit } from '@/ecs/components';
import type { Discovery, DiscoveryApplyCtx } from './discoveries';

/**
 * Dispatch a declarative DiscoveryEffect to its ECS mutation. The CONFIG
 * (discoveries.json) says WHAT each Discovery does; THIS code says HOW each
 * effect kind mutates the world. Adding a new effect kind = a new variant in
 * `DiscoveryEffect` + a new case here. The Discovery rows themselves never
 * need code changes.
 *
 * M_V12.DEPTH.EFFECT-KINDS — v0.11 had 3 effect kinds (buff-combatant /
 * multiply-harvest / flag). v0.12 adds 8 more (see docs/design/v0.12-
 * upgrade-graph.md). Each new kind reads from an optional DiscoveryApplyCtx
 * because they need wider state than just the ECS world (economy for
 * grant-resource, building-overrides for unlock-* / buff-building, etc).
 * The v0.11 kinds keep their old shape; new kinds silently no-op when ctx
 * is missing (the camp-reward grant path passes no ctx today).
 */
function applyEffect(effect: DiscoveryEffect, world: World, ctx?: DiscoveryApplyCtx): void {
  switch (effect.kind) {
    case 'buff-combatant':
      world.query(Combatant).updateEach(([c], entity) => {
        // Optional filter: only apply when entity is the named UnitType.
        if (effect.filter) {
          const unit = entity.get(Unit);
          if (unit?.unitType !== effect.filter) return;
        }
        if (effect.stat === 'attackDamage') c.attackDamage += effect.delta;
        else if (effect.stat === 'attackRange') c.attackRange += effect.delta;
        // CodeRabbit MAJOR fix: 'hp' buff lands on the Health trait
        // (not the Combatant trait — Combatant carries combat stats
        // only). spirit-binding "Wizard HP +20" needs this branch.
        else if (effect.stat === 'hp') {
          const h = entity.get(Health);
          if (h) {
            h.max += effect.delta;
            h.current = Math.min(h.current + effect.delta, h.max);
          }
        }
      });
      break;
    case 'multiply-harvest':
      world.query(Harvester).updateEach(([h]) => {
        h.harvestRate *= effect.factor;
      });
      break;
    case 'flag':
      // M_V7.DISCOVERY-TREE.V6 — flag-only Discoveries gate downstream
      // systems by their `id` (research.purchased.has(id)). No immediate
      // apply effect; the gate happens at the consumer's call site.
      break;
    case 'buff-building': {
      // Stat write goes to the building-overrides map (consumed at next
      // building-construction time by commands.ts) AND to every already-
      // standing building of the named type so the buff is immediate.
      if (ctx?.buildingOverrides) {
        const prev = ctx.buildingOverrides.get(effect.buildingType) ?? {};
        const next = { ...prev };
        if (effect.stat === 'hp') next.hp = (prev.hp ?? 0) + effect.delta;
        else if (effect.stat === 'dps') next.dps = (prev.dps ?? 0) + effect.delta;
        else if (effect.stat === 'output') next.output = (prev.output ?? 0) + effect.delta;
        ctx.buildingOverrides.set(effect.buildingType, next);
      }
      // CodeRabbit MEDIUM fix: also apply to already-standing buildings
      // of the named type so the buff is immediate. The 'hp' stat lands
      // on the Health trait; 'dps' / 'output' are read off the building-
      // profile registry at tick time, so the override map serves
      // those (no per-entity mutation needed for dps/output today).
      if (effect.stat === 'hp') {
        world.query(Building, Health).updateEach(([b, h]) => {
          if (b.buildingType !== effect.buildingType) return;
          h.max += effect.delta;
          h.current = Math.min(h.current + effect.delta, h.max);
        });
      }
      break;
    }
    case 'unlock-unit': {
      if (ctx?.buildingOverrides && effect.fromBuildingType) {
        const prev = ctx.buildingOverrides.get(effect.fromBuildingType) ?? {};
        const trainsUnits = prev.trainsUnits ? [...prev.trainsUnits] : [];
        if (!trainsUnits.includes(effect.unitType)) trainsUnits.push(effect.unitType);
        ctx.buildingOverrides.set(effect.fromBuildingType, { ...prev, trainsUnits });
      }
      break;
    }
    case 'unlock-building': {
      if (ctx?.buildingOverrides) {
        const prev = ctx.buildingOverrides.get(effect.buildingType) ?? {};
        ctx.buildingOverrides.set(effect.buildingType, { ...prev, constructible: true });
      }
      break;
    }
    case 'unlock-formation': {
      if (ctx?.flags) {
        ctx.flags.set(`formation:${effect.formationId}`, true);
      }
      break;
    }
    case 'modify-cost': {
      if (ctx?.buildingOverrides && effect.target === 'building') {
        const prev = ctx.buildingOverrides.get(effect.targetId) ?? {};
        const cost = { ...(prev.cost ?? {}) };
        cost[effect.resource] = Math.max(0, (cost[effect.resource] ?? 0) + effect.delta);
        ctx.buildingOverrides.set(effect.targetId, { ...prev, cost });
      }
      // CodeRabbit MAJOR fix: v0.12 Engineering/Production II
      // (guild-conduits) uses target='unit' for Trebuchet cost;
      // mirror the building branch against unitOverrides so the
      // discovery actually lands its mutation instead of silently
      // no-opping.
      if (ctx?.unitOverrides && effect.target === 'unit') {
        const prev = ctx.unitOverrides.get(effect.targetId) ?? {};
        const cost = { ...(prev.cost ?? {}) };
        cost[effect.resource] = Math.max(0, (cost[effect.resource] ?? 0) + effect.delta);
        ctx.unitOverrides.set(effect.targetId, { ...prev, cost });
      }
      break;
    }
    case 'modify-supply': {
      if (ctx?.economy) {
        ctx.economy.maxSupply += effect.delta;
      }
      break;
    }
    case 'reveal-tier': {
      if (ctx?.flags) {
        ctx.flags.set('reveal-tier', effect.tier);
      }
      break;
    }
    case 'grant-resource': {
      if (ctx?.economy) {
        ctx.economy[effect.resource] = (ctx.economy[effect.resource] ?? 0) + effect.amount;
      }
      // Buildings touched by this effect (none today — Buildings are
      // immutable at compile time). The query keeps the import live
      // for future buff-building / unlock-* paths that walk standing
      // buildings.
      void Building;
      break;
    }
  }
}

/**
 * The Discoveries registry — derived from discoveries.json + the effect
 * dispatcher. ONE table driving the HUD, the AI's potential goals, and
 * save/load. Adding a Discovery = a new row in discoveries.json. Adding a new
 * effect KIND = a variant in DiscoveryEffect + a case in applyEffect above.
 */
export const DISCOVERIES: ReadonlyArray<Discovery> = DISCOVERIES_CONFIG.discoveries.map(
  (config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
    cost: config.cost,
    prereqs: config.prereqs,
    apply: (world: World, ctx?: DiscoveryApplyCtx) => applyEffect(config.effect, world, ctx),
  }),
);

// Reviewer M3 fix: O(n) find → O(1) Map lookup. Hot path:
// applyChainStarters (up to 12 lookups per game start), AI
// evaluators, DiscoveriesPanel render. Built once at module load.
const DISCOVERIES_BY_ID = new Map<string, Discovery>(DISCOVERIES.map((d) => [d.id, d]));

/** Look up a Discovery by id. Returns undefined if unknown. */
export function discoveryById(id: string): Discovery | undefined {
  return DISCOVERIES_BY_ID.get(id);
}
