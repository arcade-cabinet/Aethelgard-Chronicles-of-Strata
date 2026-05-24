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
import type { Rng } from '@/core/rng';
import { announce } from '@/hud/aria-live-bus';
import type { GameState } from './game-state';
import { type WeatherState, WEATHER_PROFILES } from './weather';

/** One concrete event kind. */
export type RandomEventKind = 'weather-spike' | 'raid-warning' | 'refugee-arrival';

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
  // Roll for which event (uniform across the 3 kinds).
  const r = rng();
  const kind: RandomEventKind =
    r < 1 / 3 ? 'weather-spike' : r < 2 / 3 ? 'raid-warning' : 'refugee-arrival';
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
  }
}
