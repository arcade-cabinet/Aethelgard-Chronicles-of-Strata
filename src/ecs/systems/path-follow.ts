import type { World } from 'koota';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexLevelKey } from '@/core/hex';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';

/**
 * Parse a `"q,r,level"` path step. Falls back to level 0 for legacy `"q,r"`.
 * NaN-hardens each component (CodeRabbit: `?? 0` only catches `undefined`,
 * not the `NaN` that `Number('foo')` produces from malformed input).
 */
// M_MICRO.2.2 — local parseStep replaced by shared parseHexLevelKey.
const parseStep = parseHexLevelKey;

import { biomeRule } from '@/config/mapgen';
/**
 * Advance every entity with a PathQueue toward its next tile. When an entity
 * reaches the next step it snaps to that tile, updates HexPosition (including
 * the elevation level carried in the step, so ramp traversal sets the correct
 * Y height), and pops the step. With no steps remaining it stops.
 *
 * @param speedMultiplier — optional multiplier applied to step distance (e.g.
 *   0.8 for rain penalty). Defaults to 1 (no change).
 * @param tiles — optional board tiles map. When provided, M_FUN.MAP.ELEV
 *   applies the biome.appliesAttribute on tile arrival (fatigue from
 *   MOUNTAIN_PASS today; disease from SWAMP / dehydration from DESERT
 *   when those generators land). Without it (legacy tests), no
 *   attribute is applied.
 */
import type { BoardData } from '@/core/board';
import { Building, Combatant, FactionTrait, Health } from '@/ecs/components';

const FORTIFY_BUILDINGS = new Set(['Wall', 'Watchtower']);

/**
 * M_FUN.MAP.FORTIFY — per-faction set of tile keys covered by a
 * same-faction Wall or Watchtower's radius-1 fortification zone.
 * Built ONCE per pathFollowSystem tick instead of per arrival
 * (coderabbit MAJOR PR #10 — was a full world.query() per moving
 * unit; now it's one O(buildings + 7) sweep per tick consumed by
 * `fortifiedTilesByFaction.has(stepKey)` look-ups).
 */
type FortifiedTilesByFaction = Map<string, Set<string>>;
function buildFortifiedTileIndex(world: World): FortifiedTilesByFaction {
  const out: FortifiedTilesByFaction = new Map();
  for (const e of world.query(Building, HexPosition, FactionTrait)) {
    const b = e.get(Building);
    if (!b?.isComplete || !FORTIFY_BUILDINGS.has(b.buildingType)) continue;
    const p = e.get(HexPosition);
    const faction = e.get(FactionTrait)?.faction;
    if (!p || !faction) continue;
    let set = out.get(faction);
    if (!set) {
      set = new Set();
      out.set(faction, set);
    }
    // Building's own tile + 6 axial neighbours = 7 keys per building.
    set.add(`${p.q},${p.r}`);
    set.add(`${p.q + 1},${p.r}`);
    set.add(`${p.q - 1},${p.r}`);
    set.add(`${p.q},${p.r + 1}`);
    set.add(`${p.q},${p.r - 1}`);
    set.add(`${p.q + 1},${p.r - 1}`);
    set.add(`${p.q - 1},${p.r + 1}`);
  }
  return out;
}

export function pathFollowSystem(
  world: World,
  delta: number,
  speedMultiplier = 1,
  tiles?: BoardData['tiles'],
  /**
   * M_FUN.MECH.FATIGUE.TURN-MODE — current turn number for
   * turn-based modes. When provided, units with
   * `Combatant.restUntilTurn > currentTurn` are gated out of
   * movement (they SKIP the turn to recover from fatigue).
   * Omit (or pass undefined) in RTS mode — the existing
   * continuous-decay path applies.
   */
  _currentTurn?: number,
  /**
   * M_V8.PORTAL-STONE.COOLDOWN-HOOK — called when a unit teleports
   * through a PORTAL_STONE tile. Caller (economy-tick-phases) wires
   * this to refreshPortalStoneCooldown so the 60s per-faction gate
   * updates. The caller captures clock.elapsed in the closure.
   * Kept as a callback to avoid circular imports between
   * ecs/systems/ and game-state.
   */
  onPortalStoneArrival?: (factionId: string) => void,
): void {
  const currentTurn = _currentTurn;
  // M_FUN.MAP.FORTIFY — build the per-faction fortified-tile index
  // ONCE per tick. Read by the per-arrival fatigue branch via
  // O(1) Set.has() instead of the prior per-arrival world.query.
  const fortifiedTilesByFaction = buildFortifiedTileIndex(world);
  // M_FUN.MAP.ELEV — fatigue decay. Combatant.fatigue → 0 after
  // FATIGUE_DECAY seconds out of combat (combat.ts resets the
  // fatigueDecayTimer on every dealt hit). Decay runs even without
  // a tiles map so the test surface doesn't need a board mock.
  const FATIGUE_DECAY = 5;
  world.query(Combatant).updateEach((traits) => {
    const c = traits[0];
    if (c.fatigue <= 0) return;
    c.fatigueDecayTimer += delta;
    if (c.fatigueDecayTimer >= FATIGUE_DECAY) {
      c.fatigue = Math.max(0, c.fatigue - delta / FATIGUE_DECAY);
    }
  });
  world
    .query(HexPosition, Transform, Movement, PathQueue)
    .updateEach(([hex, transform, movement, path], entity) => {
      const next = path.steps[0];
      if (!next) {
        movement.isMoving = false;
        return;
      }
      // M_FUN.MECH.FATIGUE.TURN-MODE — turn-based fatigue gating.
      // If we're in turn-based mode AND this combatant's
      // restUntilTurn hasn't elapsed yet, skip the move step.
      // (In RTS, currentTurn is undefined and this branch never
      // fires — the continuous-decay path runs unchanged.)
      if (currentTurn !== undefined) {
        const c = entity.get(Combatant);
        if (c && c.restUntilTurn > currentTurn) {
          movement.isMoving = false;
          return;
        }
      }
      movement.isMoving = true;
      const step = parseStep(next);
      // M_GAME.BUG.2 — defensive walkable check. If the next step's
      // tile is non-walkable (mountain, ocean, etc.), drop the step
      // and clear the rest of the path so the unit re-plans on the
      // next tick. A* should never produce a non-walkable step, but
      // hydrology-driven tile-type changes (volcano eruption flips
      // a GRASS tile to LAVA, navGraph dirty bit gets set NEXT tick)
      // can leave an already-queued path with a now-invalid step.
      // Without this, the unit moves onto the bad tile + render
      // shoots its transform.y high and the unit appears to vanish.
      // M_GAME.BUG.2 — defensive walkable check on INTERMEDIATE
      // path steps only. Building tiles are intentionally marked
      // !walkable (the building occupies them) but units path TO
      // them as final-destination targets (build, deposit, attack).
      // So only reject when there's a subsequent step queued AND
      // the current step is non-walkable — that combination indicates
      // a stale path crossing newly-impassable terrain (volcano flip,
      // gate close, etc.). Without this, units could walk onto
      // mountain tiles whose walkable flag changed mid-path.
      if (tiles && path.steps.length > 1) {
        const stepTile = tiles.get(`${step.q},${step.r}`);
        if (stepTile && !stepTile.walkable) {
          path.steps = [];
          movement.isMoving = false;
          return;
        }
      }
      const goal = axialToWorld(step.q, step.r);
      const dx = goal.x - transform.x;
      const dz = goal.z - transform.z;
      const dist = Math.hypot(dx, dz);
      const stepDist = movement.speed * delta * speedMultiplier;

      if (dist <= stepDist || dist === 0) {
        // arrive: snap to tile, update logical position + elevation, pop the step
        transform.x = goal.x;
        transform.z = goal.z;
        hex.q = step.q;
        hex.r = step.r;
        hex.level = step.level;
        transform.y = step.level * TILE_HEIGHT;
        path.steps.shift();
        if (path.steps.length === 0) movement.isMoving = false;
        // M_FUN.MAP.PORTAL — if the arrival tile is a portal endpoint,
        // teleport the unit to portalTo. Drop the rest of the path so
        // the unit re-paths from the new location next tick (the
        // queued steps are no longer reachable from this destination).
        // Disabled by default in v0.4 — generators leave portalTo
        // undefined; only seeded via a v0.5 hydrology/topology pass.
        if (tiles) {
          const arriveTile = tiles.get(`${step.q},${step.r}`);
          if (arriveTile?.portalTo) {
            const dest = parseStep(`${arriveTile.portalTo},0`);
            const destWorld = axialToWorld(dest.q, dest.r);
            const destTile = tiles.get(arriveTile.portalTo);
            const destLevel = destTile?.level ?? 0;
            hex.q = dest.q;
            hex.r = dest.r;
            hex.level = destLevel;
            transform.x = destWorld.x;
            transform.z = destWorld.z;
            transform.y = destLevel * TILE_HEIGHT;
            path.steps = [];
            movement.isMoving = false;
            // M_V8.PORTAL-STONE.COOLDOWN-HOOK — update the 60s per-faction
            // cooldown when the portal tile is a PORTAL_STONE biome.
            // Other portal types (quicksand-pair, mountain-cave-network) use
            // no cooldown — only PORTAL_STONE gates by faction.
            if (onPortalStoneArrival && arriveTile.type === 'PORTAL_STONE') {
              const factionId = entity.get(FactionTrait)?.faction;
              if (factionId) onPortalStoneArrival(factionId);
            }
            return;
          }
        }
        // M_FUN.MAP.ELEV — apply biome-rule attribute on arrival.
        if (tiles) {
          const tile = tiles.get(`${step.q},${step.r}`);
          if (tile) {
            const rule = biomeRule(tile.type);
            if (rule.appliesAttribute === 'fatigue') {
              const c = entity.get(Combatant);
              if (c) {
                // M_FUN.MAP.FORTIFY — Wall or Watchtower of the
                // unit's own faction within radius 1 of the tile
                // suppresses fatigue accrual. Realises the
                // "fortifiable choke" contract: a faction that
                // garrisons a MOUNTAIN_PASS gets to cross it
                // without the -50% damage debuff.
                const ownFaction = entity.get(FactionTrait)?.faction;
                const protected_ = ownFaction
                  ? (fortifiedTilesByFaction.get(ownFaction)?.has(`${step.q},${step.r}`) ?? false)
                  : false;
                if (!protected_) {
                  // M_FUN.MECH.FATIGUE.TURN-MODE — in turn-based
                  // mode, set restUntilTurn so the next 1-2 turns
                  // skip this unit's movement (proportional to the
                  // biome's attributeStrength). RTS mode leaves
                  // restUntilTurn at 0 and the continuous fatigue
                  // multiplier on damage carries the cost instead.
                  const restTurns =
                    currentTurn !== undefined
                      ? Math.max(1, Math.round(rule.attributeStrength * 2))
                      : 0;
                  entity.set(Combatant, {
                    ...c,
                    fatigue: Math.min(1, c.fatigue + rule.attributeStrength),
                    fatigueDecayTimer: 0,
                    restUntilTurn: currentTurn !== undefined ? currentTurn + restTurns : 0,
                  });
                }
              }
            } else if (
              rule.appliesAttribute === 'disease' ||
              rule.appliesAttribute === 'dehydration'
            ) {
              const h = entity.get(Health);
              if (h) {
                // attributeStrength = duration in seconds the attribute
                // sets (refreshes on every arrival; cleared by recovery
                // tick in statusAttributesSystem).
                const dur = 5 * rule.attributeStrength;
                if (rule.appliesAttribute === 'disease') {
                  entity.set(Health, {
                    ...h,
                    disease: Math.max(h.disease, dur),
                    diseaseRecoveryTimer: 0,
                  });
                } else {
                  entity.set(Health, {
                    ...h,
                    dehydration: Math.max(h.dehydration, dur),
                    dehydrationRecoveryTimer: 0,
                  });
                }
              }
            }
          }
        }
      } else {
        // advance toward the tile
        transform.x += (dx / dist) * stepDist;
        transform.z += (dz / dist) * stepDist;
        transform.rotationY = Math.atan2(dx, dz);
        // interpolate Y across the step so a unit climbing a ramp rises
        // smoothly instead of teleporting vertically on arrival
        const fromY = hex.level * TILE_HEIGHT;
        const toY = step.level * TILE_HEIGHT;
        if (fromY !== toY) {
          const tileSpacing = Math.hypot(
            goal.x - axialToWorld(hex.q, hex.r).x,
            goal.z - axialToWorld(hex.q, hex.r).z,
          );
          const progress = tileSpacing > 0 ? 1 - dist / tileSpacing : 1;
          transform.y = fromY + (toY - fromY) * Math.max(0, Math.min(1, progress));
        }
      }
    });
}
