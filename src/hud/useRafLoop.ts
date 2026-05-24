import { useEffect } from 'react';

/**
 * Drives a callback on every animation frame until the component unmounts or
 * `deps` changes. The loop is self-scheduling — the callback does NOT need to
 * call requestAnimationFrame itself.
 *
 * M_EXPANSION.D.174 — deps is intentionally `readonly unknown[]` (not
 * `[GameState]`) because callers pass varying shapes: `[game]` is the
 * common case but a future watcher might key on `[game, persistence]`
 * or `[]` (mount-once). Narrowing here would force every caller to
 * cast back to unknown — the loose contract gives the flexibility
 * for one extra `unknown` per call site.
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

/**
 * M_EXPANSION.D.177/.178 — throttled RAF loop variant. Runs the
 * tick at most every `minIntervalMs` (e.g. 250 = 4Hz). For HUD
 * components watching slow-changing state (idle peons, weather)
 * a 4Hz poll is plenty + cuts per-frame React state churn 15×.
 */
export function useRafLoopThrottled(
  tick: () => void,
  minIntervalMs: number,
  deps: readonly unknown[],
): void {
  useEffect(() => {
    let raf = 0;
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const loop = () => {
      const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (t - last >= minIntervalMs) {
        last = t;
        tick();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps forwarded from caller
  }, deps);
}
