/**
 * M_FUN.ATTR.DISEASE + M_FUN.ATTR.DEHYDRATION — per-tick status
 * attribute processor.
 *
 * Disease:
 *   - HP ticks -1 / sim-second while Health.disease > 0
 *   - cleared by a friendly Healer in 2-hex range (instant)
 *   - OR cleared by recovery: standing on GRASS for 5+ seconds
 *     (diseaseRecoveryTimer accumulates only while NOT in
 *     swamp/SWAMP-adjacent territory)
 *
 * Dehydration:
 *   - suppresses natural HP regen while Health.dehydration > 0
 *     (regen lives elsewhere; this just maintains the gate)
 *   - cleared by recovery: standing OFF DESERT for 3+ seconds
 *
 * Both clears decrement the attribute toward 0 once the recovery
 * timer fires, mirroring the fatigue decay pattern.
 *
 * Per spec docs/specs/120-map-architecture.md § Security note —
 * the consumer side is sim-authoritative; no client-asserted
 * "I'm cured" path.
 */
import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';
import { hexDistance } from '@/core/hex';

/** Recovery thresholds (seconds). */
const DISEASE_RECOVERY = 5;
const DEHYDRATION_RECOVERY = 3;

/**
 * Apply per-tick disease + dehydration effects.
 *
 * @param world  - the koota world
 * @param tiles  - board tiles map (to read each entity's tile biome)
 * @param delta  - sim seconds since last tick
 */
export function statusAttributesSystem(
  world: World,
  tiles: BoardData['tiles'],
  delta: number,
): void {
  // Index healer positions per faction — O(units) once per tick;
  // each diseased unit then checks the 2-hex radius via hexDistance.
  const healersByFaction = new Map<string, Array<{ q: number; r: number }>>();
  for (const e of world.query(Unit, FactionTrait, HexPosition)) {
    const u = e.get(Unit);
    if (u?.unitType !== 'Healer') continue;
    const f = e.get(FactionTrait)?.faction;
    const h = e.get(HexPosition);
    if (!f || !h) continue;
    const list = healersByFaction.get(f) ?? [];
    list.push({ q: h.q, r: h.r });
    healersByFaction.set(f, list);
  }

  for (const e of world.query(Health, HexPosition)) {
    const h = e.get(Health);
    const pos = e.get(HexPosition);
    if (!h || !pos) continue;

    const tile = tiles.get(`${pos.q},${pos.r}`);
    const tileType = tile?.type ?? 'GRASS';

    // Disease re-arms while standing on SWAMP (the wet ground is
    // the disease source — leaving the tile starts recovery).
    // Refresh attribute timer so it doesn't decay before damage
    // ticks have had time to bite. attributeStrength is the JSON-
    // configured strength (1.0 for SWAMP); the recovery threshold
    // is reset to 0 on every tick spent in the source biome.
    if (tileType === 'SWAMP' && h.disease < 1) {
      // Mutate via set so the subsequent disease branch sees the
      // refreshed value. (h is a snapshot; mutating h.disease alone
      // would be lost on the next .get().)
      const dur = 5; // matches biomeRule(SWAMP).attributeStrength * 5
      e.set(Health, { ...h, disease: dur, diseaseRecoveryTimer: 0 });
      h.disease = dur;
      h.diseaseRecoveryTimer = 0;
    }
    if (tileType === 'DESERT' && h.dehydration < 1) {
      const dur = 5;
      e.set(Health, { ...h, dehydration: dur, dehydrationRecoveryTimer: 0 });
      h.dehydration = dur;
      h.dehydrationRecoveryTimer = 0;
    }

    // Disease tick: -1 HP per sim-second.
    if (h.disease > 0) {
      // Healer-clear check.
      const f = e.get(FactionTrait)?.faction;
      const healers = (f && healersByFaction.get(f)) || [];
      const healed = healers.some((he) => hexDistance(he.q, he.r, pos.q, pos.r) <= 2);
      if (healed) {
        e.set(Health, { ...h, disease: 0, diseaseRecoveryTimer: 0 });
      } else {
        // Damage tick.
        const damage = delta;
        // Recovery tick: only accumulates if NOT on SWAMP.
        const onSwamp = tileType === 'SWAMP';
        const newRecovery = onSwamp ? 0 : h.diseaseRecoveryTimer + delta;
        let newDisease = Math.max(0, h.disease - delta);
        if (newRecovery >= DISEASE_RECOVERY) {
          newDisease = 0;
        }
        e.set(Health, {
          ...h,
          current: Math.max(0, h.current - damage),
          disease: newDisease,
          diseaseRecoveryTimer: newRecovery,
        });
      }
    }

    // Dehydration tick: maintain the gate field. The actual HP-regen
    // suppression lives in whatever HP-regen system exists; today we
    // just track the recovery timer so a future regen system can
    // consult Health.dehydration > 0.
    if (h.dehydration > 0) {
      const onDesert = tileType === 'DESERT';
      const newRecovery = onDesert ? 0 : h.dehydrationRecoveryTimer + delta;
      let newDehydration = Math.max(0, h.dehydration - delta);
      if (newRecovery >= DEHYDRATION_RECOVERY) {
        newDehydration = 0;
      }
      e.set(Health, {
        ...h,
        dehydration: newDehydration,
        dehydrationRecoveryTimer: newRecovery,
      });
    }
  }
}
