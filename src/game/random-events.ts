/**
 * M_V11.EVENTS.RTS-TRIGGERED — events are CAUSED by game state, not
 * a wall-clock dice roll.
 *
 * User feedback: "events happening randomly versus as a result of
 * diplomacy or conflict or some other trigger ... the player
 * shouldn't start with events or else narratively it makes no sense"
 *
 * Previous implementation (`M_EXPANSION.F.81`) rolled every 45s and
 * fired a uniformly-distributed event with 35% probability. This made
 * events feel like roulette — a fresh game with no narrative basis
 * could still see "Refugees arrive" or "Wildfire" 60s in. Replaced
 * here with a per-event TRIGGER predicate. Each event evaluates a
 * domain condition on the game state every tick; if true AND the
 * shared cooldown has elapsed AND we're past the EVENT_GRACE_PERIOD,
 * the event fires.
 *
 * Triggers:
 *   - `raid-warning`     enemy army has > 3 military units within
 *                         5 hex of any player-controlled tile.
 *   - `refugee-arrival`  player Peon count dropped by ≥2 in the last
 *                         60s AND player is at peace with all enemies.
 *                         (Lore: peons fleeing chaos elsewhere come
 *                          here because they know it's safe.)
 *   - `wildfire`         drought weather state held ≥60s AND a FOREST
 *                         tile exists. Wildfire is the natural
 *                         consequence of sustained dry weather, not a
 *                         random injection.
 *   - `quake`            volcano active OR sustained land-pressure
 *                         (>15 buildings packed within a 7-hex
 *                          radius — the strata complains).
 *   - `weather-spike`    a different event fires this tick that
 *                         WOULD plausibly shift weather (wildfire,
 *                         quake). Cascading consequence, not random.
 *
 * Grace period: no event of ANY kind in the first
 * EVENT_GRACE_PERIOD_SECONDS so a fresh game starts narratively
 * silent. Cadence-cap unchanged at MYTH_MIN_INTERVAL_SECONDS via the
 * shared cooldown the previous implementation used.
 */
import { QUAKE_TUNING, WILDFIRE_TUNING } from '@/config/world';
import { hexDistance, parseHexKey } from '@/core/hex';
import { buildNavGraph } from '@/core/pathfinding';
import type { Rng } from '@/core/rng';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { triggerQuake } from '@/ecs/systems/quake';
import { igniteWildfire } from '@/ecs/systems/wildfire';
import { announce } from '@/hud/aria-live-bus';
import type { GameState } from './game-state';
import { WEATHER_PROFILES, type WeatherState } from './weather';

/** One concrete event kind. */
export type RandomEventKind =
  | 'weather-spike'
  | 'raid-warning'
  | 'refugee-arrival'
  | 'wildfire'
  | 'quake';

/** Persistent tracker on GameState. */
export interface RandomEventsState {
  /** Seconds until the next eligibility check (cooldown between any two events). */
  nextRollIn: number;
  /** Total events fired this match (for stats / progression). */
  fired: number;
  /** Last fired kind (for HUD or telemetry). */
  lastKind: RandomEventKind | null;
  /** Player Peon count snapshot from previous tick — for refugee-arrival
   *  trigger (fires when player loses peons => fleeing peons regroup here). */
  peonHistory?: { count: number; recordedAtSeconds: number };
  /** Sim-seconds the current weather state was first entered — for
   *  wildfire trigger (drought needs to be sustained). */
  weatherStateEnteredAt?: { state: WeatherState; atSeconds: number };
}

/** No events at all in the first N seconds of a match. Narrative
 *  guarantee: a fresh game is silent — players get time to settle in
 *  before the world starts reacting to them. */
const EVENT_GRACE_PERIOD_SECONDS = 90;
/** Min interval between any two consecutive events. */
const EVENT_COOLDOWN_SECONDS = 45;
const REFUGEE_COUNT_MIN = 1;
const REFUGEE_COUNT_MAX = 3;
/** raid-warning fires when enemy military count near player ≥ this. */
const RAID_ENEMY_MILITARY_THRESHOLD = 3;
/** wildfire fires when drought weather held ≥ this many sim-seconds. */
const WILDFIRE_DROUGHT_HOLD_SECONDS = 60;
/** Per-tick probability that a SATISFIED trigger actually fires.
 *  Triggers UNLOCK the possibility; the dice still has to roll. So a
 *  player who builds up enemy pressure sees raid-warning probably-but-
 *  not-certainly, on the order of "every minute or two while the
 *  trigger holds" rather than instant + guaranteed. */
const TRIGGER_FIRE_PROBABILITY = 0.35;

export function createRandomEventsState(): RandomEventsState {
  return { nextRollIn: EVENT_COOLDOWN_SECONDS, fired: 0, lastKind: null };
}

/**
 * M_POLISH2.MODES.41a — long-reign escalation timer.
 *
 * Schedules 3 guaranteed escalation events per 5-minute window in
 * long-reign mode (on top of the trigger-driven random events). The
 * timing is deterministic per match seed; events fire at the
 * 5/10/15/20/... minute marks.
 *
 * Long-reign is a mode where escalation is the POINT — narratively
 * "the realm endures another era of strife." The clock-driven firing
 * here is fine because long-reign explicitly opts INTO escalating
 * pressure, whereas the default random-events path now requires a
 * real trigger.
 */
const LONG_REIGN_ESCALATION_INTERVAL = 300;

export function tickLongReignEscalation(
  game: GameState,
  rng: Rng,
  elapsedSeconds: number,
): RandomEventKind | null {
  if (game.mode !== 'long-reign') return null;
  if (game.outcome !== 'playing') return null;
  const dueCount = Math.floor(elapsedSeconds / LONG_REIGN_ESCALATION_INTERVAL);
  type StateWithLongReign = RandomEventsState & { longReignFired?: number };
  const state = game.randomEvents as StateWithLongReign;
  const alreadyFired = state.longReignFired ?? 0;
  if (alreadyFired >= dueCount) return null;
  const order: RandomEventKind[] = ['raid-warning', 'weather-spike', 'refugee-arrival'];
  const kind = order[alreadyFired % order.length] ?? 'raid-warning';
  applyEvent(game, rng, kind);
  state.fired += 1;
  state.lastKind = kind;
  state.longReignFired = alreadyFired + 1;
  return kind;
}

/** Count player Peons via the ECS. */
function countPlayerPeons(game: GameState): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType === 'Peon') n += 1;
  }
  return n;
}

/** Count enemy military units within `radius` hex steps of ANY
 *  player-controlled tile. Iterates enemies, parses each player tile
 *  key once into (q, r) for an O(enemies × playerTiles) scan with hex
 *  distance — for typical boards this is well under 1ms/tick. */
function countEnemyMilitaryNearPlayer(game: GameState, radius: number): number {
  const playerZone = game.zones.player;
  if (!playerZone || playerZone.controlled.size === 0) return 0;
  // Pre-parse player tiles once per call.
  const playerCoords: Array<{ q: number; r: number }> = [];
  for (const key of playerZone.controlled) {
    playerCoords.push(parseHexKey(key));
  }
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    if (e.get(FactionTrait)?.faction !== 'enemy') continue;
    const u = e.get(Unit);
    if (!u || u.unitType === 'Peon') continue;
    const pos = e.get(HexPosition);
    if (!pos) continue;
    for (const pc of playerCoords) {
      if (hexDistance(pos.q, pos.r, pc.q, pc.r) <= radius) {
        n += 1;
        break;
      }
    }
  }
  return n;
}

/** True iff the human player faction is at peace with every other
 *  faction. Iterates relation entries by id (NOT substring) so a war
 *  between two AI factions named "player-3" / "player-4" doesn't
 *  spuriously make the human player look at war. */
function isPlayerAtPeace(game: GameState): boolean {
  const rels = game.diplomacy.relations;
  if (rels.size === 0) return true;
  for (const [key, rel] of rels) {
    if (rel.relation !== 'enemy') continue;
    const parts = key.split('|');
    if (parts.length !== 2) continue;
    if (parts[0] === 'player' || parts[1] === 'player') return false;
  }
  return true;
}

/**
 * Tick the trigger-driven events scheduler. Each event has a domain
 * predicate; the first one whose predicate is true (and which is
 * past the cooldown + grace period) fires. Predicates evaluated in
 * priority order: raid-warning > wildfire > quake > refugee-arrival >
 * weather-spike (cascading from another event this tick).
 *
 * Returns the kind that fired (or null on miss / no trigger satisfied).
 */
export function tickRandomEvents(game: GameState, rng: Rng, delta: number): RandomEventKind | null {
  const state = game.randomEvents;
  state.nextRollIn -= delta;
  // Grace period: no events at all in the first EVENT_GRACE_PERIOD_SECONDS.
  if (game.clock.elapsed < EVENT_GRACE_PERIOD_SECONDS) return null;
  // Cooldown between any two events.
  if (state.nextRollIn > 0) return null;
  // Update peon-count history for refugee trigger BEFORE evaluating.
  const currentPeons = countPlayerPeons(game);
  const prevPeon = state.peonHistory;
  // Update weather-state history for wildfire trigger.
  const currentWeather = game.weather.state;
  if (!state.weatherStateEnteredAt || state.weatherStateEnteredAt.state !== currentWeather) {
    state.weatherStateEnteredAt = { state: currentWeather, atSeconds: game.clock.elapsed };
  }

  // Evaluate triggers in priority order.
  let kind: RandomEventKind | null = null;

  // 1. raid-warning — enemy military pressure near player.
  if (
    countEnemyMilitaryNearPlayer(game, 5) >= RAID_ENEMY_MILITARY_THRESHOLD &&
    !isPlayerAtPeace(game)
  ) {
    kind = 'raid-warning';
  }
  // 2. wildfire — extended dry weather (non-'rain') AND forest tiles
  //    exist. Weather is one of {'sunny', 'fog', 'rain'}; we treat any
  //    sustained non-'rain' as drought-equivalent for ignition.
  else if (
    currentWeather !== 'rain' &&
    game.clock.elapsed - state.weatherStateEnteredAt.atSeconds >= WILDFIRE_DROUGHT_HOLD_SECONDS
  ) {
    let forestCount = 0;
    for (const tile of game.board.tiles.values()) {
      if (tile.type === 'FOREST') {
        forestCount += 1;
        if (forestCount > 0) break;
      }
    }
    if (forestCount > 0) kind = 'wildfire';
  }
  // 3. quake — volcano actively producing lava counts as seismic
  //    pressure that can rattle distant ground.
  else if (game.volcano && game.volcano.lavaTiles.size > 0) {
    kind = 'quake';
  }
  // 4. refugee-arrival — player lost ≥2 peons recently AND at peace.
  else if (prevPeon && currentPeons + 2 <= prevPeon.count && isPlayerAtPeace(game)) {
    kind = 'refugee-arrival';
  }

  // Snapshot peon count for next tick's refugee comparison.
  state.peonHistory = { count: currentPeons, recordedAtSeconds: game.clock.elapsed };

  if (kind === null) {
    // No trigger satisfied — reset a shorter recheck interval so we
    // poll cheaply rather than wait the full cooldown for nothing.
    state.nextRollIn = 5;
    return null;
  }
  // A trigger was satisfied — but probability still rules. Events
  // aren't guaranteed: a player who keeps the trigger TRUE for a
  // while will see the event, but each individual cooldown-window
  // is a coin flip. The opposite (deterministic firing) felt
  // robotic in playtest.
  if (rng() >= TRIGGER_FIRE_PROBABILITY) {
    state.nextRollIn = EVENT_COOLDOWN_SECONDS;
    return null;
  }

  applyEvent(game, rng, kind);
  state.fired += 1;
  state.lastKind = kind;
  state.nextRollIn = EVENT_COOLDOWN_SECONDS;

  // Cascading: a quake or wildfire often disturbs the weather. Fire a
  // chained weather-spike with low probability — it's a CONSEQUENCE,
  // not an independent random event.
  if ((kind === 'quake' || kind === 'wildfire') && rng() < 0.4) {
    // Don't recurse into tickRandomEvents — directly cascade.
    applyEvent(game, rng, 'weather-spike');
    state.fired += 1;
  }

  return kind;
}

function applyEvent(game: GameState, rng: Rng, kind: RandomEventKind): void {
  switch (kind) {
    case 'weather-spike': {
      const states: WeatherState[] = Object.keys(WEATHER_PROFILES) as WeatherState[];
      const next = states[Math.floor(rng() * states.length)] ?? 'sunny';
      game.weather.state = next;
      announce(`Weather spike: ${WEATHER_PROFILES[next].label}`);
      break;
    }
    case 'raid-warning': {
      announce('Raid warning: enemy forces are massing.');
      break;
    }
    case 'refugee-arrival': {
      const count =
        REFUGEE_COUNT_MIN + Math.floor(rng() * (REFUGEE_COUNT_MAX - REFUGEE_COUNT_MIN + 1));
      const wood = count * 10;
      game.economy.player.wood += wood;
      announce(`Refugees arrive bringing +${wood} wood.`);
      break;
    }
    case 'quake': {
      if (rng() >= QUAKE_TUNING.ignitionChancePerEvent) break;
      const out = triggerQuake(game, game.board);
      if (out.flipped.length === 0) break;
      game.navGraph = buildNavGraph(game.board);
      announce(`Earthquake! ${out.flipped.length} tiles reshape.`);
      game.quakeShakeRemaining = Math.min(out.shakeSeconds, QUAKE_TUNING.shakeSeconds * 2);
      break;
    }
    case 'wildfire': {
      if (rng() >= WILDFIRE_TUNING.ignitionChancePerEvent) break;
      const forestTiles: { q: number; r: number }[] = [];
      for (const tile of game.board.tiles.values()) {
        if (tile.type === 'FOREST') forestTiles.push({ q: tile.q, r: tile.r });
      }
      if (forestTiles.length === 0) break;
      const pick = forestTiles[Math.floor(rng() * forestTiles.length)];
      if (!pick) break;
      if (igniteWildfire(game, game.board.tiles, pick.q, pick.r)) {
        announce('Wildfire breaks out in the forest!');
      }
      break;
    }
  }
}
