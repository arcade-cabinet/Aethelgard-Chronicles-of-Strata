import { useEffect, useState } from 'react';
import { type CameraProfileConfig, WORLD } from '@/config/world';

/**
 * Viewport classes the game adapts its presentation to.
 * M_EXPANSION.S.63 — added 'ultraWide' for aspect ratios > 2.4:1
 * (e.g. 32:9, 21:9 super-ultrawide monitors). Camera profile picks
 * a wider FOV; HUD panels stay anchored to the centre 16:9 column so
 * peripheral edges aren't dead chrome.
 */
/**
 * M_POLISH2.MOBILE.13 — added 'tablet' for the 600..1024px width
 * landscape range (iPad Mini, Galaxy Tab, surface portrait). Today
 * the class behaves like 'desktop' for layout (the camera profile
 * map fills the default desktop profile when no tablet-specific
 * one is provided) but consumers that want a tablet branch can
 * switch on it explicitly. Adding this class is purely additive —
 * existing switch consumers fall through to a default branch.
 */
export type ViewportClass =
  | 'desktop'
  | 'ultraWide'
  | 'tablet'
  | 'phoneLandscape'
  | 'phonePortrait';

/** Aspect-ratio threshold above which the viewport classifies as ultraWide. */
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

/** Width below which a landscape viewport is treated as a phone. */
const PHONE_MAX_WIDTH = 600;
/**
 * M_POLISH2.MOBILE.13 — tablet upper bound. Landscape viewports
 * with width in [PHONE_MAX_WIDTH, TABLET_MAX_WIDTH) classify as
 * 'tablet' (iPad Mini landscape 1024×768, Galaxy Tab portrait at
 * 800×1280 — though portrait wins the portrait gate first). Above
 * 1024 falls through to 'desktop'.
 */
const TABLET_MAX_WIDTH = 1024;

/** Classify a width/height pair into a viewport class. */
function classify(width: number, height: number): ViewportClass {
  const portrait = height > width;
  if (portrait) return 'phonePortrait';
  if (width < PHONE_MAX_WIDTH) return 'phoneLandscape';
  if (width < TABLET_MAX_WIDTH) return 'tablet';
  // M_EXPANSION.S.63 — wider than 2.4:1 → ultrawide camera profile.
  if (width / height > ULTRAWIDE_ASPECT) return 'ultraWide';
  return 'desktop';
}

/** Build the full profile for a width/height pair. */
function profileFor(width: number, height: number): ViewportProfile {
  const cls = classify(width, height);
  // M_POLISH2.MOBILE.13 — when the camera config doesn't have a row
  // for the new 'tablet' class yet, fall back to 'desktop' so we
  // don't crash + the tablet renders with a reasonable default.
  // Add WORLD.camera.tablet to config/world.json when tuning the
  // tablet-specific FOV / pose.
  type CameraTable = (typeof WORLD)['camera'];
  const cameraTable = WORLD.camera as CameraTable & Record<string, CameraProfileConfig>;
  const camera = cameraTable[cls] ?? cameraTable.desktop;
  return {
    class: cls,
    camera,
    isPortrait: height > width,
  };
}

/**
 * Classify the current viewport (desktop / phone-landscape / phone-portrait)
 * and yield its presentation profile. Re-evaluates on resize and orientation
 * change so the camera and HUD adapt live. See `docs/specs/98-viewport-and-config.md`.
 */
export function useViewport(): ViewportProfile {
  const [profile, setProfile] = useState<ViewportProfile>(() =>
    typeof window === 'undefined'
      ? profileFor(1280, 800)
      : profileFor(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const onResize = () => setProfile(profileFor(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return profile;
}
