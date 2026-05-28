import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { COMBAT } from '@/config/combat';
import { hexDistance } from '@/core/hex';
import {
  AnimationState,
  DeathTimer,
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  LootCache,
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
  /**
   * M_PIVOT.BARBARIAN-CAMPS — camps cleared this tick. Each entry
   * carries the camp's factionId + position + the faction id that
   * gets the +50 wood / +50 stone / 1 random Discovery reward. The
   * caller (economy-tick-phases) credits the reward against the
   * winning faction's economy. v0.5 uses NEAREST-UNIT proximity as
   * the kill-credit heuristic (proper last-damager tracking is a
   * v0.6 plumbing pass through DamageEvent).
   */
  barbarianCampsCleared: Array<{
    campFactionId: string;
    q: number;
    r: number;
    /** Faction id receiving the clearing reward (nearest-unit faction). */
    clearedBy: string;
  }>;
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
/**
 * M_V11.CAMPS.LOOT — biome-weighted loot bundle. Default is the
 * spec's baseline 10/10/5; FOREST tips toward wood, MOUNTAIN /
 * DESERT toward stone. The function is exported for unit testing.
 */
export function lootForBiome(biome: string | undefined): {
  wood: number;
  stone: number;
  gold: number;
} {
  switch (biome) {
    case 'FOREST':
      return { wood: 15, stone: 5, gold: 5 };
    case 'MOUNTAIN':
    case 'MOUNTAIN_PASS':
    case 'HIGHLAND':
      return { wood: 5, stone: 15, gold: 5 };
    case 'DESERT':
      return { wood: 5, stone: 10, gold: 10 };
    default:
      return { wood: 10, stone: 10, gold: 5 };
  }
}

export function deathSystem(
  world: World,
  delta: number,
  /** Optional board — when supplied, barbarian-camp mob deaths drop
   *  a biome-weighted LootCache on their tile. Without the board the
   *  drop is skipped (legacy callers + tests). */
  board?: BoardData,
): DeathSystemResult {
  let enemyKills = 0;
  const enemyDeathKeys: string[] = [];
  let playerHeroDied = false;
  const barbarianCampsCleared: DeathSystemResult['barbarianCampsCleared'] = [];

  // M_PIVOT.BARBARIAN-CAMPS — sweep destroyed camps (FactionBase entities
  // tagged with a barbarian-camp-* faction id at 0 HP). Each cleared camp
  // emits the +reward to the nearest non-barbarian-camp faction's units.
  // Camp entity is destroyed immediately (no death-anim delay — barbarian
  // bases are buildings, not units).
  for (const entity of world.query(FactionBase, Health, HexPosition, FactionTrait)) {
    const health = entity.get(Health);
    if (!health || health.current > 0) continue;
    const factionId = entity.get(FactionTrait)?.faction as unknown as string | undefined;
    if (!factionId?.startsWith('barbarian-camp-')) continue;
    const hex = entity.get(HexPosition);
    if (!hex) continue;
    // Find the nearest non-barbarian-camp unit; that faction claims the camp.
    let nearestFaction: string | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const unit of world.query(Unit, FactionTrait, HexPosition)) {
      const f = unit.get(FactionTrait)?.faction as unknown as string | undefined;
      if (!f || f.startsWith('barbarian-camp-')) continue;
      const uh = unit.get(HexPosition);
      if (!uh) continue;
      const d = hexDistance(hex.q, hex.r, uh.q, uh.r);
      if (d < nearestDist) {
        nearestDist = d;
        nearestFaction = f;
      }
    }
    if (nearestFaction !== null) {
      barbarianCampsCleared.push({
        campFactionId: factionId,
        q: hex.q,
        r: hex.r,
        clearedBy: nearestFaction,
      });
    }
    // M_V11.CAMPS.DESTROY — cascade: kill every mob spawned from
    // this camp (matching FactionTrait). Set Health.current=0 so
    // the existing per-unit death pipeline (DeathTimer +
    // dispatchEvent + LootCache drop) runs uniformly. Avoids
    // orphan mobs that would keep wandering after their camp is
    // gone.
    for (const mob of world.query(Unit, FactionTrait, Health)) {
      const mobFac = mob.get(FactionTrait)?.faction as unknown as string | undefined;
      if (mobFac !== factionId) continue;
      const mobHp = mob.get(Health);
      if (!mobHp || mobHp.current <= 0) continue;
      mob.set(Health, { ...mobHp, current: 0 });
    }
    entity.destroy();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aethelgard:barbarian-camp-cleared', {
          detail: { campFactionId: factionId, q: hex.q, r: hex.r, clearedBy: nearestFaction },
        }),
      );
    }
  }

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
      // M_V11.CAMPS.MOB-SPAWN — when a barbarian-camp-N mob dies,
      // decrement liveMobs on the matching camp's EnemySpawner so a
      // capped camp can replenish. Match is via FactionTrait shared
      // between mob + spawner.
      const factionStr = faction as unknown as string | undefined;
      if (factionStr?.startsWith('barbarian-camp-')) {
        for (const camp of world.query(EnemySpawner, FactionTrait)) {
          const campFaction = camp.get(FactionTrait)?.faction as unknown as string | undefined;
          if (campFaction !== factionStr) continue;
          const spawner = camp.get(EnemySpawner);
          if (!spawner) continue;
          if (spawner.mobCap > 0) {
            camp.set(EnemySpawner, { ...spawner, liveMobs: Math.max(0, spawner.liveMobs - 1) });
          }
          break;
        }
        // M_V11.CAMPS.LOOT — drop a biome-weighted resource cache on
        // the death tile. First non-barbarian unit to occupy the tile
        // collects (handled by lootPickupSystem).
        if (board) {
          const deathHex = entity.get(HexPosition);
          if (deathHex) {
            const tile = board.tiles.get(`${deathHex.q},${deathHex.r}`);
            const drop = lootForBiome(tile?.type);
            const cache = world.spawn(HexPosition, LootCache);
            cache.set(HexPosition, { q: deathHex.q, r: deathHex.r, level: deathHex.level });
            cache.set(LootCache, drop);
          }
        }
      }
      entity.destroy();
    } else {
      entity.set(DeathTimer, { elapsed });
    }
  }
  return { enemyKills, enemyDeathKeys, playerHeroDied, barbarianCampsCleared };
}
