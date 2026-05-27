/**
 * M_V11.CAMPS.HOSTILE-ALL — target picker for barbarian-camp mobs.
 *
 * Per spec: "Mobs FactionTrait 'barbarian-camp-*' treat ALL other
 * factions (player, enemy, other barbarian-camps) as hostile EXCEPT
 * their own camp's faction. No mob-vs-mob friendly fire within a
 * single camp."
 *
 * The existing stanceBehaviorSystem only runs for player-faction
 * military units. The legacy aiSystem (perception.ts) only collects
 * 'player'-faction targets, so enemy AI units find players. Neither
 * picks targets FOR barbarian mobs.
 *
 * This system fills that gap. For each mob with FactionTrait starting
 * with 'barbarian-camp-' and Combatant + HexPosition + EnemyTarget:
 *  - If the current target is still alive AND in aggro range, keep it.
 *  - Otherwise, scan all non-barbarian-camp-N entities (i.e. player,
 *    enemy, AND other barbarian-camp-M for M != N) within aggro
 *    radius and pick the nearest as the new target.
 *
 * Combat resolution itself (combat.ts) doesn't gate on faction — it
 * just resolves attacks against the EnemyTarget id — so setting the
 * target is sufficient to make a mob hostile to that entity.
 */
import type { Entity, World } from 'koota';
import { COMBAT } from '@/config/combat';
import { hexDistance } from '@/core/hex';
import { Combatant, EnemyTarget, FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';

const AGGRO_RADIUS: number = COMBAT.ai.aggroRadius;

export function mobTargetingSystem(world: World): void {
  // Index every living entity by id for stale-target checks.
  const byId = new Map<number, Entity>();
  for (const e of world.query(Health, HexPosition)) {
    if ((e.get(Health)?.current ?? 0) > 0) byId.set(Number(e), e);
  }

  for (const mob of world.query(Combatant, FactionTrait, HexPosition, EnemyTarget, Unit)) {
    const fac = mob.get(FactionTrait)?.faction as unknown as string | undefined;
    if (!fac?.startsWith('barbarian-camp-')) continue;
    const hex = mob.get(HexPosition);
    if (!hex) continue;
    const currentTarget = mob.get(EnemyTarget);
    // Keep an alive in-range target.
    if (currentTarget && currentTarget.targetId !== -1) {
      const t = byId.get(currentTarget.targetId);
      if (t) {
        const th = t.get(HexPosition);
        if (th && hexDistance(hex.q, hex.r, th.q, th.r) <= AGGRO_RADIUS) continue;
      }
    }
    // Re-acquire: nearest non-same-camp entity within aggro radius.
    let nearest: Entity | null = null;
    let nearestDist = AGGRO_RADIUS + 1;
    for (const cand of byId.values()) {
      const candFac = cand.get(FactionTrait)?.faction as unknown as string | undefined;
      if (!candFac) continue;
      if (candFac === fac) continue; // no friendly fire within same camp
      const ch = cand.get(HexPosition);
      if (!ch) continue;
      const d = hexDistance(hex.q, hex.r, ch.q, ch.r);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = cand;
      }
    }
    mob.set(EnemyTarget, { targetId: nearest ? Number(nearest) : -1 });
  }
}
