/**
 * useGameWindowEvents — GameSession's window-CustomEvent wiring,
 * extracted from App.tsx (M_V13.DECOMP.APP-EVENTS).
 *
 * Bridges three window CustomEvents into the game/build flow:
 *   - `aethelgard:trigger-build` (keyboard F/H/G/R/T/W pickers) →
 *     opens a build-context for the dispatched building type.
 *   - `aethelgard:open-build-menu` (keyboard + mobile build chip) →
 *     selects the player Palace so the SelectionPanel renders its
 *     build-button list (single source of truth, no separate modal).
 *   - `aethelgard:focus-palace` (journey-capture + system menu) →
 *     forwards to `aethelgard:focus-tile` with the parsed Palace
 *     coords + a tight distance so CameraRig frames the Palace.
 *
 * Re-subscribes when `game` changes (the listeners close over the
 * live game). `setBuildContext` is stable (React setState).
 */
import { useEffect } from 'react';
import { Building, FactionTrait } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import type { BuildContext } from '@/world/terrain';

export function useGameWindowEvents(
  game: GameState,
  setBuildContext: (ctx: BuildContext | null) => void,
): void {
  useEffect(() => {
    // M_EXPANSION.U.118 — keyboard build-type pickers pipe into the
    // existing buildContext flow.
    const onTriggerBuild = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: BuildContext['type'] } | undefined;
      if (!detail?.type) return;
      setBuildContext({ type: detail.type, onPlaced: () => setBuildContext(null) });
    };
    // M_POLISH2.B.1 — open-build-menu selects the player's Palace
    // (showsBuildMenu=true) so the SelectionPanel renders the build
    // buttons — reuses the single source of truth.
    const onOpenBuildMenu = () => {
      for (const ent of game.world.query(Building, FactionTrait)) {
        const b = ent.get(Building);
        const f = ent.get(FactionTrait);
        if (b?.buildingType === 'Palace' && f?.faction === 'player') {
          selectEntity(game, ent);
          break;
        }
      }
    };
    // M_V11.POLISH.JOURNEY-CAMERA-EVENTS — focus-palace forwards to
    // focus-tile with the parsed Palace q/r + a tight distance.
    const onFocusPalace = () => {
      const key = game.palaceKey;
      if (!key) return;
      // CodeRabbit (PR #89): guard malformed keys; a non-numeric
      // segment would otherwise yank the camera to (0,0) silently.
      const parts = key.split(',');
      if (parts.length !== 2) return;
      const q = Number.parseInt(parts[0] ?? '', 10);
      const r = Number.parseInt(parts[1] ?? '', 10);
      if (!Number.isFinite(q) || !Number.isFinite(r)) return;
      window.dispatchEvent(
        new CustomEvent('aethelgard:focus-tile', {
          detail: { q, r, distance: 6 },
        }),
      );
    };
    window.addEventListener('aethelgard:trigger-build', onTriggerBuild);
    window.addEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
    window.addEventListener('aethelgard:focus-palace', onFocusPalace);
    return () => {
      window.removeEventListener('aethelgard:trigger-build', onTriggerBuild);
      window.removeEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
      window.removeEventListener('aethelgard:focus-palace', onFocusPalace);
    };
  }, [game, setBuildContext]);
}
