/**
 * installDevHarness — the window.__game* E2E / visual-test hooks,
 * extracted from App.tsx's GameSession useMemo (M_V13.DECOMP.APP-
 * URLPARAMS).
 *
 * Exposes the live GameState + helper functions on `window` so
 * Playwright + vitest-browser specs can drive the sim
 * deterministically (advance frames, force outcome, select
 * entities, save/load round-trip, query player entities, reach the
 * trait constructors).
 *
 * NOT production-safe on its own — App.tsx imports + CALLS this, so it
 * is NOT tree-shaken away by mere non-reference. The CALL SITE
 * (GameSession effect) gates it behind `import.meta.env.DEV ||
 * VITE_E2E` (M_V13.SEC.HARNESS-GATE), so a prod build's dead-code
 * elimination drops the gated branch and tree-shakes this module out.
 * Never call installDevHarness unconditionally.
 *
 * Call once per fresh GameState, gated, from the GameSession effect.
 * No-op when `window` is undefined (SSR / node test env).
 */
import { AssignedJob, Building, FactionTrait, Health, Unit } from '@/ecs/components';
import { runEconomyTick } from '@/game/game-state';
import type { GameState } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

export function installDevHarness(g: GameState): void {
  if (typeof window === 'undefined') return;
  type DevWindow = Window & {
    __game?: GameState;
    __game_advanceFrames?: (n: number) => void;
    __game_findPlayerEntities?: (kind: 'peon' | 'military' | 'building') => number[];
  };
  // M_V13.HARNESS.ATOMIC-READY — clear the readiness flag FIRST so a
  // half-installed harness can never be observed as ready. Specs gate
  // on `window.__game_ready === true`, which is set LAST (below), after
  // every hook AND `__game` itself are in place. This closes the
  // suite-load race where `waitForFunction` checked a hook (e.g.
  // `__game_save`) on one document/render while the follow-up
  // `page.evaluate` read `__game` against a different one — install
  // runs in a committed effect now (App.tsx), but the atomic flag is
  // the contract the tests actually wait on.
  (window as unknown as DevWindow & { __game_ready?: boolean }).__game_ready = false;
  (window as unknown as DevWindow).__game = g;
  // Advance the sim N 60Hz frames synchronously — e2e specs use this
  // to reach a meaningful playing state before asserting.
  (window as unknown as DevWindow).__game_advanceFrames = (n: number) => {
    for (let i = 0; i < n; i++) runEconomyTick(g, 1 / 60);
  };
  // M_POLISH3.SCENE.4 — force a game-over outcome + dispatch the
  // outcome-changed event so GameOverModal reacts without waiting on
  // rAF (Chromium throttles it in headless / hidden tabs).
  type GameOutcomeT = 'win' | 'loss' | 'draw';
  (
    window as unknown as DevWindow & {
      __triggerGameOver?: (o: GameOutcomeT) => void;
    }
  ).__triggerGameOver = (outcome) => {
    g.outcome = outcome;
    window.dispatchEvent(new CustomEvent('aethelgard:outcome-changed', { detail: { outcome } }));
  };
  // M_V11.POLISH.BUILD-MENU-CTA — direct selectEntity hook so tests
  // can deterministically select an entity (the open-build-menu
  // CustomEvent mount race is hard to win in headless).
  (
    window as unknown as DevWindow & {
      __game_selectEntity?: (entityId: number) => void;
    }
  ).__game_selectEntity = (entityId) => {
    for (const e of g.world.query(FactionTrait)) {
      if (Number(e) === entityId) {
        selectEntity(g, e);
        return;
      }
    }
  };
  (window as unknown as DevWindow).__game_findPlayerEntities = (kind) => {
    const MILITARY_TYPES = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet']);
    const out: number[] = [];
    for (const e of g.world.query(FactionTrait)) {
      if (out.length >= 4) break;
      if (e.get(FactionTrait)?.faction !== 'player') continue;
      const unit = e.get(Unit);
      const building = e.get(Building);
      if (kind === 'peon' && unit?.unitType === 'Peon') out.push(Number(e));
      else if (kind === 'military' && unit && MILITARY_TYPES.has(unit.unitType))
        out.push(Number(e));
      else if (kind === 'building' && building) out.push(Number(e));
    }
    return out;
  };
  // M_FUN.QA.AIVAI — expose trait references so AI-vs-AI balance e2e
  // can query traits directly from page.evaluate (Playwright doesn't
  // bundle src/).
  (
    window as unknown as DevWindow & {
      __game_traits?: {
        Building: unknown;
        FactionTrait: unknown;
        Unit: unknown;
        AssignedJob: unknown;
        Health: unknown;
      };
    }
  ).__game_traits = { Building, FactionTrait, Unit, AssignedJob, Health };
  // M_V9.E2E.SAVE-LOAD-N-PLAYER — serialize/deserialize round-trip
  // helpers for e2e save-load tests.
  (
    window as unknown as DevWindow & {
      __game_save?: () => ReturnType<typeof serializeGame>;
      __game_load?: (snap: ReturnType<typeof serializeGame>) => void;
    }
  ).__game_save = () => serializeGame(g);
  (
    window as unknown as DevWindow & {
      __game_load?: (snap: ReturnType<typeof serializeGame>) => void;
    }
  ).__game_load = (snap) => {
    const restored = deserializeGame(snap);
    for (const key of Object.keys(g) as (keyof typeof g)[]) {
      delete g[key];
    }
    Object.assign(g, restored);
    (window as unknown as DevWindow).__game = g;
  };
  // M_V13.HARNESS.ATOMIC-READY — published LAST. Every hook above and
  // `__game` are now in place on THIS document; flipping the flag is
  // the single happens-after edge specs synchronize on. Reading any
  // hook or `__game` after observing `__game_ready === true` is
  // guaranteed self-consistent on the same document.
  (window as unknown as DevWindow & { __game_ready?: boolean }).__game_ready = true;
}
