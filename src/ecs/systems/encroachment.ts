import type { World } from 'koota';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { getHexKey, parseHexKey } from '@/core/hex';
import { type Faction, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { Difficulty } from '@/game/difficulty';
import { claimTile, releaseTile, type ZoneState } from '@/game/zone';

// M_REGISTRY.17 — MILITARY unified into UNIT_PROFILES.combatRole.
import { MILITARY_ROLES as MILITARY } from '@/rules/unit-profiles';

/**
 * Encroachment grace window (seconds) per difficulty (spec 102). When an enemy
 * military unit stands on your controlled tile, the tile pulses for this many
 * seconds — if you do not respond by bringing a military unit to defend it, it
 * flips to the encroaching faction.
 */
const PULSE_SECONDS: Record<Difficulty, number> = {
  easy: 12, // long grace — the player has time to react
  normal: 7,
  hard: 4,
};

/** The other faction. */
function opposite(faction: Faction): Faction {
  return faction === 'player' ? 'enemy' : 'player';
}

/**
 * Run the encroachment system one tick (spec 102):
 *
 * 1. Identify each faction's controlled tiles that an enemy MILITARY unit
 *    currently stands on — those tiles are under encroachment.
 * 2. Add `delta` to each such tile's pulse timer (start at 0 if new).
 * 3. If the defending faction has a military unit on or adjacent to the tile,
 *    cancel the pulse — the claim is defended.
 * 4. When a pulse exceeds `PULSE_SECONDS[difficulty]`, FLIP the tile: release
 *    from the defender, claim for the encroacher, clear the pulse.
 *
 * Peons never encroach (they're nonviolent — `MILITARY` excludes them) and
 * peon-rules already routes them away from pulsing tiles (M8.6c).
 */
export function encroachmentSystem(
  world: World,
  zones: Record<Faction, ZoneState>,
  delta: number,
  difficulty: Difficulty,
): void {
  const grace = PULSE_SECONDS[difficulty];

  // index every faction's military positions for quick membership tests
  const militaryByFaction: Record<Faction, Set<string>> = {
    player: new Set(),
    enemy: new Set(),
  };
  for (const e of world.query(Unit, HexPosition, FactionTrait)) {
    const role = e.get(Unit)?.unitType;
    if (!role || !MILITARY.has(role)) continue;
    const faction = e.get(FactionTrait)?.faction;
    const hex = e.get(HexPosition);
    if (!faction || !hex) continue;
    militaryByFaction[faction].add(getHexKey(hex.q, hex.r));
  }

  for (const faction of ['player', 'enemy'] as const) {
    const myZone = zones[faction];
    const otherZone = zones[opposite(faction)];
    const myMilitary = militaryByFaction[faction];
    const enemyMilitary = militaryByFaction[opposite(faction)];

    // a) advance pulses on currently-encroached tiles + start new pulses
    for (const tileKey of myZone.controlled) {
      if (!enemyMilitary.has(tileKey)) {
        // no enemy on this tile — clear any pulse (the threat passed)
        myZone.pulsing.delete(tileKey);
        continue;
      }
      // an enemy military unit IS on this controlled tile — check defence
      const defended = myMilitary.has(tileKey) || hasAdjacentMilitary(tileKey, myMilitary);
      if (defended) {
        myZone.pulsing.delete(tileKey);
        continue;
      }
      const elapsed = (myZone.pulsing.get(tileKey) ?? 0) + delta;
      if (elapsed >= grace) {
        // flip — the defender lost the tile, the encroacher claims it
        releaseTile(myZone, tileKey);
        claimTile(otherZone, tileKey);
        myZone.pulsing.delete(tileKey);
        // M_AUDIO.6 — only chime when the PLAYER loses a tile (an enemy
        // claim of player territory is the meaningful audio event; the
        // mirror case would just be the enemy AI's progress chatter).
        if (faction === 'player') emitUiSound('critical-alarm');
      } else {
        myZone.pulsing.set(tileKey, elapsed);
      }
    }
  }
}

/** Is any military unit of `set` on a tile adjacent to `tileKey`? */
function hasAdjacentMilitary(tileKey: string, set: Set<string>): boolean {
  const { q, r } = parseHexKey(tileKey);
  const dirs: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  for (const [dq, dr] of dirs) {
    if (set.has(`${q + dq},${r + dr}`)) return true;
  }
  return false;
}
