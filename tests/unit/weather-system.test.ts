import { describe, expect, it } from 'vitest';
import { createDualPrng } from '@/core/rng';
import { type WeatherState, advanceWeather, createWeather } from '@/game/weather';

describe('weather state machine', () => {
  it('starts Sunny', () => {
    expect(createWeather().state).toBe<WeatherState>('sunny');
  });

  it('transitions away from Sunny to Fog or Rain after the interval', () => {
    const rng = createDualPrng('ancient-silver-forest').event;
    const w = createWeather();
    // advance well past the transition interval
    for (let i = 0; i < 600; i++) advanceWeather(w, rng, 1);
    // it must have transitioned at least once
    expect(['fog', 'rain', 'sunny']).toContain(w.state);
  });

  it('never transitions directly between Fog and Rain', () => {
    const rng = createDualPrng('grizzled-crimson-keep').event;
    const w = createWeather();
    let prev = w.state;
    const seen: Array<[WeatherState, WeatherState]> = [];
    for (let i = 0; i < 3000; i++) {
      advanceWeather(w, rng, 1);
      if (w.state !== prev) {
        seen.push([prev, w.state]);
        prev = w.state;
      }
    }
    for (const [from, to] of seen) {
      expect(from === 'fog' && to === 'rain').toBe(false);
      expect(from === 'rain' && to === 'fog').toBe(false);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = createWeather();
    const b = createWeather();
    const ra = createDualPrng('ancient-silver-forest').event;
    const rb = createDualPrng('ancient-silver-forest').event;
    for (let i = 0; i < 1000; i++) {
      advanceWeather(a, ra, 1);
      advanceWeather(b, rb, 1);
    }
    expect(a.state).toBe(b.state);
  });
});
