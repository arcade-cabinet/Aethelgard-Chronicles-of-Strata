/**
 * M_FUN.PHONE.HAPTIC — opt-in gate + no-throw smoke pin.
 * Capacitor's web stub returns Promise.resolve(); the safeImpact
 * try/catch swallows any future thrown reject.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  hapticBuildComplete,
  hapticQuake,
  hapticUnitKilled,
  hapticWildfireIgnition,
  isHapticsEnabled,
  setHapticsEnabled,
} from '../haptics';

describe('haptics (M_FUN.PHONE.HAPTIC)', () => {
  afterEach(() => setHapticsEnabled(true));

  it('enabled by default', () => {
    expect(isHapticsEnabled()).toBe(true);
  });

  it('toggle persists', () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
  });

  it('every semantic helper resolves without throwing', async () => {
    await expect(hapticBuildComplete()).resolves.toBeUndefined();
    await expect(hapticUnitKilled()).resolves.toBeUndefined();
    await expect(hapticQuake()).resolves.toBeUndefined();
    await expect(hapticWildfireIgnition()).resolves.toBeUndefined();
  });

  it('helpers no-op when disabled', async () => {
    setHapticsEnabled(false);
    await expect(hapticBuildComplete()).resolves.toBeUndefined();
  });
});
