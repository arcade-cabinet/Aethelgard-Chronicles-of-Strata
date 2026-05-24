/**
 * M_AUDIT2.ARCH.26 — `useAsset(logicalId)` shared helper.
 *
 * Wraps `useGLTF(assets.url(logicalId))` — the pattern repeats 30+
 * times across FactionBase, Decoration, ResourceNodes, AnimatedCharacter,
 * etc. Lifting to one helper:
 *
 * - centralises the `logical id → URL → useGLTF` call chain so a
 *   future cache instrumentation (loader-progress for the loading
 *   screen, retry-on-failure) has ONE place to land.
 * - lets a consumer pass a logical id without importing `assets` in
 *   every world component.
 *
 * Callers that need preload still call `useGLTF.preload(assets.url(id))`
 * directly (drei's preload API isn't a hook).
 */
import { useGLTF } from '@react-three/drei';
import { assets } from './assets';

export function useAsset(logicalId: string): ReturnType<typeof useGLTF> {
  return useGLTF(assets.url(logicalId));
}

/** Preload a logical id (call at module scope, not in render). */
export function preloadAsset(logicalId: string): void {
  useGLTF.preload(assets.url(logicalId));
}
