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

import { aiVisionRadiusFor } from '@/config/combat';
import { factionIds } from '@/config/factions';
import { hexDistance, hexNeighbors, parseHexKey } from '@/core/hex';
import { buildNavGraph } from '@/core/pathfinding';
import { makeMoveCostFn } from '@/core/terrain-cost';
import {
  Building,
  type BuildingType,
  FACTIONS,
  type Faction,
  AssignedJob,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  StackMember,
  Unit,
} from '@/ecs/components';
import type { Entity } from 'koota';
import { createStack } from './stacking';
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
import { mobTargetingSystem } from '@/ecs/systems/mob-targeting';
import { stanceBehaviorSystem } from '@/ecs/systems/stance-behavior';
import { wanderSystem } from '@/ecs/systems/wander';
import { statusAttributesSystem } from '@/ecs/systems/status-attributes';
import { volcanoSystem } from '@/ecs/systems/volcano';
import { wildfireSystem } from '@/ecs/systems/wildfire';
import { evaluateWinLoss } from '@/ecs/systems/win-loss';
import { presetFor, recomputeMaxSupply, SUPPLY_COST } from '@/rules';
import { chokePointMultiplier } from '@/rules/choke-points';
import { refreshPortalStoneCooldown, tickPortalStonesTrigger } from '@/world/portal-stones';
import { tickAutoSave } from './auto-save';
import { advanceClock, cyclePhase } from './clock';
import { expireProposals } from './diplomacy-border';
import { tickTributeCession } from './diplomacy-tribute';
import { economyFor } from './economy-for';
import type { GameState } from './game-state';
import { advanceProjectiles } from './projectiles';
import { tickLongReignEscalation, tickRandomEvents } from './random-events';
import { grantRandomDiscovery } from './research';
import { buildEntityTileIndex } from './tile-index';
import { advanceWeather, WEATHER_PROFILES, WEATHER_SPEED_MULTIPLIER } from './weather';
import { BASE_UNIT_VISION_RADIUS, updateObserved } from './zone';

// ---------------------------------------------------------------------------
// Phase 1 — Clock: advance time, weather, random events, autosave.
// Always ticks (not turn-gated). Wall-clock visuals must not freeze.
// ---------------------------------------------------------------------------
export function tickClockPhase(game: GameState, delta: number): void {
  advanceClock(game.clock, delta);
  advanceWeather(game.weather, game.eventRng, delta);
  tickRandomEvents(game, game.eventRng, delta);
  tickLongReignEscalation(game, game.eventRng, game.clock.elapsed);
  tickInactivityBeats(game);
  tickEnemyAtTownHallToast(game);
  // M_V6.DIPLO.BORDER-ASK — sweep expired non-aggression-pact proposals.
  // Silent: a refused / ignored proposal just drops off the HUD; the
  // BORDER-ASK directive's "wave-of-attack penalty on refusal" is a
  // separate optional escalation that the HUD pill can wire on
  // explicit reject.
  expireProposals(game.diplomacyProposals, game.clock.elapsed);
  // M_V7.PORTAL-STONES.TRIGGER — random-event roll for the rare
  // portal-stones placement (1-in-200 once map clock > 5min,
  // at-most-once-per-match). Mutates board.tiles on a successful
  // roll. Idempotent: if any PORTAL_STONE already exists, the
  // trigger skips.
  const portalPair = tickPortalStonesTrigger(game.board, game.eventRng, game.clock.elapsed);
  if (portalPair && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('aethelgard:portal-stones-placed', {
        detail: { keyA: portalPair.keyA, keyB: portalPair.keyB },
      }),
    );
  }
  if (game.autoSave) tickAutoSave(game.autoSave, delta);
}

/**
 * M_V11.OPEN.INACTIVITY — narrator beats fired when the player has
 * not queued a peon yet. The clock ticks even before the player
 * acts; without these beats the empty Town Hall could sit silently
 * for minutes and the player wouldn't know what's expected of
 * them. Each beat fires once per match (tracked via the
 * `inactivityBeatsFired` bitfield on GameState).
 *
 *   30s — info-tone: "Aethelgard awaits your first decree."
 *   90s — warning-tone: "Your realm cannot grow without peons."
 *
 * Reset condition: any peon entity exists for the player faction.
 * Skipping subsequent beats when the player has queued at least
 * one peon prevents the toast from harassing a player who simply
 * paused to think.
 */
function tickInactivityBeats(game: GameState): void {
  if (typeof window === 'undefined') return;
  const elapsed = game.clock.elapsed;
  const fired = game.inactivityBeatsFired ?? 0;
  // No further work if both beats already fired.
  if ((fired & 0b11) === 0b11) return;
  // Has the player queued any peon? If so, no beat ever fires.
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    // Lock in the 'both beats handled' state so we skip the
    // query on every tick going forward.
    game.inactivityBeatsFired = 0b11;
    return;
  }
  // Beat 1 — 30s.
  if (elapsed >= 30 && (fired & 0b01) === 0) {
    game.inactivityBeatsFired = fired | 0b01;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'inactivity-beat-30s',
          tone: 'info',
          title: 'Aethelgard awaits your first decree',
          description: 'Tap your Town Hall and queue a Peon to begin.',
        },
      }),
    );
  }
  // Beat 2 — 90s.
  if (elapsed >= 90 && ((game.inactivityBeatsFired ?? 0) & 0b10) === 0) {
    game.inactivityBeatsFired = (game.inactivityBeatsFired ?? 0) | 0b10;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'inactivity-beat-90s',
          tone: 'warning',
          title: 'Your realm cannot grow without peons',
          description: 'A Peon costs 30 wood. Queue one from the Town Hall.',
        },
      }),
    );
  }
}

/**
 * M_V11.NOTIF.ENEMY-AT-TH — fire a critical toast when an enemy
 * unit comes within 2 hex of the player's Town Hall. Tap-to-focus
 * goes to the Town Hall tile so the player can re-orient.
 *
 * Dedup: `inactivityBeatsFired` is reused with a higher bit
 * (0b100) to record "ENEMY-AT-TH already toasted this match." A
 * single toast per match keeps the warning meaningful — a player
 * who's been hearing the enemy approach for the past 60s doesn't
 * want a re-fire on every tick of new proximity.
 *
 * Tightened: only fires after the player has had at least 30s of
 * grace (the enemy can't be at the keep on tick 0 in the
 * classic-RTS opening anyway, but defensive).
 */
function tickEnemyAtTownHallToast(game: GameState): void {
  if (typeof window === 'undefined') return;
  if (game.clock.elapsed < 30) return;
  const fired = game.inactivityBeatsFired ?? 0;
  if ((fired & 0b100) !== 0) return;
  const [tq, tr] = game.townHallKey.split(',').map(Number) as [number, number];
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const faction = e.get(FactionTrait)?.faction;
    if (faction !== 'enemy') continue;
    const pos = e.get(HexPosition);
    if (!pos) continue;
    if (hexDistance(tq, tr, pos.q, pos.r) > 2) continue;
    game.inactivityBeatsFired = fired | 0b100;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'enemy-at-th',
          tone: 'critical',
          title: 'Enemy at the gates',
          description: 'An enemy unit is closing on your Town Hall. Defend it now.',
          focus: { q: tq, r: tr },
        },
      }),
    );
    return;
  }
}

/**
 * M_V11.STACK.WORK-CREW — auto-form Work Crew stacks for player
 * peons that converged on the same harvest tile. Per
 * docs/specs/201-stacking-and-formations.md: "auto-formed when
 * 2+ same-faction peons end a tick on the same harvest tile."
 *
 * Sweep:
 *   1. Bucket player peons that are NOT already in a stack by
 *      hex tile + HARVESTING state (the auto-form trigger).
 *   2. Any bucket with >=2 peons → createStack. The stack's
 *      defaultFormationFor selects 'work-crew' for peon-only
 *      compositions; the harvest-rate buff is applied
 *      separately (M_V11.STACK.WORK-CREW.BUFF, deferred — the
 *      Stack's existence is the substrate the buff hooks onto).
 *
 * Cheap: O(peons + tiles_with_peons). Runs once per tick in the
 * turn-gated portion of tickTerrainPhase.
 */
function autoFormWorkCrews(game: GameState): void {
  const buckets = new Map<string, Entity[]>();
  for (const e of game.world.query(Unit, FactionTrait, HexPosition, AssignedJob)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    if (e.has(StackMember)) continue;
    if (e.get(AssignedJob)?.state !== 'HARVESTING') continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const key = `${hex.q},${hex.r}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(e);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    // Cap to MAX_STACK_SIZE (8) handled by createStack itself.
    createStack(game, bucket.slice(0, 8));
  }
}

/** Set membership check for barbarian unit roles (vs player roles). */
const BARBARIAN_ROLES = new Set<string>([
  'Goblin',
  'Orc',
  'Vampire',
  'BlackKnight',
  'Witch',
]);

/**
 * M_V11.STACK.MOB-RABBLE — auto-form Rabble stacks for barbarian-
 * faction mobs that converged on a tile. Per spec: "Mob auto-stack
 * into Rabble on tile convergence (max 6 mobs per stack)".
 *
 * Sweep:
 *   1. Bucket non-stacked mobs from barbarian factions by tile.
 *      Discriminator: FactionTrait.faction begins with
 *      'barbarian-camp-' (the v0.5 N-player convention).
 *   2. Any bucket with >=2 mobs → createStack(slice(0, 6)). The
 *      stack's defaultFormationFor picks 'rabble' for mixed-mob
 *      compositions; barbarian Rabble is the default formation.
 *
 * Cheap: O(mobs + tiles_with_mobs). Runs alongside autoFormWorkCrews
 * inside tickTerrainPhase.
 */
export function autoFormMobRabble(game: GameState): void {
  const buckets = new Map<string, Entity[]>();
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const fac = e.get(FactionTrait)?.faction;
    // Barbarian camps use the 'barbarian-camp-N' faction-id pattern
    // (see barbarian-camps.ts:142). The Unit type may be any of the
    // BARBARIAN pool, but tile-based clustering treats them uniformly.
    if (!fac || !fac.startsWith('barbarian-camp-')) continue;
    const role = e.get(Unit)?.unitType;
    if (!role || !BARBARIAN_ROLES.has(role)) continue;
    if (e.has(StackMember)) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    // Bucket by tile AND faction-id — two camps' mobs on the same
    // tile shouldn't merge (different factions can't share a stack).
    const key = `${fac}|${hex.q},${hex.r}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(e);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    // Spec caps mob stacks at 6 (vs 8 for work crews).
    createStack(game, bucket.slice(0, 6));
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — Command: AI decisions, spawning, stance + pathFollow.
// AI/spawn/stance are turn-gated; pathFollow always runs.
// ---------------------------------------------------------------------------
export function tickCommandPhase(game: GameState, delta: number, turnGateOpen: boolean): void {
  if (turnGateOpen) {
    for (const ai of Object.values(game.aiPlayers)) ai?.tick(game, delta);
    spawnSystem(game.world, game.board, delta, game.clock.elapsed, game.difficulty, game.eventRng);
    aiSystem(game.world, game.board, game.navGraph);
    stanceBehaviorSystem(game.world, game.navGraph, makeMoveCostFn(game.board.tiles));
    // M_V11.CAMPS.HOSTILE-ALL — barbarian-camp mobs pick targets
    // independently of stance / aiSystem (which are player- or
    // enemy-faction scoped). Runs BEFORE wander so a mob with a
    // valid target falls through to stance-set pathing instead of
    // taking a wander step.
    mobTargetingSystem(game.world);
    // M_V11.CAMPS.WANDER — barbarian-camp mobs roam within their
    // anchor's radius. Runs AFTER stance + mob targeting so a mob
    // with a combat target keeps its set PathQueue (wanderSystem
    // skips anything with steps already queued).
    wanderSystem(game.world, game.board, game.eventRng);
  }
  // M_TURNS.1 — pathFollow ALWAYS ticks so issued move commands resolve.
  // M_V8.PORTAL-STONE.COOLDOWN-HOOK — closure captures game.portalStoneCooldowns
  // + game.clock.elapsed so the callback can update the per-faction expiry.
  // M_V11.PURGE — currentTurn param removed (RTS only).
  pathFollowSystem(
    game.world,
    delta,
    WEATHER_SPEED_MULTIPLIER[game.weather.state],
    game.board.tiles,
    (factionId: string) => {
      refreshPortalStoneCooldown(game.portalStoneCooldowns, factionId, game.clock.elapsed);
    },
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
      // M_GAME.BUG.10 — phase-1 distance gate: auto-mode peons can
      // roam at most this far from base. Starts at 14 hex (enough
      // to reach resources on small + medium maps without sending
      // peons across the realm) and grows ~+1 hex per 20s, soft-
      // capping at 60 hex (whole-map coverage by ~15 minutes).
      // The minimum value 14 was chosen so the AIVAI economy test
      // (which expects the enemy faction to harvest within a 60s
      // sim window on a 24-hex board) still passes — drops the
      // "peons cross map immediately" failure mode while keeping
      // the autonomous behavior viable.
      maxRoamRadius: Math.min(60, 14 + Math.floor(game.clock.elapsed / 20)),
    });
    harvestSystem(game.world, delta);
    autoFormWorkCrews(game);
    // M_V11.STACK.MOB-RABBLE — barbarian mobs auto-stack into Rabble
    // on tile convergence (cap 6 per stack). Cheap parallel sweep
    // mirroring the work-crew form pass.
    autoFormMobRabble(game);
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
      // faction-narrow: completeByFaction is Record<Faction,X>; skip N-player factions.
      if (b?.isComplete && faction && faction in completeByFaction) {
        const bucket = completeByFaction[faction as Faction];
        bucket.push({ type: b.buildingType, tier: b.tier ?? 1 });
      }
    }
    recomputeMaxSupply(game.economy.player, completeByFaction.player);
    recomputeMaxSupply(game.economy.enemy, completeByFaction.enemy);
    const supplyByFaction: Record<Faction, number> = { player: 0, enemy: 0 };
    for (const e of game.world.query(Unit, FactionTrait)) {
      const u = e.get(Unit);
      const f = e.get(FactionTrait)?.faction;
      // faction-narrow: supplyByFaction is Record<Faction,number>; skip N-player factions.
      if (!u || !f || !(f in supplyByFaction)) continue;
      supplyByFaction[f as Faction] += SUPPLY_COST[u.unitType] ?? 1;
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
    // M_HUD.NOTIF.PEON.1 — first deposit per resource type per
    // session for the PLAYER faction fires a Chronicler-voice
    // toast. After the first, every subsequent deposit is silent
    // (the floating "+N" text already exists for the per-deposit
    // beat). Dedup id keyed by resource so it never re-fires.
    if (typeof window !== 'undefined' && ev.faction === 'player') {
      const firstForType =
        (ev.type === 'wood' && eco.peonMetrics.firstWoodAt === game.clock.elapsed) ||
        (ev.type !== 'wood' && !game.peonFirstHarvestToastedTypes?.has(ev.type));
      if (firstForType) {
        if (!game.peonFirstHarvestToastedTypes) game.peonFirstHarvestToastedTypes = new Set();
        game.peonFirstHarvestToastedTypes.add(ev.type);
        window.dispatchEvent(
          new CustomEvent('aethelgard:toast', {
            detail: {
              id: `first-harvest-${ev.type}`,
              tone: 'info',
              title: `Your peons have begun harvesting ${ev.type}`,
              description: `The realm's ${ev.type} reserves are now growing.`,
              // No focus — the deposit is at the Town Hall (already
              // on screen) and the player's attention should stay
              // wherever they are, not jolt back to the keep.
            },
          }),
        );
      }
    }
  }
  // M_V6.DIPLO.TRIBUTE — apply per-tick cession after deposits land so
  // the tributary's pile reflects the harvest first, THEN cedes 10% of
  // it. Pair-iteration is O(N^2) over factionIds; N is small (≤6 player
  // factions for 4X) so this stays cheap. delta is the tick seconds.
  // M_V7.ECONOMY.REGISTRY — iterate ALL non-barbarian factions (legacy
  // player/enemy + N-player slots) via the registry instead of the
  // hardcoded 2-faction FACTIONS const. Resolves HIGH-1 from the v0.7
  // opening review (N-player tribute end-to-end broken before this fix).
  const playerFactionIds = game.factions.filter((f) => f.kind !== 'barbarian').map((f) => f.id);
  tickTributeCession(game.diplomacy, playerFactionIds, (f) => economyFor(game, f), 1);
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
    // M_V7.ECONOMY.REGISTRY — route the +50/+50 reward to ANY
    // non-barbarian faction id (legacy player/enemy + N-player
    // slots). economyFor lazy-creates the slot if it's the first
    // grant for that id. Resolves HIGH-2 from the v0.7 opening
    // review — pre-v0.7, this literal-matched only 'player'/'enemy'
    // and silently no-op'd for player-3..N camp clears.
    if (!cleared.clearedBy.startsWith('barbarian-camp-')) {
      const eco = economyFor(game, cleared.clearedBy);
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
    // M_HUD.NOTIF.WIRING.1 + M_GAME.CAMP.3 — surface the camp clear
    // as a tap-to-focus toast so the player can zoom to the loot
    // tile and pick up the wood/stone reward visually. The toast
    // fires for every clearing (both player + AI) — the player's
    // wood/stone bumped silently before this. Critical-tone for
    // human clearings, info-tone for AI clearings.
    if (typeof window !== 'undefined') {
      const clearerFaction = game.factions.find((f) => f.id === cleared.clearedBy);
      const isHuman = clearerFaction?.kind === 'human';
      window.dispatchEvent(
        new CustomEvent('aethelgard:toast', {
          detail: {
            id: `camp-cleared-${cleared.q}-${cleared.r}`,
            tone: isHuman ? 'success' : 'info',
            title: isHuman ? 'Barbarian camp cleared' : 'Enemy cleared a camp',
            description: isHuman
              ? `+50 wood, +50 stone${granted ? ' + a Discovery' : ''}.`
              : `An enemy faction claimed the spoils.`,
            focus: { q: cleared.q, r: cleared.r },
          },
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
  // Wonder countdown — M_V8.WONDER-TIMERS.N-PLAYER: iterate all faction ids.
  const WONDER_COUNTDOWN_SECONDS = 300;
  for (const factionId of factionIds(game.factions)) {
    let hasCompleteWonder = false;
    for (const e of game.world.query(Building, FactionTrait)) {
      const b = e.get(Building);
      const f = e.get(FactionTrait)?.faction;
      if (f !== factionId || !b || b.buildingType !== 'Wonder' || !b.isComplete) continue;
      hasCompleteWonder = true;
      break;
    }
    if (!hasCompleteWonder) {
      game.wonderTimers[factionId] = Infinity;
      continue;
    }
    if (game.wonderTimers[factionId] === Infinity) {
      game.wonderTimers[factionId] = WONDER_COUNTDOWN_SECONDS;
      // M_HUD.NOTIF.WIRING.1 — Wonder completion crosses the Infinity →
      // countdown boundary exactly once per wonder. Fire a critical
      // toast so the player can never miss "the enemy just started
      // their wonder timer" or "your wonder is now ticking."
      if (typeof window !== 'undefined') {
        const isPlayer = game.factions.find((f) => f.id === factionId)?.kind === 'human';
        window.dispatchEvent(
          new CustomEvent('aethelgard:toast', {
            detail: {
              id: `wonder-started-${factionId}`,
              tone: 'critical',
              title: isPlayer ? 'Your Wonder rises' : 'Enemy Wonder rises',
              description: isPlayer
                ? `Hold for ${WONDER_COUNTDOWN_SECONDS}s to win the realm.`
                : `Destroy it within ${WONDER_COUNTDOWN_SECONDS}s or the realm is lost.`,
            },
          }),
        );
      }
    }
    game.wonderTimers[factionId] = Math.max(0, (game.wonderTimers[factionId] ?? 0) - delta);
  }
  // Outcome: human faction timer hits 0 → win; any AI faction timer hits 0 → loss.
  // First-to-zero wins (handles N-player: first AI wonder beats human faction).
  if (game.outcome === 'playing') {
    for (const fc of game.factions) {
      if ((game.wonderTimers[fc.id] ?? Infinity) !== 0) continue;
      if (fc.kind === 'human') {
        game.outcome = 'win';
      } else {
        game.outcome = 'loss';
      }
      break; // first-to-zero wins
    }
  }
  // M_V11.PURGE — Age-of-strata Renaissance+Wonder instant-win
  // branch stripped (the mode is gone). RTS wonder timer in the
  // shared WONDER_COUNTDOWN_SECONDS path above is the only Wonder
  // victory condition now.
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
  // M_V11.PURGE — age-of-strata named-victory detection stripped.
  // RTS uses base-destruction + the long-reign / strata-wars
  // shared paths above.
  game.score.player += game.zones.player.controlled.size * delta;
  game.score.enemy += game.zones.enemy.controlled.size * delta;
}
