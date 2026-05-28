/**
 * M_V13.HARNESS.ATOMIC-READY — regression guard for the suite-load race
 * where `save-load-n-player.spec.ts` failed ~50% under `pnpm test:e2e`
 * with `Error: __game not ready`, yet passed in isolation.
 *
 * Root cause: installDevHarness ran in GameSession's render-phase
 * useMemo (an impure side-effect). React can run a render and then
 * discard it (StrictMode double-mount; a <Scene> Suspense throwaway
 * under slow asset load). The discarded render still published the
 * window.__game* hooks. A spec's readiness `waitForFunction` could
 * resolve against a hook from a non-committed / stale document while
 * the follow-up `page.evaluate` read `__game` as falsy on a different
 * one — the gate and the value were never synchronized on one atomic
 * fact.
 *
 * The fix has two halves:
 *   1. App.tsx installs the harness in a COMMITTED useEffect (pinned by
 *      the e2e spec; an effect only runs for the render that commits).
 *   2. installDevHarness publishes a single atomic readiness flag
 *      `window.__game_ready`: cleared to `false` FIRST, set to `true`
 *      LAST — after `__game` and every hook are in place. Specs gate on
 *      this flag, so "ready" strictly happens-after every property write.
 *
 * This test pins half (2): the ordering invariant of the flag relative
 * to `__game` + the hooks. Without the flag (the pre-fix harness), a
 * gate on an individual hook could observe a half-installed window;
 * this asserts that can never happen.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installDevHarness } from '@/game/utilities';
import { startGame } from '@/game/game-state';

// The unit project runs in the `node` env (no DOM). installDevHarness
// only requires `window` to be defined + assignable, so a bare object
// stub is sufficient and keeps this a fast, deterministic node test
// (no jsdom dependency). serializeGame (reachable via __game_save) is
// only INVOKED by the e2e spec, never here — install merely assigns the
// closures, so no DOM API is touched.
const realWindow = (globalThis as { window?: unknown }).window;

type HarnessWindow = Record<string, unknown> & {
  __game_ready?: boolean;
  __game?: unknown;
  __game_advanceFrames?: unknown;
  __game_save?: unknown;
  __game_load?: unknown;
  __game_traits?: unknown;
  __game_findPlayerEntities?: unknown;
  __game_selectEntity?: unknown;
};

beforeEach(() => {
  // Fresh, assignable window stub per test (node env has no DOM).
  (globalThis as { window?: unknown }).window = {} as HarnessWindow;
});

afterEach(() => {
  if (realWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = realWindow;
  }
});

const w = () => (globalThis as unknown as { window: HarnessWindow }).window;

describe('M_V13.HARNESS.ATOMIC-READY — installDevHarness atomic readiness', () => {
  it('publishes __game_ready=true only AFTER __game + every hook are present', () => {
    const win = w();

    // Record the exact moment __game_ready flips to true, and snapshot
    // the rest of the harness AT that instant. The flag is a plain data
    // property; intercept its write to capture the surrounding state.
    let snapshotAtReady: Record<string, boolean> | null = null;
    let readyValueAtFlip: unknown = null;
    let backing: boolean | undefined;
    Object.defineProperty(win, '__game_ready', {
      configurable: true,
      get() {
        return backing;
      },
      set(v: boolean) {
        backing = v;
        if (v === true && snapshotAtReady === null) {
          readyValueAtFlip = v;
          snapshotAtReady = {
            __game: win.__game != null,
            __game_advanceFrames: typeof win.__game_advanceFrames === 'function',
            __game_save: typeof win.__game_save === 'function',
            __game_load: typeof win.__game_load === 'function',
            __game_traits: win.__game_traits != null,
            __game_findPlayerEntities: typeof win.__game_findPlayerEntities === 'function',
            __game_selectEntity: typeof win.__game_selectEntity === 'function',
          };
        }
      },
    });

    installDevHarness(startGame('atomic-ready-seed'));

    // The flag must have flipped to true exactly once.
    expect(readyValueAtFlip).toBe(true);
    // At the instant it flipped, EVERY hook + __game must already exist.
    expect(snapshotAtReady).not.toBeNull();
    const snapshot = snapshotAtReady as unknown as Record<string, boolean>;
    for (const [key, present] of Object.entries(snapshot)) {
      expect(present, `${key} must be installed before __game_ready=true`).toBe(true);
    }
  });

  it('clears __game_ready=false at the START so a stale true can never leak through a fresh install', () => {
    const win = w();
    // Simulate a prior document/install having left the flag true.
    win.__game_ready = true;

    const writes: boolean[] = [];
    let backing: boolean | undefined = true;
    Object.defineProperty(win, '__game_ready', {
      configurable: true,
      get() {
        return backing;
      },
      set(v: boolean) {
        backing = v;
        writes.push(v);
      },
    });

    installDevHarness(startGame('atomic-ready-seed-2'));

    // First write must be the defensive clear (false), last write the
    // publish (true). Anyone polling between the two sees false, never a
    // stale true paired with a half-built window.
    expect(writes[0]).toBe(false);
    expect(writes.at(-1)).toBe(true);
    expect(win.__game_ready).toBe(true);
  });
});
