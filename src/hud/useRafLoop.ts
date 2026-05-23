import { useEffect } from 'react';

/**
 * Drives a callback on every animation frame until the component unmounts or
 * `deps` changes. The loop is self-scheduling — the callback does NOT need to
 * call requestAnimationFrame itself.
 *
 * Usage:
 *   useRafLoop(() => { setState(compute()); }, [dep]);
 */
export function useRafLoop(tick: () => void, deps: readonly unknown[]): void {
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps forwarded from caller
  }, deps);
}
