import { WORLD } from '@/config/world';
import type { Rng } from '@/core/rng';

/** A weather state. */
export type WeatherState = 'sunny' | 'fog' | 'rain';

/** Weather state + the timer until the next transition. */
export interface Weather {
  /** Current weather. */
  state: WeatherState;
  /** Seconds until the next transition. */
  timer: number;
}

/** Minimum and maximum seconds between weather transitions. */
const MIN_INTERVAL: number = WORLD.weather.minInterval;
const MAX_INTERVAL: number = WORLD.weather.maxInterval;

/**
 * Per-WeatherState properties (M_AUDIT2.ARCH.5) — was two parallel
 * Records (WEATHER_LABEL + WEATHER_SPEED_MULTIPLIER). One profile per
 * state; adding a property (e.g. visionRadiusMultiplier, audioStingId)
 * is ONE column not a new top-level table.
 */
export interface WeatherProfile {
  /** HUD label including emoji. */
  label: string;
  /** Movement-speed multiplier applied while this weather is active. */
  speedMultiplier: number;
  /**
   * M_EXPANSION.T.135 — ranged-attack accuracy multiplier. Rain
   * makes arrows + magic projectiles less reliable (drop one in
   * three to ~0.7); fog reduces sight which we model via the
   * vision multiplier below + an accuracy hit (you fire at a
   * target you can barely see). 1.0 = no penalty. Combat reads
   * this for any unit whose meleeWeapon === 'none' (i.e. ranged).
   */
  rangedAccuracyMultiplier: number;
  /**
   * M_EXPANSION.T.135 — vision-cone-radius multiplier. Fog halves
   * vision; rain reduces it slightly. Multiplies INTO the existing
   * day-night vision modifier from F.87. Both factions equally
   * affected (weather is symmetric).
   */
  visionMultiplier: number;
}

export const WEATHER_PROFILES: Record<WeatherState, WeatherProfile> = {
  sunny: {
    label: '☀️ Sunny Skies',
    speedMultiplier: 1,
    rangedAccuracyMultiplier: 1,
    visionMultiplier: 1,
  },
  fog: {
    label: '🌫️ Thick Fog',
    speedMultiplier: 1,
    // Reading a target across fog is hard; the shooter still aims
    // but the projectile is more likely to clip a rock or trace
    // wide. 0.65 = roughly one-in-three misses.
    rangedAccuracyMultiplier: 0.65,
    // Fog halves the vision cone radius — the spec target.
    visionMultiplier: 0.5,
  },
  rain: {
    label: '🌧️ Heavy Rain',
    speedMultiplier: 0.8,
    // Spec: rain reduces ranged accuracy 30%.
    rangedAccuracyMultiplier: 0.7,
    // Rain less impactful on vision than fog — fewer occluded
    // pixels — but still some.
    visionMultiplier: 0.85,
  },
};

/** Back-compat re-exports — derived from WEATHER_PROFILES. */
export const WEATHER_LABEL: Record<WeatherState, string> = {
  sunny: WEATHER_PROFILES.sunny.label,
  fog: WEATHER_PROFILES.fog.label,
  rain: WEATHER_PROFILES.rain.label,
};
export const WEATHER_SPEED_MULTIPLIER: Record<WeatherState, number> = {
  sunny: WEATHER_PROFILES.sunny.speedMultiplier,
  fog: WEATHER_PROFILES.fog.speedMultiplier,
  rain: WEATHER_PROFILES.rain.speedMultiplier,
};

/**
 * Create the opening weather — Sunny. The first transition is scheduled at a
 * seed-scattered interval when an `rng` is given (so the opening 90s is not
 * identical across all seeds), or at `MIN_INTERVAL` as a deterministic default.
 */
export function createWeather(rng?: Rng): Weather {
  const timer = rng ? MIN_INTERVAL + rng() * (MAX_INTERVAL - MIN_INTERVAL) : MIN_INTERVAL;
  return { state: 'sunny', timer };
}

/**
 * Advance the weather. When the timer elapses it transitions: Sunny goes to Fog
 * or Rain (50/50, event PRNG); Fog and Rain always return to Sunny — never
 * directly to each other.
 *
 * Frame-step independence: drains ALL elapsed intervals in a `while` loop
 * (CodeRabbit), so a long delta (browser tab unblocked, slow frame) still
 * resolves every weather window it crossed instead of merging them into one.
 */
export function advanceWeather(weather: Weather, rng: Rng, delta: number): void {
  weather.timer -= delta;
  let safety = 8; // cap iterations so a giant delta can't loop unboundedly
  while (weather.timer <= 0 && safety-- > 0) {
    if (weather.state === 'sunny') {
      weather.state = rng() < 0.5 ? 'fog' : 'rain';
    } else {
      weather.state = 'sunny';
    }
    weather.timer += MIN_INTERVAL + rng() * (MAX_INTERVAL - MIN_INTERVAL);
  }
}
