import type { Entity, World } from 'koota';
import {
  AnimationState,
  AssignedJob,
  Building,
  type BuildingType,
  Combatant,
  FactionTrait,
  Harvester,
  Health,
  HexPosition,
  Movement,
  PathQueue,
  Selectable,
  Unit,
} from '@/ecs/components';
import { parseHexKey } from '@/core/hex';
import { setRelation } from '@/game/diplomacy';
import type { GameState } from '@/game/game-state';

/**
 * M_V11.BUILDINGS-EXPANSION (#77e runtime wire-ups) — per-building
 * completion side-effects. Called when a Building flips isComplete
 * false→true. Most buildings rely on traits set at spawn (the
 * OffensiveBehavior / DefensiveBehavior / etc) and need no extra
 * hook; the entries below are buildings whose effect FIRES at
 * completion-time (not continuously per-tick).
 *
 * The dispatch is keyed by buildingType + faction so a side-effect
 * can read the surrounding game state and mutate it.
 */
function onBuildingComplete(
  game: GameState,
  type: BuildingType,
  faction: string,
  tileKey: string,
  site: Entity,
): void {
  if (type === 'MageTower') {
    // Spawn a tower-bound MageTowerGarrison unit on the tower tile.
    // The garrison is a selectable unit so the player can target
    // repairs / inspect health; speed=0 keeps it pinned.
    const pos = parseHexKey(tileKey);
    game.world.spawn(
      Unit({ unitType: 'MageTowerGarrison' }),
      FactionTrait({ faction: faction as 'player' | 'enemy' }),
      HexPosition({ q: pos.q, r: pos.r, level: 0 }),
      Movement({ speed: 0.01, isMoving: false }),
      PathQueue({ steps: [] }),
      AnimationState({ state: 'IDLE' }),
      Selectable({ isSelected: false }),
      Health({ current: 120, max: 120 }),
      Combatant({
        attackRange: 3,
        attackDamage: 16,
        attackCooldown: 1.6,
        attackTimer: 0,
      }),
    );
  } else if (type === 'Embassy') {
    // Establish has-had-contact with every faction whose zone touches
    // the player's zone. Iterates the zones once and adds a relation
    // entry (initial state 'neutral' would be deleted by setRelation,
    // so we use 'ally' as the "we've met but no formal pact" placeholder
    // — the diplomacy modal lets the player change it).
    if (faction !== 'player') {
      void site; // enemy embassies don't auto-establish contact
      return;
    }
    const playerZone = game.zones[faction as 'player'];
    if (!playerZone || playerZone.controlled.size === 0) return;
    const now = game.clock.elapsed;
    for (const fc of game.factions) {
      if (fc.id === faction) continue;
      const otherZone = game.zones[fc.id as 'enemy'];
      if (!otherZone) continue;
      // Touch-check: any other-zone tile adjacent to any player tile.
      let touches = false;
      for (const playerKey of playerZone.controlled) {
        const p = parseHexKey(playerKey);
        // 6 neighbours of the player tile
        const neighbours = [
          `${p.q + 1},${p.r}`,
          `${p.q - 1},${p.r}`,
          `${p.q},${p.r + 1}`,
          `${p.q},${p.r - 1}`,
          `${p.q + 1},${p.r - 1}`,
          `${p.q - 1},${p.r + 1}`,
        ];
        for (const nk of neighbours) {
          if (otherZone.controlled.has(nk)) {
            touches = true;
            break;
          }
        }
        if (touches) break;
      }
      if (touches) {
        setRelation(game.diplomacy, faction, fc.id, 'ally', now, null, now + 300);
      }
    }
  } else if (type === 'Lighthouse') {
    // Reveal ocean / shallows tiles in 5-hex radius around the
    // lighthouse permanently. Pulls the player zone's `observed`
    // set and adds matching biome tiles.
    if (faction !== 'player') return;
    const playerZone = game.zones[faction as 'player'];
    if (!playerZone) return;
    const pos = parseHexKey(tileKey);
    for (const [key, tile] of game.board.tiles) {
      if (tile.type !== 'OCEAN' && tile.type !== 'SHALLOWS') continue;
      const tp = parseHexKey(key);
      // Cheap manhattan-ish hex distance via axial.
      const dq = tp.q - pos.q;
      const dr = tp.r - pos.r;
      const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
      if (dist <= 5) playerZone.observed.add(key);
    }
  }
  // Market + Workshop have no completion-time side effect; their
  // behavior is continuous (Market's per-tick trade tick lives in a
  // separate per-tick handler; Workshop's tier-1 Trebuchet gate is
  // read by canTrain at train-time).
}

/**
 * Advance construction. Each peon in the BUILDING state adds
 * `harvestRate * delta` to its target building's progress. When progress
 * reaches 1.0 the building completes and the peon returns to IDLE.
 *
 * On completion, fires per-type side effects (M_V11.BUILDINGS-
 * EXPANSION #77e runtime wire-ups) via onBuildingComplete. The
 * legacy callers pass `game` so the side-effect helper can read +
 * mutate world state cleanly.
 */
export function buildSystem(
  world: World,
  sites: Map<string, Entity>,
  delta: number,
  game?: GameState,
): void {
  world.query(AssignedJob, Harvester).updateEach(([job, harvester]) => {
    if (job.state !== 'BUILDING') return;
    const site = sites.get(job.targetKey);
    const building = site?.get(Building);
    if (!site || !building || building.isComplete) {
      job.state = 'IDLE';
      job.targetKey = '';
      return;
    }
    const progress = Math.min(1, building.progress + harvester.harvestRate * delta);
    if (progress >= 1) {
      site.set(Building, { ...building, progress: 1, isComplete: true });
      if (game) {
        const faction = site.get(FactionTrait)?.faction;
        if (faction) {
          onBuildingComplete(game, building.buildingType, faction, job.targetKey, site);
        }
      }
      job.state = 'IDLE';
      job.targetKey = '';
    } else {
      site.set(Building, { ...building, progress });
    }
  });
}
