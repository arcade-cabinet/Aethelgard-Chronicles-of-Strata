/**
 * M_FUN.REFACTOR.RUN-ECONOMY-TICK — named phase functions for runEconomyTick.
 *
 * Each function receives `game` + `delta` (and `turnGateOpen` where needed)
 * so `runEconomyTick` in game-state.ts reads as a concise phase-list.
 * All side-effects are on `game` fields (mutation-in-place).
 *
 * Phase order matches docs/specs/50-ecs-model.md:
 *   clock → command → terrain → combat → deposit → scoring
 */

import { hexDistance, hexNeighbors, parseHexKey } from '@/core/hex';
import { buildNavGraph } from '@/core/pathfinding';
import { makeMoveCostFn } from '@/core/terrain-cost';
import {
  Building,
  type BuildingType,
  FACTIONS,
  type Faction,
  FactionBase,
  FactionTrait,
  Health,
  Unit,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { animationSystem } from '@/ecs/systems/animation';
import { buildSystem } from '@/ecs/systems/build';
import { buildingDeathSystem } from '@/ecs/systems/building-death';
import { combatSystem, type DamageEvent } from '@/ecs/systems/combat';
import { deathSystem } from '@/ecs/systems/death';
import { depositSystem, type ResourceDepositEvent } from '@/ecs/systems/deposit';
import { encroachmentSystem } from '@/ecs/systems/encroachment';
import { harvestSystem } from '@/ecs/systems/harvest';
import { hiddenBonusSystem } from '@/ecs/systems/hidden-bonus';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { offensiveBehaviorSystem } from '@/ecs/systems/offensive-behavior';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { scienceSystem } from '@/ecs/systems/science';
import { spawnSystem } from '@/ecs/systems/spawn';
import { stanceBehaviorSystem } from '@/ecs/systems/stance-behavior';
import { statusAttributesSystem } from '@/ecs/systems/status-attributes';
import { volcanoSystem } from '@/ecs/systems/volcano';
import { wildfireSystem } from '@/ecs/systems/wildfire';
import { evaluateWinLoss } from '@/ecs/systems/win-loss';
import { aiVisionRadiusFor } from '@/config/combat';
import { chokePointMultiplier } from '@/rules/choke-points';
import { presetFor, recomputeMaxSupply, SUPPLY_COST } from '@/rules';
import { advanceProjectiles } from './projectiles';
import { advanceClock, cyclePhase } from './clock';
import { advanceWeather, WEATHER_PROFILES, WEATHER_SPEED_MULTIPLIER } from './weather';
import { tickAutoSave } from './auto-save';
import { tickLongReignEscalation, tickRandomEvents } from './random-events';
import { BASE_UNIT_VISION_RADIUS, updateObserved } from './zone';
import type { GameState } from './game-state';
import { expireProposals } from './diplomacy-border';
import { tickTributeCession } from './diplomacy-tribute';
import { grantRandomDiscovery } from './research';
import { buildEntityTileIndex } from './tile-index';

// ---------------------------------------------------------------------------
// Phase 1 — Clock: advance time, weather, random events, autosave.
// Always ticks (not turn-gated). Wall-clock visuals must not freeze.
// ---------------------------------------------------------------------------
export function tickClockPhase(game: GameState, delta: number): void {
  advanceClock(game.clock, delta);
  advanceWeather(game.weather, game.eventRng, delta);
  tickRandomEvents(game, game.eventRng, delta);
  tickLongReignEscalation(game, game.eventRng, game.clock.elapsed);
  // M_V6.DIPLO.BORDER-ASK — sweep expired non-aggression-pact proposals.
  // Silent: a refused / ignored proposal just drops off the HUD; the
  // BORDER-ASK directive's "wave-of-attack penalty on refusal" is a
  // separate optional escalation that the HUD pill can wire on
  // explicit reject.
  expireProposals(game.diplomacyProposals, game.clock.elapsed);
  if (game.autoSave) tickAutoSave(game.autoSave, delta);
}

// ---------------------------------------------------------------------------
// Phase 2 — Command: AI decisions, spawning, stance + pathFollow.
// AI/spawn/stance are turn-gated; pathFollow always runs.
// ---------------------------------------------------------------------------
export function tickCommandPhase(game: GameState, delta: number, turnGateOpen: boolean): void {
  if (turnGateOpen) {
    for (const ai of Object.values(game.aiPlayers)) ai?.tick(game, delta);
    spawnSystem(game.world, game.board, delta, game.clock.elapsed, game.difficulty);
    aiSystem(game.world, game.board, game.navGraph);
    stanceBehaviorSystem(game.world, game.navGraph, makeMoveCostFn(game.board.tiles));
  }
  // M_TURNS.1 — pathFollow ALWAYS ticks so issued move commands resolve.
  pathFollowSystem(
    game.world,
    delta,
    WEATHER_SPEED_MULTIPLIER[game.weather.state],
    game.board.tiles,
    game.turn ? game.turn.turnsElapsed : undefined,
  );
}

// ---------------------------------------------------------------------------
// Phase 3 — Terrain: status attributes, volcano, wildfire, quake-decay,
// hidden-bonus discovery, encroachment, job-routing, harvest, build, science.
// Terrain + discovery always tick; economy/routing are turn-gated.
// ---------------------------------------------------------------------------
export function tickTerrainPhase(game: GameState, delta: number, turnGateOpen: boolean): void {
  // M_FUN.PERF.TILE-INDEX — build the shared tile→entity index ONCE before
  // all hazard systems run. wildfireSystem and volcanoSystem use it for O(1)
  // lookups instead of separate O(entities) scans per hazard tile.
  const entityTileIndex = buildEntityTileIndex(game.world);
  statusAttributesSystem(game.world, game.board.tiles, delta);
  volcanoSystem(game, delta, entityTileIndex);
  wildfireSystem(game, game.board.tiles, delta, entityTileIndex);
  if (game.quakeShakeRemaining > 0) {
    game.quakeShakeRemaining = Math.max(0, game.quakeShakeRemaining - delta);
  }
  hiddenBonusSystem(game.world, game.board, game.economy.player);
  if (turnGateOpen) {
    encroachmentSystem(game.world, game.zones, delta, game.difficulty);
    jobRoutingSystem({
      world: game.world,
      board: game.board,
      graph: game.navGraph,
      baseKeys: { player: game.townHallKey, enemy: game.enemyBaseKey },
      zones: game.zones,
    });
    harvestSystem(game.world, delta);
    buildSystem(game.world, game.buildSites, delta);
    // Credit first-House completion per faction (cheap O(buildings) sweep).
    if (
      game.economy.player.peonMetrics.firstHouseAt < 0 ||
      game.economy.enemy.peonMetrics.firstHouseAt < 0
    ) {
      for (const e of game.world.query(Building, FactionTrait)) {
        const b = e.get(Building);
        const f = e.get(FactionTrait);
        if (!b?.isComplete || b.buildingType !== 'House' || !f) continue;
        const eco = game.economy[f.faction];
        if (eco.peonMetrics.firstHouseAt < 0) {
          eco.peonMetrics.firstHouseAt = game.clock.elapsed;
        }
      }
    }
    scienceSystem(game.world, game.economy, delta);
  }
  // M_FUN.PERF.VOLCANO-LAZY-NAV — consolidated nav rebuild. volcanoSystem
  // sets navGraphDirty instead of calling buildNavGraph inline; we do a
  // single rebuild here after all terrain-phase topology mutations are done,
  // then clear the flag. Multiple eruptions in one tick now pay O(1) rebuild
  // cost instead of O(eruptions).
  if (game.navGraphDirty) {
    game.navGraph = buildNavGraph(game.board);
    game.navGraphDirty = false;
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — Combat: offensive behavior, combat system, projectile advance.
// Offensive behavior + combat are turn-gated; projectile advance always runs.
// `projectileIdRef` is passed in to avoid a circular import with game-state.ts.
// ---------------------------------------------------------------------------
export function tickCombatPhase(
  game: GameState,
  delta: number,
  turnGateOpen: boolean,
  projectileIdRef: { current: number },
): void {
  if (turnGateOpen) {
    const obDamage: DamageEvent[] = [];
    offensiveBehaviorSystem(
      game.world,
      delta,
      game.eventRng,
      game.projectiles,
      game.projectileCooldowns,
      projectileIdRef,
      obDamage,
    );
    if (obDamage.length > 0) {
      game.lastDamageEvents = [...game.lastDamageEvents, ...obDamage];
    }
    // Vision (placed here before combat resolution so vision is fresh
    // for this tick's combat target selection).
    const aiVision = aiVisionRadiusFor(game.difficulty);
    const phase = cyclePhase(game.clock);
    const isNight = phase >= 0.6 && phase < 0.9;
    const isDawn = phase >= 0.15 && phase < 0.3;
    const weatherVisionMul = WEATHER_PROFILES[game.weather.state].visionMultiplier;
    const playerVisionMul = (isDawn ? 0.5 : 1.0) * weatherVisionMul;
    const enemyVisionMul = (isNight ? 0.5 : 1.0) * weatherVisionMul;
    updateObserved(
      game.zones.player,
      game.world,
      'player',
      game.board.tiles.values(),
      BASE_UNIT_VISION_RADIUS * playerVisionMul,
    );
    updateObserved(
      game.zones.enemy,
      game.world,
      'enemy',
      game.board.tiles.values(),
      aiVision * enemyVisionMul,
    );
    // Supply recompute
    const completeByFaction: Record<Faction, Array<{ type: BuildingType; tier: number }>> = {
      player: [],
      enemy: [],
    };
    for (const e of game.world.query(Building, FactionTrait)) {
      const b = e.get(Building);
      const faction = e.get(FactionTrait)?.faction;
      if (b?.isComplete && faction) {
        completeByFaction[faction].push({ type: b.buildingType, tier: b.tier ?? 1 });
      }
    }
    recomputeMaxSupply(game.economy.player, completeByFaction.player);
    recomputeMaxSupply(game.economy.enemy, completeByFaction.enemy);
    const supplyByFaction: Record<Faction, number> = { player: 0, enemy: 0 };
    for (const e of game.world.query(Unit, FactionTrait)) {
      const u = e.get(Unit);
      const f = e.get(FactionTrait)?.faction;
      if (!u || !f) continue;
      supplyByFaction[f] += SUPPLY_COST[u.unitType] ?? 1;
    }
    game.economy.player.usedSupply = supplyByFaction.player;
    game.economy.enemy.usedSupply = supplyByFaction.enemy;
    if (game.economy.player.usedSupply > game.economy.player.peakSupply) {
      game.economy.player.peakSupply = game.economy.player.usedSupply;
    }
    if (game.economy.enemy.usedSupply > game.economy.enemy.peakSupply) {
      game.economy.enemy.peakSupply = game.economy.enemy.usedSupply;
    }
    // Combat resolution
    const rangedAccuracy = WEATHER_PROFILES[game.weather.state].rangedAccuracyMultiplier;
    const chokeFn = (q: number, r: number): number => {
      let passable = 0;
      for (const key of hexNeighbors(q, r)) {
        const t = game.board.tiles.get(key);
        if (t?.walkable) passable++;
      }
      return chokePointMultiplier(passable);
    };
    const combatEvents = combatSystem(
      game.world,
      game.eventRng,
      delta,
      rangedAccuracy,
      chokeFn,
      game.board.tiles,
    );
    game.lastDamageEvents = [...game.lastDamageEvents, ...combatEvents];
    // Invulnerable bases (long-reign / coexistence modes).
    if (presetFor(game.mode).invulnerableBases) {
      for (const e of game.world.query(FactionBase, Health)) {
        const h = e.get(Health);
        if (h && h.current < h.max) e.set(Health, { ...h, current: h.max });
      }
    }
  }
  advanceProjectiles(game.projectiles, delta);
}

// ---------------------------------------------------------------------------
// Phase 5 — Deposit: resource deposit events, peon metrics.
// ---------------------------------------------------------------------------
export function tickDepositPhase(game: GameState): void {
  const resourceEvents: ResourceDepositEvent[] = [];
  for (const f of FACTIONS) {
    // Inline baseKeyFor(game, f) to avoid circular import with game-state.ts.
    const baseKey = f === 'player' ? game.townHallKey : game.enemyBaseKey;
    depositSystem(game.world, game.economy[f], baseKey, f, resourceEvents);
  }
  game.lastResourceEvents = resourceEvents;
  for (const ev of resourceEvents) {
    const eco = game.economy[ev.faction];
    eco.peonMetrics.depositCount += 1;
    if (ev.type === 'wood' && eco.peonMetrics.firstWoodAt < 0) {
      eco.peonMetrics.firstWoodAt = game.clock.elapsed;
    }
  }
  // M_V6.DIPLO.TRIBUTE — apply per-tick cession after deposits land so
  // the tributary's pile reflects the harvest first, THEN cedes 10% of
  // it. Pair-iteration is O(N^2) over factionIds; N is small (≤6 player
  // factions for 4X) so this stays cheap. delta is the tick seconds.
  tickTributeCession(game.diplomacy, FACTIONS, (f) => game.economy[f as Faction], 1);
}

// ---------------------------------------------------------------------------
// Phase 6 — Scoring: death, building-death, animation, wonder-timers,
//            win-loss evaluation, score integral.
// ---------------------------------------------------------------------------
export function tickScoringPhase(game: GameState, delta: number): void {
  const deathResult = deathSystem(game.world, delta);
  game.economy.player.kills += deathResult.enemyKills;
  if (deathResult.enemyDeathKeys.length > 0) {
    const enemyBaseKey = game.enemyBaseKey;
    const { q: ebq, r: ebr } = parseHexKey(enemyBaseKey);
    for (const key of deathResult.enemyDeathKeys) {
      const { q, r } = parseHexKey(key);
      const inEnemyZone = game.zones.enemy.controlled.has(key);
      const inPlayerZone = game.zones.player.controlled.has(key);
      const distToEnemyBase = hexDistance(q, r, ebq, ebr);
      if (distToEnemyBase <= 3) {
        game.economy.player.killsByZone.assault += 1;
      } else if (inEnemyZone && !inPlayerZone) {
        game.economy.player.killsByZone.encroachment += 1;
      } else {
        game.economy.player.killsByZone.skirmish += 1;
      }
    }
  }
  if (deathResult.playerHeroDied && game.outcome === 'playing') {
    game.outcome = 'loss';
  }
  // M_PIVOT.BARBARIAN-CAMPS + M_V6.CARRY.CAMP-DISCOVERY — credit each
  // cleared camp's reward to the clearing faction: +50 wood + +50 stone
  // + 1 random Discovery from the camp-reward pool. Mark navGraph dirty
  // so the camp tile re-pathing reflects the destroyed entity.
  for (const cleared of deathResult.barbarianCampsCleared) {
    // Only the two legacy slots have GameEconomy entries today; N-player
    // economy registry comes with M_PIVOT.N-PLAYER.FACTIONS substrate
    // when GameEconomy migrates from Record<Faction, …> to a Map<FactionId>.
    // Until then, route the reward to the 'player' or 'enemy' slot
    // when the clearedBy id matches; otherwise log and skip (the camp
    // is still destroyed — the gameplay effect lands).
    if (cleared.clearedBy === 'player' || cleared.clearedBy === 'enemy') {
      const eco = game.economy[cleared.clearedBy];
      eco.wood += 50;
      eco.stone += 50;
    }
    // Grant one Discovery from the pool (free — bypass cost + prereq).
    // The grant is GLOBAL (single research state per game today); when
    // research becomes per-faction in v0.7, scope this to clearedBy.
    const granted = grantRandomDiscovery(game.world, game.research, game.eventRng);
    if (granted && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aethelgard:camp-discovery-granted', {
          detail: { discoveryId: granted, clearedBy: cleared.clearedBy },
        }),
      );
    }
    // M_V6.CARRY.RUINS-BIOME — flip the camp tile to RUINS so the
    // renderer paints "old camp remains" decoration. Walkable +
    // buildable (faction can recover the territory). NavGraph dirty
    // bit is set below regardless.
    const campKey = `${cleared.q},${cleared.r}`;
    const tile = game.board.tiles.get(campKey);
    if (tile) tile.type = 'RUINS';
    game.navGraphDirty = true;
  }
  const newNavGraph = buildingDeathSystem(game.world, game.buildSites, game.board);
  if (newNavGraph) {
    game.navGraph = newNavGraph;
    game.buildSitesGeneration += 1;
  }
  animationSystem(game.world);
  // Wonder countdown
  const WONDER_COUNTDOWN_SECONDS = 300;
  for (const faction of FACTIONS) {
    let hasCompleteWonder = false;
    for (const e of game.world.query(Building, FactionTrait)) {
      const b = e.get(Building);
      const f = e.get(FactionTrait)?.faction;
      if (f !== faction || !b || b.buildingType !== 'Wonder' || !b.isComplete) continue;
      hasCompleteWonder = true;
      break;
    }
    if (!hasCompleteWonder) {
      game.wonderTimers[faction] = Infinity;
      continue;
    }
    if (game.wonderTimers[faction] === Infinity) {
      game.wonderTimers[faction] = WONDER_COUNTDOWN_SECONDS;
    }
    game.wonderTimers[faction] = Math.max(0, game.wonderTimers[faction] - delta);
  }
  if (game.outcome === 'playing') {
    if (game.wonderTimers.player === 0) game.outcome = 'win';
    else if (game.wonderTimers.enemy === 0) game.outcome = 'loss';
  }
  // Age-of-strata Renaissance+Wonder instant win
  if (game.mode === 'age-of-strata' && game.outcome === 'playing') {
    const science = game.economy.player.science;
    if (science >= 500) {
      let hasCompleteWonder = false;
      for (const e of game.world.query(Building, FactionTrait)) {
        const b = e.get(Building);
        const f = e.get(FactionTrait);
        if (f?.faction === 'player' && b?.buildingType === 'Wonder' && b.isComplete) {
          hasCompleteWonder = true;
          break;
        }
      }
      if (hasCompleteWonder) game.outcome = 'win';
    }
  }
  // Strata-wars 80%-zone-control-for-30s win
  if (game.mode === 'strata-wars' && game.outcome === 'playing') {
    const player = game.zones.player.controlled.size;
    const enemy = game.zones.enemy.controlled.size;
    const total = player + enemy;
    const playerPct = total > 0 ? player / total : 0;
    if (playerPct >= 0.8) {
      game.strataWarsControlTimer = Math.min(30, game.strataWarsControlTimer + delta);
      if (game.strataWarsControlTimer >= 30) game.outcome = 'win';
    } else {
      game.strataWarsControlTimer = 0;
    }
  }
  game.outcome = evaluateWinLoss(game.world, game.outcome);
  game.score.player += game.zones.player.controlled.size * delta;
  game.score.enemy += game.zones.enemy.controlled.size * delta;
}
