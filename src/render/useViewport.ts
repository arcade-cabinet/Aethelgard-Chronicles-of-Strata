import { useEffect, useState } from 'react';
import { type CameraProfileConfig, WORLD } from '@/config/world';

/**
 * Viewport classes the game adapts its presentation to.
 * M_EXPANSION.S.63 — added 'ultraWide' for aspect ratios > 2.4:1
 * (e.g. 32:9, 21:9 super-ultrawide monitors). Camera profile picks
 * a wider FOV; HUD panels stay anchored to the centre 16:9 column so
 * peripheral edges aren't dead chrome.
 */
export type ViewportClass = 'desktop' | 'ultraWide' | 'phoneLandscape' | 'phonePortrait';

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
const PHONE_MAX_WIDTH = 900;

/** Classify a width/height pair into a viewport class. */
function classify(width: number, height: number): ViewportClass {
  const portrait = height > width;
  if (portrait) return 'phonePortrait';
  if (width < PHONE_MAX_WIDTH) return 'phoneLandscape';
  // M_EXPANSION.S.63 — wider than 2.4:1 → ultrawide camera profile.
  if (width / height > ULTRAWIDE_ASPECT) return 'ultraWide';
  return 'desktop';
}

/** Build the full profile for a width/height pair. */
function profileFor(width: number, height: number): ViewportProfile {
  const cls = classify(width, height);
  return {
    class: cls,
    camera: WORLD.camera[cls],
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
