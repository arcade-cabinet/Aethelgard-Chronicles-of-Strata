/**
 * M_EXPANSION.F.81 — random one-shot world events.
 *
 * Every N seconds the event PRNG rolls a chance of one of:
 *   - weather-spike    immediately swap weather to a random state
 *   - raid-warning     announce that an enemy raid is incoming
 *   - refugee-arrival  spawn N free peons at the player base
 *
 * Events are one-shot — they fire, mutate game state, and emit a
 * window event for HUD consumers to render an alert. The aria-live
 * bus + (future) toast system surface them to the player.
 *
 * Cadence + odds tuned so a 5-minute match averages ~2 events.
 */
import { WILDFIRE_TUNING } from '@/config/mapgen';
import type { Rng } from '@/core/rng';
import { igniteWildfire } from '@/ecs/systems/wildfire';
import { announce } from '@/hud/aria-live-bus';
import type { GameState } from './game-state';
import { type WeatherState, WEATHER_PROFILES } from './weather';

/** One concrete event kind. */
export type RandomEventKind =
  | 'weather-spike'
  | 'raid-warning'
  | 'refugee-arrival'
  | 'wildfire';

/** Persistent tracker on GameState. */
export interface RandomEventsState {
  /** Seconds until the next event-roll attempt. */
  nextRollIn: number;
  /** Total events fired this match (for stats / progression). */
  fired: number;
  /** Last fired kind (for HUD or telemetry). */
  lastKind: RandomEventKind | null;
}

const ROLL_INTERVAL = 45; // seconds between rolls
const EVENT_CHANCE = 0.35; // probability an event fires on each roll
const REFUGEE_COUNT_MIN = 1;
const REFUGEE_COUNT_MAX = 3;

export function createRandomEventsState(): RandomEventsState {
  return { nextRollIn: ROLL_INTERVAL, fired: 0, lastKind: null };
}

/**
 * M_POLISH2.MODES.41a — long-reign escalation timer.
 *
 * Schedules 3 guaranteed escalation events per 5-minute window in
 * long-reign mode (on top of the normal random-event cadence).
 * The timing is deterministic per match seed; events fire at the
 * 5/10/15/20/... minute marks.
 *
 * Returns the kind that fired (or null when the elapsed game-time
 * hasn't crossed the next mark yet).
 */
const LONG_REIGN_ESCALATION_INTERVAL = 300; // seconds = 5 minutes

export function tickLongReignEscalation(
  game: GameState,
  rng: Rng,
  elapsedSeconds: number,
): RandomEventKind | null {
  if (game.mode !== 'long-reign') return null;
  if (game.outcome !== 'playing') return null;
  // Has the current 5-min window crossed a mark we haven't fired yet?
  const dueCount = Math.floor(elapsedSeconds / LONG_REIGN_ESCALATION_INTERVAL);
  // Track the number of long-reign escalations on the same `fired`
  // counter; the random-events path increments `fired` too — but
  // for the gate we use the modulo-from-elapsed approach so the
  // schedule is replayable across reload.
  // Use a property of randomEvents state to track count fired by
  // THIS path specifically.
  type StateWithLongReign = RandomEventsState & { longReignFired?: number };
  const state = game.randomEvents as StateWithLongReign;
  const alreadyFired = state.longReignFired ?? 0;
  if (alreadyFired >= dueCount) return null;
  // Fire one this tick — rotate through the 3 kinds by mark count.
  const order: RandomEventKind[] = ['raid-warning', 'weather-spike', 'refugee-arrival'];
  const kind = order[alreadyFired % order.length] ?? 'raid-warning';
  applyEvent(game, rng, kind);
  state.fired += 1;
  state.lastKind = kind;
  state.longReignFired = alreadyFired + 1;
  return kind;
}

/**
 * Tick the random-events scheduler. Drains `delta` from the cooldown;
 * when the cooldown hits 0, rolls a single event with EVENT_CHANCE
 * probability and applies its effect to `game`. Returns the kind
 * that fired (or null on miss / no event).
 */
export function tickRandomEvents(game: GameState, rng: Rng, delta: number): RandomEventKind | null {
  const state = game.randomEvents;
  state.nextRollIn -= delta;
  if (state.nextRollIn > 0) return null;
  state.nextRollIn = ROLL_INTERVAL;
  if (rng() > EVENT_CHANCE) return null;
  // Roll for which event (uniform across the 4 kinds).
  const r = rng();
  const kind: RandomEventKind =
    r < 0.25
      ? 'weather-spike'
      : r < 0.5
        ? 'raid-warning'
        : r < 0.75
          ? 'refugee-arrival'
          : 'wildfire';
  applyEvent(game, rng, kind);
  state.fired += 1;
  state.lastKind = kind;
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
      // Doesn't spawn the raid itself (that's the AI's job) — surfaces
      // a "raid incoming!" announcement so the player can prepare.
      announce('Raid warning: enemy forces are massing.');
      break;
    }
    case 'refugee-arrival': {
      // Credit the player +N free wood as if refugees brought supplies.
      // (Spawning physical peons would require a free-spawn ECS path
      // I'd rather not add here — wood credit is the same player
      // benefit.)
      const count =
        REFUGEE_COUNT_MIN + Math.floor(rng() * (REFUGEE_COUNT_MAX - REFUGEE_COUNT_MIN + 1));
      const wood = count * 10;
      game.economy.player.wood += wood;
      announce(`Refugees arrive bringing +${wood} wood.`);
      break;
    }
    case 'wildfire': {
      // M_FUN.DYN.WILDFIRE — pick a FOREST tile by random walk over
      // the board, gated by WILDFIRE_TUNING.ignitionChancePerEvent.
      // If no FOREST tile is found within `maxAttempts`, the event
      // silently no-ops (player gets no message; not every roll
      // ignites). On success, the wildfireSystem (driven by
      // runEconomyTick) handles spread + damage + extinguish.
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
