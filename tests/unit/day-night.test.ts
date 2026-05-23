import { describe, expect, it } from 'vitest';
import { advanceClock, createClock, lightIntensityAt, skyColorAt } from '@/game/clock';

describe('day/night cycle', () => {
  it('a fresh clock starts at game time 0', () => {
    expect(createClock().elapsed).toBe(0);
  });

  it('advanceClock accumulates elapsed game seconds', () => {
    const c = createClock();
    advanceClock(c, 1.5);
    advanceClock(c, 0.5);
    expect(c.elapsed).toBe(2);
  });

  it('light intensity peaks near noon and bottoms near midnight', () => {
    // DAY_LENGTH seconds per full cycle; noon = 0.25, midnight = 0.75 of the cycle
    const noon = lightIntensityAt(0.25);
    const midnight = lightIntensityAt(0.75);
    expect(noon).toBeGreaterThan(0.85);
    expect(midnight).toBeLessThan(0.15);
  });

  it('light intensity transitions smoothly (no step)', () => {
    let prev = lightIntensityAt(0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const v = lightIntensityAt(p);
      expect(Math.abs(v - prev)).toBeLessThan(0.1);
      prev = v;
    }
  });

  it('sky color is light at noon and dark at midnight', () => {
    const noon = skyColorAt(0.25);
    const midnight = skyColorAt(0.75);
    // sky color is a hex string; compare the rough brightness
    const brightness = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);
    expect(brightness(noon)).toBeGreaterThan(brightness(midnight));
  });
});
