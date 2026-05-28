import { useEffect, useRef, useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexKey, hexNeighbors } from '@/core/hex';
import { Building, FactionTrait, Selectable, Stack, StackMember, Unit } from '@/ecs/components';
import {
  findSelectableAtTile,
  moveUnit,
  placeBuilding,
  planMoveOrder,
  setRally,
} from '@/game/commands';
import { getCursorMode } from '@/game/cursor-mode';
import type { GameState } from '@/game/game-state';
import { selectEntity, selectedEntities } from '@/game/selection';
import { HUD_THEME } from '@/hud/theme';
import { cameraView } from '@/render/camera-view';
import { hexGridVisibility } from './HexGridOverlay';
import { PathLine } from './PathLine';
import { computePanDelta, isDragging, startDrag, stopDrag } from './touch-drag';
import { isTap } from './touch-tap-threshold';

/**
 * M_EXPANSION.U.109 — SVG sword cursor as an inline data: URL.
 * 24×24 px, hot-spot at centre (12,12), crimson fill matching the
 * combat danger colour from HUD_THEME. Encodes a crossed-sword glyph
 * for the attack affordance.
 */
const ATTACK_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><line x1="4" y1="4" x2="20" y2="20" stroke="${HUD_THEME.color.danger}" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="4" x2="4" y2="20" stroke="${HUD_THEME.color.danger}" stroke-width="2.5" stroke-linecap="round"/><line x1="4" y1="4" x2="8" y2="8" stroke="${HUD_THEME.color.danger}" stroke-width="1.5"/><line x1="20" y1="4" x2="16" y2="8" stroke="${HUD_THEME.color.danger}" stroke-width="1.5"/></svg>`;
const ATTACK_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(ATTACK_CURSOR_SVG)}") 12 12, crosshair`;

/** Long-press threshold (ms) — touch hold beyond this fires as right-click. */
const LONG_PRESS_MS = 500;

/**
 * Per-tile invisible pick collider. Routes mouse left/right OR touch tap/
 * long-press to the parent's left/right callbacks (M_GAMEPLAY.3).
 */
function TilePick({
  x,
  y,
  z,
  onLeft,
  onRight,
  onHover,
  onLeave,
}: {
  x: number;
  y: number;
  z: number;
  onLeft: () => void;
  onRight: () => void;
  /** M_EXPANSION.U.108 — fires on pointer-over; null on leave. */
  onHover?: () => void;
  /** M_EXPANSION.U.109 — fires on pointer-leave so the parent can clear hover state. */
  onLeave?: () => void;
}) {
  // M_POLISH2.MOBILE.6 — track pointerdown coords so we can suppress
  // tile-select when the pointer moved more than MOVE_THRESHOLD_PX
  // between down and up (treat as a camera-pan, not a tap).
  const longPressRef = useRef<{
    timer: number;
    fired: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  // M_POLISH2.MOBILE.9 — when the OS cancels a pointer (most often a
  // pinch-zoom or two-finger pan starting on the canvas while a
  // single-finger tap was being arrowed at this mesh), abort any
  // pending long-press AND wipe the longPressRef so the next pointerup
  // does NOT fire onLeft(). Without this, pinch-zoom released its second
  // finger on a tile-mesh and the released-pointer-up fired a phantom
  // select.
  useEffect(() => {
    const onCancel = () => {
      const state = longPressRef.current;
      if (!state) return;
      clearTimeout(state.timer);
      longPressRef.current = null;
      hexGridVisibility.show = false;
    };
    window.addEventListener('pointercancel', onCancel);
    return () => window.removeEventListener('pointercancel', onCancel);
  }, []);

  return (
    // <mesh> is an r3f three.js node, not a DOM element — the a11y
    // rule misfires on the JSX intrinsic. Suppress here so the broader
    // override (M_AUDIT2.SEC2.50) doesn't have to re-blanket the file.
    // biome-ignore lint/a11y/noStaticElementInteractions: r3f mesh, not DOM
    <mesh
      position={[x, y, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={pickGeometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        const ne = e.nativeEvent as PointerEvent;
        // mouse right-click → fire right immediately
        if (ne.pointerType !== 'touch' && ne.button === 2) {
          onRight();
          return;
        }
        // touch: arm a long-press timer; release before threshold = left.
        if (ne.pointerType === 'touch') {
          const state = {
            timer: 0,
            fired: false,
            startX: ne.clientX,
            startY: ne.clientY,
          };
          state.timer = window.setTimeout(() => {
            state.fired = true;
            hexGridVisibility.show = true;
            // M_EXPANSION.U.119 — long-press also starts drag-scroll mode.
            startDrag(ne.clientX, ne.clientY);
            onRight();
          }, LONG_PRESS_MS);
          longPressRef.current = state;
          return;
        }
        onLeft();
      }}
      onPointerUp={(e) => {
        const ne = e.nativeEvent as PointerEvent;
        if (ne.pointerType !== 'touch') return;
        // M_EXPANSION.U.119 — exit drag mode whenever the touch lifts.
        stopDrag();
        const state = longPressRef.current;
        if (!state) return;
        clearTimeout(state.timer);
        longPressRef.current = null;
        hexGridVisibility.show = false;
        // M_POLISH2.MOBILE.6 — drag-pan suppresses the tap. If the
        // pointer moved more than MOVE_THRESHOLD_PX between down and
        // up, the user was panning the camera; do NOT fire a select.
        if (state.fired) return;
        if (!isTap(state.startX, state.startY, ne.clientX, ne.clientY)) return;
        onLeft();
      }}
      onPointerLeave={() => {
        const state = longPressRef.current;
        if (state) {
          clearTimeout(state.timer);
          longPressRef.current = null;
          hexGridVisibility.show = false;
        }
        onLeave?.();
      }}
      onContextMenu={(e) => {
        e.nativeEvent.preventDefault();
      }}
    >
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// M_REGISTRY.17 — MILITARY unified into UNIT_PROFILES.combatRole.
import { MILITARY_ROLES as MILITARY } from '@/rules/unit-profiles';

const pickGeometry = new CylinderGeometry(HEX_RADIUS * 0.95, HEX_RADIUS * 0.95, 0.2, 6);

/**
 * Active build context passed from outside when the player has chosen a
 * building to place. `null` means no build in progress.
 */
export interface BuildContext {
  /** Building type selected to place. */
  type: Exclude<import('@/ecs/components').BuildingType, 'Palace'>;
  /** Callback to invoke after placement (clears the build context). */
  onPlaced: () => void;
}

// no-visual-impact: TileInteraction renders only invisible pick colliders — routing logic change has no visible output
/**
 * Invisible per-tile pick colliders. Click routing by context:
 *
 * 1. If a unit/building is on the clicked tile → select it.
 * 2. Else if `buildContext` is set → place the chosen building and clear the
 *    context via `onPlaced()`.
 * 3. Else if the selected entity is a Barracks → set the rally point.
 * 4. Else → issue a move order for the player pawn.
 */
export function TileInteraction({
  game,
  buildContext = null,
  spawnTrackingRing,
}: {
  game: GameState;
  buildContext?: BuildContext | null;
  /** Optional callback to drop a tracking ring at a tile — M_GAMEPLAY.5. */
  spawnTrackingRing?: (q: number, r: number) => void;
}) {
  const [pathKeys, setPathKeys] = useState<string[]>([]);
  // M_EXPANSION.U.108 — hovered tile (q,r) for the build-mode ghost.
  const [hoveredTile, setHoveredTile] = useState<{ q: number; r: number; level: number } | null>(
    null,
  );

  /*
   * M_EXPANSION.U.109 — sword cursor when hovering an enemy with a
   * military unit selected. Touch devices never fire onPointerOver with
   * a persistent hover (the pointer disappears on lift), so this is
   * desktop-only by the nature of pointer events. The effect has a
   * cleanup path that restores the default cursor so a route change or
   * component unmount never leaves the sword cursor stuck.
   */
  useEffect(() => {
    const hoveredKey = hoveredTile ? getHexKey(hoveredTile.q, hoveredTile.r) : null;
    const mode = getCursorMode(game, hoveredKey);
    if (mode === 'attack') {
      document.body.style.cursor = ATTACK_CURSOR;
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [game, hoveredTile]);

  /*
   * M_EXPANSION.U.119 — touch drag-scroll.
   *
   * A global pointermove handler (installed once on mount) checks whether drag
   * mode is active via the touch-drag module.  When active it converts the raw
   * pointer delta into a world-space {dx, dz} pair scaled by the current camera
   * distance, then dispatches 'aethelgard:pan-camera' so CameraRig applies it.
   * A global pointerup handler clears drag mode; the per-tile pointerup in
   * TilePick also calls stopDrag() for robustness.
   *
   * Desktop: pointerType is 'mouse'; isDragging() is always false because
   * startDrag() is only called from the touch branch of the long-press timer,
   * so the pointermove handler is a cheap no-op on desktop.
   */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!isDragging()) return;
      const { dx, dz } = computePanDelta(e.clientX, e.clientY, cameraView.distance);
      if (dx === 0 && dz === 0) return;
      window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      stopDrag();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stopDrag();
    };
  }, []);

  // M_AUDIT2.SEC2.26 — 100ms click cooldown. Auto-clickers can chain
  // build placements faster than the economy tick can validate (multiple
  // resource-spends before any tick runs). 100ms is invisible to humans.
  const lastClickMsRef = useRef<number>(0);
  const tiles = [...game.board.tiles.values()].filter((t) => t.walkable);

  /**
   * Right-click / context menu (M_GAMEPLAY.3): if the player has military
   * units selected, route them toward the target tile via `moveUnit`. Peons
   * are explicitly excluded — they remain autonomous (spec 101). Flocking-
   * style ring offsets distribute units around the target so they don't
   * stack on the same hex (offset by tile neighbours).
   */
  const onRightPick = (q: number, r: number): void => {
    const targetKey = getHexKey(q, r);
    const selected = selectedEntities(game);
    // M_V11.STACK.MOVE — when any selected entity is a Stack member,
    // collect the unique parent stacks and route THEM as a unit rather
    // than treating each member as an individual flocking around the
    // target. Stacks move as one (per docs/specs/201-stacking-and-
    // formations.md): every member shares the stack's tile, so the
    // PathRequest source is the stack's tile + we issue ONE moveUnit
    // call per stack (the move-system pinning logic in M_V11.STACK.RUNTIME
    // will ride along by reading StackMember.stackId).
    const stackIds = new Set<number>();
    for (const e of selected) {
      const m = e.get(StackMember);
      if (m) stackIds.add(m.stackId);
    }
    if (stackIds.size > 0) {
      // Route stacks first; their members are excluded from the
      // per-member flocking below.
      let anyStackRouted = false;
      for (const s of game.world.query(Stack)) {
        if (!stackIds.has(s.id())) continue;
        // The stack moves to the target tile, not a ring offset —
        // a stack OCCUPIES one tile. Route via any member as a
        // proxy (moveUnit on a member entity computes a path from
        // the member's HexPosition, which is the stack's tile).
        const stackData = s.get(Stack);
        if (!stackData) continue;
        const firstMemberId = stackData.members[0];
        if (firstMemberId === undefined) continue;
        for (const candidate of game.world.query(StackMember)) {
          if (candidate.id() !== firstMemberId) continue;
          moveUnit(game, candidate, targetKey, 'player');
          anyStackRouted = true;
          break;
        }
      }
      if (anyStackRouted) {
        setPathKeys([]);
        spawnTrackingRing?.(q, r);
      }
    }
    // Per-member flocking for selected units NOT in a stack.
    const military = selected.filter((e) => {
      const role = e.get(Unit)?.unitType;
      if (!role || !MILITARY.has(role)) return false;
      if (e.get(FactionTrait)?.faction !== 'player') return false;
      // Skip members of stacks already routed above.
      const m = e.get(StackMember);
      return m === undefined;
    });
    if (military.length === 0) {
      if (stackIds.size === 0) return;
      // Stacks already handled the path/ring.
      return;
    }
    // For each free military unit, target the nearest free neighbour of the target
    // tile (so the army flocks around it rather than stacking on it).
    const neighbours = [targetKey, ...hexNeighbors(q, r)];
    military.forEach((unit, i) => {
      const dest = neighbours[i % neighbours.length] ?? targetKey;
      moveUnit(game, unit, dest, 'player');
    });
    setPathKeys([]);
    // M_GAMEPLAY.5 — drop a tracking-ring at the destination as feedback.
    spawnTrackingRing?.(q, r);
  };

  const onPick = (q: number, r: number): void => {
    // performance.now() is allowed here — render-layer code, not sim.
    const now = performance.now();
    if (now - lastClickMsRef.current < 100) return;
    lastClickMsRef.current = now;
    const tileKey = getHexKey(q, r);

    // Priority 1: select a unit or building on the tile.
    const selectable = findSelectableAtTile(game, tileKey);
    if (selectable) {
      selectEntity(game, selectable);
      setPathKeys([]);
      return;
    }

    // Priority 2: place a building if build context is active.
    if (buildContext) {
      placeBuilding(game, tileKey, buildContext.type);
      buildContext.onPlaced();
      setPathKeys([]);
      return;
    }

    // Priority 3: set rally point when the Barracks is selected.
    if (game.selectedId !== undefined) {
      for (const entity of game.world.query(Selectable, Building)) {
        const sel = entity.get(Selectable);
        const bld = entity.get(Building);
        if (sel?.isSelected && bld?.buildingType === 'Barracks') {
          setRally(game, tileKey);
          setPathKeys([]);
          return;
        }
      }
    }

    // Priority 4: move order for the player pawn.
    const path = planMoveOrder(game, tileKey);
    if (path) setPathKeys(path);
  };

  return (
    <>
      <PathLine game={game} pathKeys={pathKeys} />
      {tiles.map((t) => {
        const { x, z } = axialToWorld(t.q, t.r);
        return (
          <TilePick
            key={`pick-${t.q},${t.r}`}
            x={x}
            y={t.level * TILE_HEIGHT + 0.1}
            z={z}
            onLeft={() => onPick(t.q, t.r)}
            onRight={() => onRightPick(t.q, t.r)}
            onHover={() => setHoveredTile({ q: t.q, r: t.r, level: t.level })}
            onLeave={() => setHoveredTile(null)}
          />
        );
      })}
      {/*
        M_EXPANSION.U.108 — build-mode ghost. Translucent disc at the
        hovered tile while a build context is active; lets the player
        see "would this fit here" before clicking.
      */}
      {buildContext && hoveredTile && <BuildGhost tile={hoveredTile} />}
    </>
  );
}

/**
 * M_EXPANSION.U.108 — translucent build-mode ghost. A cyan disc the
 * size of one hex, hovering 0.05 above tile level, with 40% opacity
 * so the underlying terrain colour still reads. Lets the player see
 * "would the next click place a building HERE?" without any mesh
 * load for the building type itself (a full-fidelity ghost would
 * need a useGLTF per building type — overkill for first pass).
 */
const ghostGeo = new CylinderGeometry(HEX_RADIUS * 0.9, HEX_RADIUS * 0.9, 0.08, 6, 1, false);
function BuildGhost({ tile }: { tile: { q: number; r: number; level: number } }) {
  const { x, z } = axialToWorld(tile.q, tile.r);
  return (
    <mesh
      position={[x, tile.level * TILE_HEIGHT + 0.15, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={ghostGeo}
    >
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
    </mesh>
  );
}
