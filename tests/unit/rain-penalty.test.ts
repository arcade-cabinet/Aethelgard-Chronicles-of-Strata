import { describe, expect, it } from 'vitest';
import { WEATHER_SPEED_MULTIPLIER } from '@/game/weather';

describe('rain movement penalty', () => {
  it('rain imposes a 20% movement penalty', () => {
    expect(WEATHER_SPEED_MULTIPLIER.rain).toBeCloseTo(0.8, 5);
  });

  it('sunny and fog impose no penalty', () => {
    expect(WEATHER_SPEED_MULTIPLIER.sunny).toBe(1);
    expect(WEATHER_SPEED_MULTIPLIER.fog).toBe(1);
  });
});
