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
const MIN_INTERVAL = 90;
const MAX_INTERVAL = 180;

/** The HUD label for each weather state. */
export const WEATHER_LABEL: Record<WeatherState, string> = {
  sunny: '☀️ Sunny Skies',
  fog: '🌫️ Thick Fog',
  rain: '🌧️ Heavy Rain',
};

/** The movement-speed multiplier each weather state imposes. */
export const WEATHER_SPEED_MULTIPLIER: Record<WeatherState, number> = {
  sunny: 1,
  fog: 1,
  rain: 0.8,
};

/** Create the opening weather — Sunny, with the first transition scheduled. */
export function createWeather(): Weather {
  return { state: 'sunny', timer: MIN_INTERVAL };
}

/**
 * Advance the weather. When the timer elapses it transitions: Sunny goes to Fog
 * or Rain (50/50, event PRNG); Fog and Rain always return to Sunny — never
 * directly to each other.
 */
export function advanceWeather(weather: Weather, rng: Rng, delta: number): void {
  weather.timer -= delta;
  if (weather.timer > 0) return;
  if (weather.state === 'sunny') {
    weather.state = rng() < 0.5 ? 'fog' : 'rain';
  } else {
    weather.state = 'sunny';
  }
  weather.timer = MIN_INTERVAL + rng() * (MAX_INTERVAL - MIN_INTERVAL);
}
