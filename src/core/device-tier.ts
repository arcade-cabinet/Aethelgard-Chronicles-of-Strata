/**
 * M_AUDIT2.SEC2.29 — device-tier confinement.
 *
 * `@capacitor/device` exposes a wide set of fingerprintable strings
 * (model, osVersion, manufacturer, isVirtual, memoryUsage). The rest
 * of the codebase needs ONE bit of that information: whether the
 * device can host the "Huge" board. Confining the import here lets
 * the rest of the app pull a single opaque `Tier` enum, makes the
 * fingerprint surface trivial to grep + monitor, and gives us one
 * place to swap the source (capability detection, telemetry-free
 * heuristic, etc) without rippling change across callers.
 *
 * Consumers MUST NOT import `@capacitor/device` directly — the
 * Biome project rule (lint config) flags any other importer.
 */
import { Device } from '@capacitor/device';

/** Coarse device capability tier. */
export type DeviceTier = 'low' | 'mid' | 'high';

let cached: DeviceTier | null = null;

/**
 * Resolve the device tier. Cached after first call — the answer
 * cannot change without an app restart, so re-querying wastes a
 * bridge round-trip.
 */
export async function getDeviceTier(): Promise<DeviceTier> {
  if (cached !== null) return cached;
  try {
    const info = await Device.getInfo();
    if (info.platform === 'web') {
      cached = 'high';
      return cached;
    }
    const major = Number.parseInt(info.osVersion.split('.')[0] ?? '0', 10);
    const recentEnough =
      (info.platform === 'android' && major >= 12) || (info.platform === 'ios' && major >= 15);
    cached = recentEnough ? 'high' : 'mid';
    return cached;
  } catch {
    cached = 'low';
    return cached;
  }
}

/** Test hook — reset the cached value. Do not call from app code. */
export function _resetDeviceTierCacheForTests(): void {
  cached = null;
}
