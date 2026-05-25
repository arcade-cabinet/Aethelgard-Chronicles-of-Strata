/**
 * Capacitor-aware device classification for viewport routing.
 *
 * User feedback (post-v0.4 release, OnePlus Open foldable unfolded):
 * the prior useViewport implementation classified via window.innerWidth
 * alone. On a foldable the CSS viewport is ~840 px wide unfolded but
 * the form factor is TABLET (touch primary, two-up layouts viable).
 * Width-only mapped it to `desktop`, the HUD packed into a desktop
 * grid, and the user saw "crowded with overlapping" elements.
 *
 * This module is the SINGLE source of truth for "what kind of device
 * is this?". It uses, in priority order:
 *
 *   1. `Capacitor.getPlatform()` — 'ios' / 'android' → mobile platform
 *      regardless of CSS width. Foldable unfolded still reports
 *      'android' so we know it's not a desktop.
 *   2. `@capacitor/device` `Device.getInfo()` — `operatingSystem`
 *      + `model` for finer routing (e.g. iPad model strings classify
 *      as tablet even though the platform is 'ios').
 *   3. `matchMedia('(pointer: coarse)')` — touch-primary detection
 *      for web/PWA browsers on Android Chrome.
 *   4. `matchMedia('(min-width: 600px)')` — only as the LAST tiebreaker.
 *
 * Returns one of the four user-visible classes:
 *   - `desktop`         — pointer:fine + web platform, OR width ≥ 1024
 *   - `tablet`          — touch-primary + min(width,height) ≥ 600,
 *                         OR iPad/Android tablet model strings
 *   - `phonePortrait`   — mobile platform + portrait
 *   - `phoneLandscape`  — mobile platform + landscape + small
 *
 * The 'ultraWide' refinement is applied LATER in useViewport based
 * on aspect ratio when this module returns 'desktop'.
 */
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

/**
 * The narrow device class — orientation flips a phone between
 * portrait/landscape but the device class itself doesn't change.
 */
export type DeviceClass = 'desktop' | 'tablet' | 'phonePortrait' | 'phoneLandscape';

let cached: DeviceClass | null = null;
let coldGuess: DeviceClass | null = null;

/**
 * Best-effort synchronous classification — uses the cached real
 * answer if `getDeviceClass()` has resolved, otherwise a cheap
 * media-query + width fallback. useViewport calls this for its
 * useState initializer and then calls the async resolver from
 * useEffect to correct on the first tick.
 */
export function getDeviceClassSync(): DeviceClass | null {
  if (cached) return cached;
  if (coldGuess) return coldGuess;
  if (typeof window === 'undefined') return null;
  // Cold-path heuristic — pointer:coarse strongly suggests mobile
  // on Android Chrome / Capacitor; pointer:fine + width ≥ 1024 is
  // desktop. Everything in between is tablet (best-effort).
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const portrait = window.innerHeight > window.innerWidth;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  if (coarse) {
    if (minDim < 600) coldGuess = portrait ? 'phonePortrait' : 'phoneLandscape';
    else coldGuess = 'tablet';
  } else {
    coldGuess = window.innerWidth >= 1024 ? 'desktop' : 'tablet';
  }
  return coldGuess;
}

/**
 * Async-resolved classification — calls into Capacitor.getPlatform()
 * + Device.getInfo() so we get the TRUE device class (not a CSS-
 * viewport guess). Cached after first call.
 */
export async function getDeviceClass(): Promise<DeviceClass> {
  if (cached) return cached;
  if (typeof window === 'undefined') {
    cached = 'desktop';
    return cached;
  }
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  let info: Awaited<ReturnType<typeof Device.getInfo>> | null = null;
  try {
    info = await Device.getInfo();
  } catch {
    // Capacitor not available (pure web build) — fall through to
    // the matchMedia + width branch below.
  }

  const portrait = window.innerHeight > window.innerWidth;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  // 1. Native Capacitor platform — the truth signal.
  if (platform === 'ios' || platform === 'android') {
    // iPad reports 'ios' with model containing 'iPad' — tablet.
    const model = info?.model ?? '';
    const isTablet =
      /iPad/i.test(model) ||
      /Tab|Pad/i.test(model) || // Galaxy Tab, OnePlus Pad, etc
      minDim >= 600; // unfolded foldable / 7"+ tablet by dimension
    if (isTablet) {
      cached = 'tablet';
    } else {
      cached = portrait ? 'phonePortrait' : 'phoneLandscape';
    }
    return cached;
  }

  // 2. Web platform — use pointer-coarse + dim as the signal.
  if (coarse) {
    if (minDim < 600) cached = portrait ? 'phonePortrait' : 'phoneLandscape';
    else cached = 'tablet';
  } else {
    // pointer:fine — desktop unless the viewport is really small
    // (mobile emulation in devtools).
    cached = window.innerWidth >= 1024 ? 'desktop' : 'tablet';
  }
  return cached;
}

/** Test hook — reset the cache (do not call from app code). */
export function _resetDeviceClassCacheForTests(): void {
  cached = null;
  coldGuess = null;
}
