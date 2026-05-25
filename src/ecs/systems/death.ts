import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import {
  AnimationState,
  DeathTimer,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';

/** Seconds a corpse lingers (plays the death clip) before removal. */
const DEATH_DELAY: number = COMBAT.deathDelay;

/**
 * M_EXPANSION.F.96 — Hero permadeath signal. Returned as part of
 * the deathSystem tick result so runEconomyTick can flip
 * game.outcome to 'loss' immediately when the player's Hero dies.
 * Permadeath is a hard rule — no respawn, no retreat heal.
 */
export interface DeathSystemResult {
  enemyKills: number;
  /**
   * M_FUN.QA.AIVAI.ZONE-BREAKDOWN — hex keys (q,r → "q,r") where each
   * enemy death occurred this tick. The caller classifies them into
   * skirmish / encroachment / assault zone classes against the live
   * zones state. Kept as raw keys (not pre-classified) so the death
   * system stays decoupled from game.zones.
   */
  enemyDeathKeys: string[];
  playerHeroDied: boolean;
}

/**
 * Handle unit death. A unit at 0 Health enters the DYING animation state and
 * gains a `DeathTimer` component; after `DEATH_DELAY` seconds (the death clip
 * length) it is removed from the world. The timer is an ECS component, so a
 * mid-death unit survives a save/load round-trip.
 *
 * Returns: `{ enemyKills, enemyDeathKeys, playerHeroDied }` — the caller credits
 * enemy kills, marks tiles whose enemies just died (for kill-zone tagging via
 * `enemyDeathKeys`), and flips game.outcome on hero permadeath (M_EXPANSION.F.96).
 */
export function deathSystem(world: World, delta: number): DeathSystemResult {
  let enemyKills = 0;
  const enemyDeathKeys: string[] = [];
  let playerHeroDied = false;
  for (const entity of world.query(Unit, Health, AnimationState)) {
    const health = entity.get(Health);
    if (!health || health.current > 0) continue;

    const anim = entity.get(AnimationState);
    if (anim && anim.state !== 'DYING') {
      entity.set(AnimationState, { state: 'DYING' });
    }

    // accumulate the death countdown on the entity itself
    if (!entity.has(DeathTimer)) entity.add(DeathTimer);
    const timer = entity.get(DeathTimer);
    const elapsed = (timer?.elapsed ?? 0) + delta;
    if (elapsed >= DEATH_DELAY) {
      const faction = entity.get(FactionTrait)?.faction;
      if (faction === 'enemy') {
        enemyKills += 1;
        const hex = entity.get(HexPosition);
        if (hex) enemyDeathKeys.push(`${hex.q},${hex.r}`);
      }
      // M_EXPANSION.F.96 — Hero permadeath. If THIS removed entity
      // is a player-faction Hero, signal up so the runtime can flip
      // game.outcome to 'loss'. The signal fires once per death tick;
      // the only-one-hero-alive guard in trainUnit prevents respawn.
      const unitType = entity.get(Unit)?.unitType;
      if (faction === 'player' && unitType === 'Hero') playerHeroDied = true;
      // M_EXPANSION.A.17 — drop a coffin visual at the death tile for
      // 3s after the unit removal. Enemy deaths only (player corpses
      // wouldn't be coffin-themed). DeathDropLayer (world component)
      // listens for this event and renders + ages the drops.
      if (faction === 'enemy' && typeof window !== 'undefined') {
        const hex = entity.get(HexPosition);
        if (hex) {
          window.dispatchEvent(
            new CustomEvent('aethelgard:enemy-death-drop', { detail: { q: hex.q, r: hex.r } }),
          );
        }
      }
      // M_EXPANSION.AU.47 — death SFX per unit type. main.tsx listens
      // and routes to emitUiSound('unit-death-*') so the audio layer
      // can pick a sample appropriate to the unit (rocky thump for
      // Trebuchet, normal for Footman, magic-impact for Wizard).
      if (typeof window !== 'undefined') {
        const unitType = entity.get(Unit)?.unitType;
        if (unitType) {
          window.dispatchEvent(new CustomEvent('aethelgard:unit-death', { detail: { unitType } }));
        }
      }
      entity.destroy();
    } else {
      entity.set(DeathTimer, { elapsed });
    }
  }
  return { enemyKills, enemyDeathKeys, playerHeroDied };
}
