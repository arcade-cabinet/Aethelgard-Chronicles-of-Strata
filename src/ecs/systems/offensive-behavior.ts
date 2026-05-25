import type { Entity, World } from 'koota';
import { axialToWorld, hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import {
  Building,
  FactionTrait,
  Health,
  HexPosition,
  OffensiveBehavior,
  Transform,
  Unit,
} from '@/ecs/components';
import { type Projectile, spawnProjectile } from '@/game/projectiles';
import type { DamageEvent } from '@/ecs/systems/combat';
// M_REGISTRY.17 — MILITARY set unified into UNIT_PROFILES.combatRole.
// Was a 6-role hand-built set duplicated across 3 modules; corrected
// by-derivation to include Trebuchet (was missing in the legacy set).
import { MILITARY_ROLES as MILITARY } from '@/rules/unit-profiles';

/** Seconds between projectile shots per offensive source (cadence). */
const FIRE_CADENCE = 1.2;

/** Project a hex-position to a world point at the entity's transform height. */
function worldAt(e: Entity): { x: number; y: number; z: number } | null {
  const h = e.get(HexPosition);
  if (!h) return null;
  const w = axialToWorld(h.q, h.r);
  const tf = e.get(Transform);
  return { x: w.x, y: tf?.y ?? h.level, z: w.z };
}

/**
 * Offensive-behavior system (spec 102). Iterates EVERY entity with an
 * `OffensiveBehavior` trait — building-type-decoupled. Damage applied
 * continuously per `dps * delta`; in addition, a visible projectile is
 * spawned every `FIRE_CADENCE` seconds per source toward its nearest valid
 * target (M_COMBAT_POLISH.1 — visible feedback). Damage is independent of
 * the projectile FX; the projectile is the *visual* of an already-applied
 * damage stream.
 */
export function offensiveBehaviorSystem(
  world: World,
  delta: number,
  _eventRng: Rng,
  projectiles?: Projectile[],
  cooldowns?: Map<number, number>,
  projectileIdRef?: { current: number },
  /** M_EXPANSION.U.101 — optional sink for damage events so CombatText
   *  can render floating numbers for offensive-behavior hits too. */
  damageSink?: DamageEvent[],
): void {
  const sources: Array<{
    e: Entity;
    q: number;
    r: number;
    faction: string;
    radius: number;
    dps: number;
    damageType: string;
  }> = [];
  for (const e of world.query(OffensiveBehavior, FactionTrait, HexPosition)) {
    const b = e.get(Building);
    if (b && !b.isComplete) continue;
    const ob = e.get(OffensiveBehavior);
    const f = e.get(FactionTrait)?.faction;
    const h = e.get(HexPosition);
    if (!ob || !f || !h) continue;
    sources.push({
      e,
      q: h.q,
      r: h.r,
      faction: f,
      radius: ob.radius,
      dps: ob.dps,
      damageType: ob.damageType,
    });
  }
  if (sources.length === 0) return;

  // For each enemy military unit: apply damage from at most ONE source per
  // tick (avoid stacking). Track WHICH source picked it so projectile FX
  // emits source→that-target.
  const picks = new Map<number, { src: (typeof sources)[number]; target: Entity }>();
  for (const target of world.query(Unit, FactionTrait, HexPosition, Health)) {
    const role = target.get(Unit)?.unitType;
    if (!role || !MILITARY.has(role)) continue;
    const unitFaction = target.get(FactionTrait)?.faction;
    const hex = target.get(HexPosition);
    const hp = target.get(Health);
    if (!unitFaction || !hex || !hp) continue;
    for (const s of sources) {
      if (s.faction === unitFaction) continue;
      if (hexDistance(s.q, s.r, hex.q, hex.r) <= s.radius) {
        // M_AUDIT2.ARCH.42 LATENT BUG FIX: koota `entity.get(Health)`
        // returns a SNAPSHOT (SoA-layout copy); mutating `hp.current`
        // in place was a no-op since the system shipped. Use `.set`
        // like combat.ts does so the canonical store receives the
        // damage. Surfaced by the new test (offensive-behavior.test.ts).
        const applied = s.dps * delta;
        target.set(Health, {
          ...hp,
          current: Math.max(0, hp.current - applied),
        });
        // M_EXPANSION.U.101 — push a DamageEvent so CombatText shows
        // a floating number above the target. Round to int — fractional
        // dps* delta reads as noisy. Skip 0-ish.
        if (damageSink && applied >= 0.5) {
          damageSink.push({
            target,
            damage: Math.round(applied),
            isCrit: false,
            damageType: (s.damageType as DamageEvent['damageType']) ?? 'normal',
            // M_POLISH.3 — this path is the ranged/dps overlay; melee
            // sword strikes go through combat.ts proper, so flag false
            // and never trigger a parry from here.
            isMeleeSword: false,
            parried: false,
            // Coderabbit MAJOR PR #10 04:56Z — flip on actual kill
            // (post-apply HP went to 0). The trinket-dps overlay
            // applies damage inline above, so we know immediately.
            isKill: hp.current - applied <= 0 && hp.current > 0,
          });
        }
        // record the first picked source for projectile FX
        const sid = Number(s.e);
        if (!picks.has(sid)) picks.set(sid, { src: s, target });
        break;
      }
    }
  }

  // Cadence-gated projectile emission (presentation only — damage already
  // applied above). Requires the optional projectile/cooldown bags.
  if (!projectiles || !cooldowns || !projectileIdRef) return;
  for (const [sid, { src, target }] of picks) {
    const prev = cooldowns.get(sid) ?? FIRE_CADENCE;
    const next = prev + delta;
    if (next < FIRE_CADENCE) {
      cooldowns.set(sid, next);
      continue;
    }
    cooldowns.set(sid, 0);
    const start = worldAt(src.e);
    const end = worldAt(target);
    if (!start || !end) continue;
    // M_EXPANSION.AU.44 — pick projectile kind from damageType so the
    // visual matches the sim. Wizards (damageType='magic') get the
    // 'magic' projectile + a magic-cast SFX emitted through a window
    // event (sim is DOM-free; the HUD listener routes to emitUiSound).
    const kind =
      src.damageType === 'magic' ? 'magic' : src.damageType === 'siege' ? 'bolt' : 'arrow';
    spawnProjectile(projectiles, projectileIdRef, start, end, kind);
    if (kind === 'magic' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethelgard:magic-cast'));
    }
  }
}
