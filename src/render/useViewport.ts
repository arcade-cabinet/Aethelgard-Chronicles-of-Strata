import { useEffect, useState } from 'react';
import { type CameraProfileConfig, WORLD } from '@/config/world';
import { getDeviceClass, getDeviceClassSync } from '@/core/device-class';

/**
 * Viewport classes the game adapts its presentation to.
 *
 * User feedback (v0.4 post-merge — OnePlus Open foldable unfolded
 * showed a crowded overlapping HUD because the prior implementation
 * was lazy width-only math): pure dimension thresholds misclassify
 * foldables, high-DPI tablets, and Android Capacitor where the CSS
 * viewport doesn't match the device form factor. Classification now
 * delegates to `@/core/device-class`, which uses the Capacitor
 * Platform + Device APIs as the primary signal and falls back to
 * `matchMedia('(pointer: coarse)')` + dimensions only as a tiebreaker.
 *
 * M_EXPANSION.S.63 — 'ultraWide' for aspect ratios > 2.4:1.
 * M_POLISH2.MOBILE.13 — 'tablet' for the iPad / Galaxy Tab / foldable
 *   unfolded range.
 */
export type ViewportClass = 'desktop' | 'ultraWide' | 'tablet' | 'phoneLandscape' | 'phonePortrait';

/** Aspect-ratio threshold above which a web viewport classifies as ultraWide. */
const ULTRAWIDE_ASPECT = 2.4;

/** The resolved presentation profile for the current viewport. */
export interface ViewportProfile {
  /** Which class the current viewport falls into. */
  class: ViewportClass;
  /** Camera placement defaults for this class (from world.json). */
  camera: CameraProfileConfig;
  /** Whether the viewport is portrait (taller than wide). */
  isPortrait: boolean;
}

/** Build the full profile for the current device + dimensions. */
function profileFor(
  width: number,
  height: number,
  deviceClass: ViewportClass | null,
): ViewportProfile {
  const portrait = height > width;
  let cls: ViewportClass;
  if (deviceClass) {
    // Device classification already gave us mobile/tablet/desktop.
    // Refine the mobile case into portrait/landscape based on the
    // current orientation; tablet+desktop keep their device class
    // and use orientation only for camera framing.
    if (deviceClass === 'phonePortrait' || deviceClass === 'phoneLandscape') {
      cls = portrait ? 'phonePortrait' : 'phoneLandscape';
    } else if (deviceClass === 'desktop' && width / Math.max(1, height) > ULTRAWIDE_ASPECT) {
      cls = 'ultraWide';
    } else {
      cls = deviceClass;
    }
  } else {
    // SSR / pre-Capacitor-init fallback — pure width-class heuristic.
    // This branch only fires before getDeviceClass() resolves; useEffect
    // immediately calls the async resolver and re-classifies.
    if (portrait) cls = 'phonePortrait';
    else if (width < 600) cls = 'phoneLandscape';
    else if (width < 1024) cls = 'tablet';
    else if (width / height > ULTRAWIDE_ASPECT) cls = 'ultraWide';
    else cls = 'desktop';
  }
  type CameraTable = (typeof WORLD)['camera'];
  const cameraTable = WORLD.camera as CameraTable & Record<string, CameraProfileConfig>;
  const camera = cameraTable[cls] ?? cameraTable.desktop;
  return { class: cls, camera, isPortrait: portrait };
}

/**
 * Classify the current viewport using Capacitor device detection
 * (when available) + orientation. Re-evaluates on resize +
 * orientationchange. See `docs/specs/98-viewport-and-config.md`.
 */
export function useViewport(): ViewportProfile {
  const [profile, setProfile] = useState<ViewportProfile>(() => {
    if (typeof window === 'undefined') return profileFor(1280, 800, 'desktop');
    // Synchronous best-effort: getDeviceClassSync() returns either
    // the cached real classification (warm) or a width-based guess
    // (cold) — the async resolver below corrects it within a tick.
    return profileFor(window.innerWidth, window.innerHeight, getDeviceClassSync());
  });

  useEffect(() => {
    let cancelled = false;
    // 1. Resolve the proper device class once (cached after the
    //    first call — Capacitor.getPlatform + Device.getInfo).
    void getDeviceClass().then((dc) => {
      if (cancelled) return;
      setProfile(profileFor(window.innerWidth, window.innerHeight, dc));
    });
    // 2. Re-classify on resize + orientationchange — orientation is
    //    the only thing that flips between phonePortrait and
    //    phoneLandscape post-cache; the device class itself is fixed.
    const onResize = () =>
      setProfile(profileFor(window.innerWidth, window.innerHeight, getDeviceClassSync()));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return profile;
}
