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
import { biomeRule } from '@/config/mapgen';
import { hexDistance } from '@/core/hex';

const FORTIFY_BUILDINGS = new Set(['Wall', 'Watchtower']);

/**
 * M_FUN.MAP.FORTIFY — true if a same-faction Wall or Watchtower
 * sits within radius 1 of (q, r). Used by pathFollowSystem to
 * suppress fatigue accrual on a garrisoned MOUNTAIN_PASS tile.
 */
function hasFortifyAdjacent(world: World, faction: string, q: number, r: number): boolean {
  for (const e of world.query(Building, HexPosition, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    const b = e.get(Building);
    if (!b?.isComplete || !FORTIFY_BUILDINGS.has(b.buildingType)) continue;
    const p = e.get(HexPosition);
    if (!p) continue;
    if (hexDistance(p.q, p.r, q, r) <= 1) return true;
  }
  return false;
}

export function pathFollowSystem(
  world: World,
  delta: number,
  speedMultiplier = 1,
  tiles?: BoardData['tiles'],
): void {
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
      movement.isMoving = true;
      const step = parseStep(next);
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
                  ? hasFortifyAdjacent(world, ownFaction, step.q, step.r)
                  : false;
                if (!protected_) {
                  entity.set(Combatant, {
                    ...c,
                    fatigue: Math.min(1, c.fatigue + rule.attributeStrength),
                    fatigueDecayTimer: 0,
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
