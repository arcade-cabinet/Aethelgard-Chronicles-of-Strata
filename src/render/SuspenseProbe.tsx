import { useEffect, useRef } from 'react';

/**
 * M_POLISH3.FB.2 — observable Suspense fallback.
 *
 * Previously Suspense boundaries in the scene used `fallback={null}`
 * which both (a) painted nothing while a child suspended, and (b) gave
 * the agent no visible signal that a child was stuck loading. If a
 * useGLTF call hangs (slow network, bad CDN cache, corrupt GLB),
 * the scene silently lost the affected subtree — no error fired
 * because Suspense IS the loading-state mechanism; only after a
 * SECOND throw (post-suspension) would ErrorBoundary trigger.
 *
 * This component renders nothing visible by default. Its sole job:
 *   1. on mount, start a timer
 *   2. after THRESHOLD_MS still being mounted, console.warn (which
 *      ErrorOverlay surfaces) with the supplied label
 *   3. on unmount, cancel the timer
 *
 * Mount = the Suspense boundary is showing the fallback. Unmount =
 * the children resolved + replaced this fallback. A long mount
 * means the children are stuck. The label tells the agent WHICH
 * Suspense is the culprit without trawling React DevTools.
 */
const THRESHOLD_MS = 5_000;

export function SuspenseProbe({ label }: { label: string }) {
  const start = useRef(performance.now());

  useEffect(() => {
    const t0 = start.current;
    const timer = setTimeout(() => {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      console.warn(
        `[SuspenseProbe] '${label}' suspended for ${elapsed}s — children appear stuck loading. ` +
          `Likely a useGLTF / useTexture / asset fetch that never resolved.`,
      );
    }, THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [label]);

  return null;
}
